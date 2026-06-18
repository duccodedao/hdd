import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/appStore';

export async function syncGuestTelemetry() {
  try {
    const store = useAppStore.getState();

    // 1. Get WAN DETAILS (IP and fallback locations)
    let ip = store.sharedDeviceIp || 'Unknown';
    let lat = 10.7756;
    let lon = 106.7004;
    let address = store.sharedLocationName || 'Đang định vị...';

    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        ip = ipData.ip || ip;
        lat = ipData.latitude || 10.7756;
        lon = ipData.longitude || 106.7004;
        if (ipData.city && ipData.country_name) {
          address = `${ipData.city}, ${ipData.country_name}`;
        }
      }
    } catch {
      try {
        const ipRes2 = await fetch('https://ip-api.com/json/');
        if (ipRes2.ok) {
          const ipData2 = await ipRes2.json();
          ip = ipData2.query || ip;
          lat = ipData2.lat || 21.0285;
          lon = ipData2.lon || 105.8542;
          if (ipData2.city && ipData2.country) {
            address = `${ipData2.city}, ${ipData2.country}`;
          }
        }
      } catch (e2) {
        console.warn("Guest IP geolocation lookup failed", e2);
      }
    }

    // 2. Query browser-side precise GPS if browser geolocation is supported
    if (navigator.geolocation) {
      const getGps = () => new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 4000 });
      });
      const gpsPos = await getGps();
      if (gpsPos) {
        lat = gpsPos.coords.latitude;
        lon = gpsPos.coords.longitude;
      }
    }

    // 3. Reverse OSM lookup using the active coords (GPS or IP based)
    try {
      const gRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=sonlyhongduc@gmail.com`, 
        { headers: { 'Accept-Language': 'vi' } }
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData?.address) {
          const addr = gData.address;
          const parts = [];
          const ward = addr.quarter || addr.suburb || addr.village || addr.hamlet || addr.neighbourhood;
          const district = addr.city_district || addr.county || addr.district || addr.town;
          const city = addr.city || addr.state || addr.province;
          if (ward) parts.push(ward);
          if (district) parts.push(district);
          if (city) parts.push(city);
          address = parts.length > 0 ? parts.join(', ') : (gData.display_name || 'Việt Nam');
        } else if (gData?.display_name) {
          address = gData.display_name;
        }
      }
    } catch (e) {
      console.warn("Osm lookup failed in guest telemetry tracker", e);
    }

    // 4. Fetch Weather for active coords
    let weatherObj = { temp: 29, code: 0, description: 'Mát mẻ có mây' };
    try {
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData?.current_weather) {
          const temp = Math.round(wData.current_weather.temperature);
          const code = wData.current_weather.weathercode;
          const descriptions: { [key: number]: string } = {
            0: 'Trời quang', 1: 'Có mây', 2: 'Nhiều mây', 3: 'U ám', 45: 'Sương mù', 
            61: 'Có mưa', 63: 'Có mưa', 65: 'Mưa lớn', 71: 'Có tuyết', 95: 'Có bão'
          };
          weatherObj = {
            temp,
            code,
            description: descriptions[code] || 'Trời quang'
          };
        }
      }
    } catch (e) {
      console.warn("Weather lookup failed in guest telemetry tracker", e);
    }

    // 5. Test Network ping & speed latency
    let networkSpeedObj = { ping: 45, downlink: 45.5 };
    try {
      const startTime = Date.now();
      const pingRes = await fetch('https://ip-api.com/json', { method: 'HEAD', cache: 'no-store' });
      const duration = Date.now() - startTime;
      const pingVal = duration > 0 ? duration : 45;
      const downlinkMbps = Math.max(12.5, Math.min(250, (15000 / (pingVal + 4))));
      networkSpeedObj = {
        ping: pingVal,
        downlink: parseFloat(downlinkMbps.toFixed(1))
      };
    } catch (e) {
      console.warn("Ping lookup failed in guest telemetry", e);
    }

    // 6. Push to shared Zustand state
    store.setSharedDeviceIp(ip);
    store.setSharedLocationName(address);
    store.setSharedWeather(weatherObj);
    store.setSharedNetworkSpeed(networkSpeedObj);
    store.setSharedGps({ lat, lng: lon });

  } catch (error) {
    console.warn("Failed to update guest telemetry in Zustand", error);
  }
}

export async function syncTelemetryToFirestore(uid: string) {
  try {
    // 1. Get WAN DETAILS (IP and fallback locations)
    let ip = 'Unknown';
    let lat = 10.7756;
    let lon = 106.7004;
    let address = 'Đang định vị...';

    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        ip = ipData.ip || 'Unknown';
        lat = ipData.latitude || 10.7756;
        lon = ipData.longitude || 106.7004;
        if (ipData.city && ipData.country_name) {
          address = `${ipData.city}, ${ipData.country_name}`;
        }
      }
    } catch {
      try {
        const ipRes2 = await fetch('https://ip-api.com/json/');
        if (ipRes2.ok) {
          const ipData2 = await ipRes2.json();
          ip = ipData2.query || 'Unknown';
          lat = ipData2.lat || 21.0285;
          lon = ipData2.lon || 105.8542;
          if (ipData2.city && ipData2.country) {
            address = `${ipData2.city}, ${ipData2.country}`;
          }
        }
      } catch (e2) {
        console.warn("IP geolocation lookup failed", e2);
      }
    }

    // 2. Query browser-side precise GPS if browser geolocation is supported
    if (navigator.geolocation) {
      const getGps = () => new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 4000 });
      });
      const gpsPos = await getGps();
      if (gpsPos) {
        lat = gpsPos.coords.latitude;
        lon = gpsPos.coords.longitude;
      }
    }

    // 3. Reverse OSM lookup using the active coords (GPS or IP based)
    try {
      const gRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=sonlyhongduc@gmail.com`, 
        { headers: { 'Accept-Language': 'vi' } }
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData?.address) {
          const addr = gData.address;
          const parts = [];
          const ward = addr.quarter || addr.suburb || addr.village || addr.hamlet || addr.neighbourhood;
          const district = addr.city_district || addr.county || addr.district || addr.town;
          const city = addr.city || addr.state || addr.province;
          if (ward) parts.push(ward);
          if (district) parts.push(district);
          if (city) parts.push(city);
          address = parts.length > 0 ? parts.join(', ') : (gData.display_name || 'Việt Nam');
        } else if (gData?.display_name) {
          address = gData.display_name;
        }
      }
    } catch (e) {
      console.warn("Osm lookup failed in central telemetry tracker", e);
    }

    // 4. Fetch Weather for active coords
    let weatherObj = { temp: 29, code: 0, description: 'Mát mẻ có mây' };
    try {
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData?.current_weather) {
          const temp = Math.round(wData.current_weather.temperature);
          const code = wData.current_weather.weathercode;
          const descriptions: { [key: number]: string } = {
            0: 'Trời quang', 1: 'Có mây', 2: 'Nhiều mây', 3: 'U ám', 45: 'Sương mù', 
            61: 'Có mưa', 63: 'Có mưa', 65: 'Mưa lớn', 71: 'Có tuyết', 95: 'Có bão'
          };
          weatherObj = {
            temp,
            code,
            description: descriptions[code] || 'Trời quang'
          };
        }
      }
    } catch (e) {
      console.warn("Weather lookup failed in central telemetry tracker", e);
    }

    // 5. Test Network ping & speed latency
    let networkSpeedObj = { ping: 45, downlink: 45.5 };
    try {
      const startTime = Date.now();
      const pingRes = await fetch('https://ip-api.com/json', { method: 'HEAD', cache: 'no-store' });
      const duration = Date.now() - startTime;
      const pingVal = duration > 0 ? duration : 45;
      const downlinkMbps = Math.max(12.5, Math.min(250, (15000 / (pingVal + 4))));
      networkSpeedObj = {
        ping: pingVal,
        downlink: parseFloat(downlinkMbps.toFixed(1))
      };
    } catch (e) {
      console.warn("Ping lookup failed", e);
    }

    // 6. Push atomically to Firestore document 'users/{uid}'
    await setDoc(doc(db, 'users', uid), {
      ip,
      location: {
        lat,
        lng: lon,
        address,
        updatedAt: Date.now()
      },
      weather: weatherObj,
      networkSpeed: networkSpeedObj
    }, { merge: true });

  } catch (error) {
    console.warn("Failed to update general centralized telemetry in Firestore", error);
  }
}

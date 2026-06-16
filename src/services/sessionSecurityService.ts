import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface AdminSession {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  device: string;
  ip: string;
  location: string;
  createdAt: number;
  lastActiveAt: number;
  active: boolean;
  approved?: boolean;
}

export function parseUserAgent(ua: string): string {
  let os = "OS khác";
  let browser = "Trình duyệt khác";
  
  if (ua.indexOf("Win") !== -1) os = "Windows PC";
  else if (ua.indexOf("Mac") !== -1) {
    if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1 || ua.indexOf("iPod") !== -1) {
      os = "iOS DEVICE";
    } else {
      os = "macOS Computer";
    }
  }
  else if (ua.indexOf("Android") !== -1) os = "Android DEVICE";
  else if (ua.indexOf("Linux") !== -1) os = "Linux Machine";
  else if (ua.indexOf("X11") !== -1) os = "Unix Machine";
  
  if (/OPR\/|Opera\//.test(ua)) browser = "Opera";
  else if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/MSIE|Trident\//.test(ua)) browser = "Internet Explorer";
  
  return `${os} (${browser})`;
}

async function getBrowserLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
      resolve('');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&email=sonlyhongduc@gmail.com`, {
            headers: { 'Accept-Language': 'vi' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.address) {
              const addr = data.address;
              const parts = [];
              const ward = addr.quarter || addr.suburb || addr.village || addr.hamlet || addr.neighbourhood;
              const district = addr.city_district || addr.county || addr.district || addr.town;
              const city = addr.city || addr.state || addr.province;
              if (ward) parts.push(ward);
              if (district) parts.push(district);
              if (city) parts.push(city);
              const name = parts.length > 0 ? parts.join(', ') : (data.display_name || '');
              if (name) {
                resolve(name);
                return;
              }
            }
          }
        } catch {}
        resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      () => {
        resolve('');
      },
      { timeout: 4000 }
    );
  });
}

export async function fetchIpAndLocation(): Promise<{ ip: string; location: string }> {
  // Query browser-side precise GPS device metrics first
  let geoLoc = '';
  try {
    geoLoc = await getBrowserLocation();
  } catch (err) {
    console.warn("Precision GPS resolver skipped", err);
  }

  // Try ip-api.com first (highly reliable JSON endpoint with no CORS restrictions)
  try {
    const res = await fetch('https://ip-api.com/json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const ip = data.query || 'Unknown';
        if (geoLoc) {
          return { ip, location: geoLoc };
        }
        const city = data.city || '';
        const region = data.regionName || '';
        const country = data.country || '';
        const location = [city, region, country].filter(Boolean).join(', ') || 'Việt Nam';
        return { ip, location };
      }
    }
  } catch (e) {
    console.warn("ip-api.com lookup failed, trying next option", e);
  }

  // Try ipapi.co as secondary
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      const ip = data.ip || 'Unknown';
      if (geoLoc) {
        return { ip, location: geoLoc };
      }
      const city = data.city || '';
      const region = data.region || '';
      const country = data.country_name || '';
      const location = [city, region, country].filter(Boolean).join(', ') || 'Việt Nam';
      return { ip, location };
    }
  } catch (e) {
    console.warn("ipapi.co lookup failed, trying next option", e);
  }

  // Try api.ipify.org as tertiary
  try {
    const res2 = await fetch('https://api.ipify.org?format=json');
    if (res2.ok) {
      const data2 = await res2.json();
      const ip = data2.ip || 'Local Dev';
      if (geoLoc) {
        return { ip, location: geoLoc };
      }
      try {
        const searchRes = await fetch(`https://ip-api.com/json/${ip}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData && searchData.status === 'success') {
            const city = searchData.city || '';
            const region = searchData.regionName || '';
            const country = searchData.country || '';
            const location = [city, region, country].filter(Boolean).join(', ') || 'Việt Nam';
            return { ip, location };
          }
        }
      } catch {}
      return { ip, location: 'Việt Nam' };
    }
  } catch (e2) {
    console.warn("api.ipify.org lookup failed", e2);
  }

  // Pure Local Sandbox Fallback
  return { 
    ip: '127.0.0.1 (Local Dev)', 
    location: geoLoc || 'Việt Nam' 
  };
}

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('active_admin_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('active_admin_session_id', sessionId);
  }
  return sessionId;
}

export async function registerAdminSession(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  role: string
): Promise<AdminSession> {
  const sessionId = getOrCreateSessionId();
  const { ip, location } = await fetchIpAndLocation();
  const device = parseUserAgent(navigator.userAgent);
  
  const sessionData: AdminSession = {
    id: sessionId,
    uid,
    email,
    displayName,
    photoURL,
    role,
    device,
    ip,
    location,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    active: true
  };

  await setDoc(doc(db, 'admin_sessions', sessionId), sessionData);
  return sessionData;
}

export async function checkOtherActiveSessions(
  email: string,
  currentSessionId: string,
  currentIp: string,
  currentDevice: string
): Promise<AdminSession[]> {
  try {
    const q = query(
      collection(db, 'admin_sessions'),
      where('email', '==', email),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    const sessions: AdminSession[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as AdminSession;
      if (data.id !== currentSessionId) {
        sessions.push(data);
      }
    });

    // Filter to find conflicts: different IP OR different Device OR different Location, and NOT approved
    return sessions.filter(s => (s.ip !== currentIp || s.device !== currentDevice) && !s.approved);
  } catch (error) {
    console.error("Error checking other user sessions:", error);
    return [];
  }
}

export async function approveSession(sessionId: string) {
  try {
    await updateDoc(doc(db, 'admin_sessions', sessionId), {
      approved: true
    });
  } catch (error) {
    console.error("Error declaring session as approved:", error);
    throw error;
  }
}

export async function logoutSessionAndBlockIp(
  sessionId: string,
  ipToBlock?: string,
  blockReason?: string,
  blockedBy?: string
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'admin_sessions', sessionId), {
      active: false,
      lastActiveAt: Date.now()
    });
    
    if (ipToBlock) {
      const blockedRef = doc(collection(db, 'blockedIps'));
      batch.set(blockedRef, {
        ip: ipToBlock,
        reason: blockReason || 'Chặn từ bảo mật quản lý thiết bị/IP',
        blockedAt: new Date(),
        blockedBy: blockedBy || 'Hệ thống Bảo mật'
      });
    }
    await batch.commit();
  } catch (error) {
    console.error("Error logging out session and banning IP:", error);
    throw error;
  }
}

export async function logoutSession(sessionId: string) {
  try {
    await updateDoc(doc(db, 'admin_sessions', sessionId), {
      active: false,
      lastActiveAt: Date.now()
    });
  } catch (error) {
    console.error("Error revoking session:", error);
  }
}

export async function logoutAllOtherSessions(email: string, currentSessionId: string) {
  try {
    const q = query(
      collection(db, 'admin_sessions'),
      where('email', '==', email),
      where('active', '==', true)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as AdminSession;
      if (data.id !== currentSessionId) {
        batch.update(doc(db, 'admin_sessions', data.id), {
          active: false,
          lastActiveAt: Date.now()
        });
      }
    });
    await batch.commit();
  } catch (error) {
    console.error("Error bulk revoking other sessions:", error);
  }
}

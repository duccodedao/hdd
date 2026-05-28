import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ShieldAlert, Settings, RefreshCw, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../lib/firebase';

interface LocationGuardProps {
  children: React.ReactNode;
}

export default function LocationGuard({ children }: LocationGuardProps) {
  const { user, userData } = useAuthStore();
  const [permission, setPermission] = useState<PermissionState | 'loading'>('loading');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkLocation = (silent = false) => {
    if (!("geolocation" in navigator)) {
      setPermission('denied');
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    if (!silent) setPermission('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setPermission('granted');
      },
      (err) => {
        setPermission('denied');
        if (err.code === 1) {
          setError("Bạn phải bật vị trí để truy cập hệ thống.");
        } else {
          setError("Không thể xác định vị trí của bạn.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    checkLocation();
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
    if (user && userData && location) {
      // Prevent Infinite Loot/loop: Only update Firestore if coordinates are missing or have changed significantly.
      // A threshold of 0.0001 degrees (~11 meters) helps avoid continuous writes driven by tiny GPS drift noise.
      const recordedLat = userData.location?.lat;
      const recordedLng = userData.location?.lng;
      const hasLocationChanged = !recordedLat || !recordedLng || 
                                 Math.abs(recordedLat - location.lat) > 0.0001 || 
                                 Math.abs(recordedLng - location.lng) > 0.0001;

      if (!hasLocationChanged) {
        return;
      }

      const updateLocation = async () => {
        try {
          let address = '';
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1&email=sonlyhongduc@gmail.com`, {
              headers: { 'Accept-Language': 'vi' }
            });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (mounted) {
                if (geoData?.address) {
                  const addr = geoData.address;
                  const parts = [];
                  const ward = addr.quarter || addr.suburb || addr.village || addr.hamlet || addr.neighbourhood;
                  const district = addr.city_district || addr.county || addr.district || addr.town;
                  const city = addr.city || addr.state || addr.province;
                  if (ward) parts.push(ward);
                  if (district) parts.push(district);
                  if (city) parts.push(city);
                  address = parts.length > 0 ? parts.join(', ') : (geoData.display_name || '');
                } else {
                  address = geoData.display_name;
                }
              }
            }
          } catch (e) {
            console.warn("Geocoding unvailable");
          }
          if (!mounted) return;
          try {
            await setDoc(doc(db, 'users', user.uid), {
              location: {
                lat: location.lat,
                lng: location.lng,
                address: address,
                updatedAt: serverTimestamp()
              }
            }, { merge: true });
          } catch (dbErr) {
            if (mounted) {
              console.error("Location update DB error:", dbErr);
            }
          }
        } catch (err) {
          console.error("Failed to update location in DB:", err);
        }
      };
      updateLocation();
    }
    return () => { mounted = false; };
  }, [user, userData, location]);

  if (permission === 'granted') return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full bg-white border border-slate-100 rounded-[2rem] p-8 text-center space-y-6 shadow-2xl shadow-indigo-100"
      >
        <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto"
        >
          <MapPin className="w-8 h-8 text-indigo-600" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Xác thực vị trí
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {error || "Cần quyền truy cập vị trí để đồng bộ an toàn với máy chủ."}
          </p>
        </div>

        <button 
          onClick={() => checkLocation()}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[13px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
        >
          {permission === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cấp quyền vị trí"}
        </button>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

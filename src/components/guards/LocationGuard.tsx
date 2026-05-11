import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ShieldAlert, Settings, RefreshCw, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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
      const updateLocation = async () => {
        try {
          let address = '';
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=10&addressdetails=1&email=sonlyhongduc@gmail.com`, {
              headers: { 'Accept-Language': 'vi' }
            });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (mounted) address = geoData.display_name;
            }
          } catch (e) {
            console.warn("Geocoding unvailable");
          }
          if (!mounted) return;
          await setDoc(doc(db, 'users', user.uid), {
            location: {
              lat: location.lat,
              lng: location.lng,
              address: address,
              updatedAt: serverTimestamp()
            }
          }, { merge: true });
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
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex shadow-2xl items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_70%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[400px] w-full bg-zinc-900 border border-white/5 rounded-[2rem] p-8 md:p-10 text-center space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        
        <div className="relative inline-block mt-4">
          <div className="w-20 h-20 bg-zinc-950 border border-white/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 shadow-inner">
            <MapPin className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-800 border border-white/5 rounded-full flex items-center justify-center shadow-lg"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </motion.div>
        </div>

        <div className="space-y-3 relative z-10">
          <h2 className="text-2xl font-display font-medium text-white tracking-tight uppercase">
            Xác thực vị trí
          </h2>
          <p className="text-sm font-medium text-zinc-400 leading-relaxed">
            {error || "Yêu cầu cấp quyền truy cập vị trí cục bộ để tiếp tục đồng bộ an toàn với máy chủ."}
          </p>
        </div>

        <div className="p-5 bg-zinc-950/50 rounded-2xl border border-white/5 text-left space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">System Logs</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-red-500/50 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status / GPS</span>
               <span className={cn("text-[10px] font-bold uppercase tracking-widest", permission === 'denied' ? "text-red-400" : "text-amber-400")}>
                 {permission === 'denied' ? 'DENIED' : 'LOCATING...'}
               </span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Co-ords</span>
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">NULL</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 relative z-10">
          <button 
            onClick={() => checkLocation()}
            className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold tracking-[0.2em] text-[11px] uppercase transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)] active:scale-95"
          >
            {permission === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Truy vấn lại"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

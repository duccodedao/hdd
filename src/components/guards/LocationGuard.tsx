import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ShieldAlert, Settings, RefreshCw, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface LocationGuardProps {
  children: React.ReactNode;
}

export default function LocationGuard({ children }: LocationGuardProps) {
  const { user, userData } = useAuthStore();
  const [permission, setPermission] = useState<PermissionState | 'loading'>('loading');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkLocation = () => {
    if (!("geolocation" in navigator)) {
      setPermission('denied');
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setPermission('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setPermission('granted');
        
        // Update user location in Firestore if logged in
        if (user) {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              location: {
                lat: latitude,
                lng: longitude,
                updatedAt: serverTimestamp()
              }
            });
          } catch (err) {
            console.error("Failed to update location in DB:", err);
          }
        }
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

    // Re-check on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLocation();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.uid]);

  if (permission === 'granted') return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-[#0a0a0b] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-card p-10 rounded-[2.5rem] text-center space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center shadow-lg"
          >
            <MapPin className="w-4 h-4 text-red-500" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-display font-medium italic tracking-tight text-gradient">
            Yêu cầu Vị trí
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Để bảo vệ hệ thống và xác thực định danh, {error || "bạn cần cấp quyền truy cập vị trí chính xác để tiếp tục."}
          </p>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 text-left space-y-3">
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái xác thực</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quyền GPS</p>
              <p className={cn("text-xs font-bold italic", permission === 'denied' ? "text-red-500" : "text-amber-500")}>
                {permission === 'denied' ? 'Bị từ chối' : 'Đang kiểm tra...'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tọa độ</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">Không xác định</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={checkLocation}
            className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            {permission === 'loading' ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Thử lại ngay"}
          </button>
          
          <div className="space-y-4 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hướng dẫn bật vị trí:</p>
            <div className="flex justify-center gap-6">
              <div className="text-center group cursor-help">
                <div className="w-10 h-10 rounded-xl glass border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-2 group-hover:border-blue-500/50 transition-colors">
                  <span className="text-xs font-bold">iOS</span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Settings → Privacy</p>
              </div>
              <div className="text-center group cursor-help">
                <div className="w-10 h-10 rounded-xl glass border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-2 group-hover:border-blue-500/50 transition-colors">
                  <span className="text-xs font-bold">Android</span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Settings → Location</p>
              </div>
              <div className="text-center group cursor-help">
                <div className="w-10 h-10 rounded-xl glass border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-2 group-hover:border-blue-500/50 transition-colors">
                  <span className="text-xs font-bold">PC</span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Icon ổ khóa → Location</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

import { Menu, Sun, CloudRain, Cloud, CloudLightning, Snowflake, Moon, Bell, MapPin, Search } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function Topbar() {
  const { toggleSidebar, darkMode, toggleDarkMode } = useAppStore();
  const { user, userData } = useAuthStore();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number; description: string } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        if (!doc.data().readBy?.includes(user.uid)) count++;
      });
      setUnreadCount(count);
      setInitialLoad(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const getWeatherDescription = (code: number) => {
      const descriptions: { [key: number]: string } = {
        0: 'Trời quang', 1: 'Có mây', 2: 'Nhiều mây', 3: 'U ám', 45: 'Sương mù', 
        61: 'Có mưa', 63: 'Có mưa', 65: 'Mưa lớn', 71: 'Có tuyết', 95: 'Có bão'
      };
      return descriptions[code] || 'Trời quang';
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const [wRes, gRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`),
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'vi' } })
          ]);
          const wData = await wRes.json();
          const gData = await gRes.json();
          if (wData?.current_weather) {
            setWeather({
              temp: Math.round(wData.current_weather.temperature),
              code: wData.current_weather.weathercode,
              description: getWeatherDescription(wData.current_weather.weathercode)
            });
          }
          if (gData?.address) {
            setLocationName(gData.address.city || gData.address.town || gData.address.state || 'Trái đất');
          }
        } catch {}
      }, () => setLocationName('Việt Nam'));
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    if (code >= 2 && code <= 4) return <Cloud className="w-3.5 h-3.5 text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-3.5 h-3.5 text-blue-500" />;
    return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <header className="h-20 flex-shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-md z-30 flex items-center justify-between px-6 lg:px-12 border-b border-slate-100 dark:border-white/[0.05]">
      <div className="flex items-center gap-8">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-none mb-1 tabular-nums">
              {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              {time.toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
               <div className="flex items-center gap-1.5 mb-1">
                 <MapPin className="w-3 h-3 text-red-500" />
                 <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                   {locationName || 'Đang định vị...'}
                 </span>
               </div>
               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">VỊ TRÍ</span>
            </div>

            {weather && (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5">
                {getWeatherIcon(weather.code)}
                <span className="text-[10px] font-bold text-slate-900 dark:text-white tabular-nums">{weather.temp}°C</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm thông minh..." 
            className="w-48 lg:w-64 pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl text-slate-500 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="p-2.5 rounded-xl text-slate-500 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all relative"
          >
            <Bell className="w-4.5 h-4.5" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0a0a0b]" 
                />
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-slate-100 dark:ring-white/[0.05] group-hover:ring-blue-500/50 transition-all duration-500">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-500 italic">
                {userData?.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none italic">{userData?.displayName || 'Khách'}</p>
            <p className="text-[9px] font-bold text-blue-500 mt-1 uppercase tracking-widest">{userData?.role || 'THÀNH VIÊN'}</p>
          </div>
        </button>
      </div>
    </header>
  );
}

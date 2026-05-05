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
    if (code === 0 || code === 1) return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    if (code >= 2 && code <= 4) return <Cloud className="w-3.5 h-3.5 text-white/50" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
    return <Sun className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <header className="h-16 flex-shrink-0 z-30 flex items-center justify-between px-6 lg:px-12 border-b border-white/5 bg-[#0c0c12]">
      <div className="flex items-center gap-8">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-white transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white tabular-nums tracking-wide">
              {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">
              {time.toLocaleDateString('vi-VN', { weekday: 'short' })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
             <MapPin className="w-3.5 h-3.5" />
             <span className="text-xs font-medium truncate max-w-[150px]">
               {locationName || 'Đang định vị...'}
             </span>
             {weather && (
               <div className="flex items-center gap-2 pl-4 border-l border-white/5">
                 {getWeatherIcon(weather.code)}
                 <span className="text-xs font-medium tabular-nums">{weather.temp}°C</span>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input 
            type="text" 
            placeholder="Command..." 
            className="w-48 lg:w-64 h-9 pl-10 pr-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium outline-none focus:border-indigo-500 transition-all text-white placeholder:text-slate-600"
          />
        </div>

        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-500 hover:text-white transition-all"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <div className="h-4 w-px bg-white/5 hidden sm:block" />

        <button 
          onClick={toggleDarkMode}
          className="p-2 text-slate-500 hover:text-white transition-all outline-none"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        <div className="h-4 w-px bg-white/5 hidden sm:block" />

        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3"
        >
          <div className="text-right hidden lg:block">
            <p className="text-xs font-medium text-white leading-none">{userData?.displayName || 'Guest'}</p>
            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{userData?.role || 'MEMBER'}</p>
          </div>
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}

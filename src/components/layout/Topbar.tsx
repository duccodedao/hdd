import { Menu, Sun, CloudRain, Cloud, CloudLightning, Snowflake, Moon, Bell, MapPin, Search, User, LogOut, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { signOut } from 'firebase/auth';

export default function Topbar() {
  const { toggleSidebar, darkMode, toggleDarkMode } = useAppStore();
  const { user, userData } = useAuthStore();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number; description: string } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth);
    setShowProfileMenu(false);
    navigate('/login');
  };

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
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&email=sonlyhongduc@gmail.com`, { headers: { 'Accept-Language': 'vi' } })
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
    <header className="h-16 flex-shrink-0 z-30 flex items-center justify-between px-6 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-white/5 shadow-sm active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-6 pl-4 border-l border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-100 tabular-nums">
              {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              {time.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
             <div className="flex items-center gap-2 group cursor-help">
               <MapPin className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
               <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                 {locationName || 'Đang định vị...'}
               </span>
             </div>
             {weather && (
               <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                 {getWeatherIcon(weather.code)}
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tabular-nums text-zinc-200">{weather.temp}°C</span>
                    <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-tight">{weather.description}</span>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="relative hidden xl:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search commands..." 
            className="w-64 h-9 pl-10 pr-4 bg-zinc-900/50 border border-white/5 rounded-lg text-[11px] font-medium outline-none focus:border-white/20 focus:bg-zinc-900 transition-all text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            className="relative w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            )}
          </Link>
        </div>

        <div className="h-4 w-px bg-white/5 hidden sm:block" />

        {user ? (
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 h-10 pl-1 pr-2 bg-zinc-900/50 border border-white/5 rounded-lg hover:bg-zinc-900 hover:border-white/10 transition-all"
            >
              <div className="w-7 h-7 rounded-md overflow-hidden bg-zinc-800 border border-white/10 shadow-sm shrink-0">
                {userData?.photoURL ? (
                  <img src={userData.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                    {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="text-left hidden lg:block pr-1">
                <p className="text-[11px] font-semibold text-zinc-200 leading-tight truncate max-w-[100px]">{userData?.displayName || 'Guest User'}</p>
              </div>
              <ChevronDown className={cn("w-3 h-3 text-zinc-500 transition-transform duration-300", showProfileMenu && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-white/5">
                      <p className="text-[11px] font-semibold text-zinc-100 truncate">{userData?.displayName || 'Guest'}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{userData?.role || 'Member'}</p>
                    </div>
                    
                    <div className="p-1.5">
                      <button 
                        onClick={() => {
                          navigate('/profile');
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-all text-[11px] font-medium"
                      >
                        <User className="w-3.5 h-3.5" />
                        Trải nghiệm cá nhân
                      </button>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all text-[11px] font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Rời khỏi phiên làm việc
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link 
            to="/login"
            className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-md text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Access Now
          </Link>
        )}
      </div>
    </header>
  );
}

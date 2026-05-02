import { Menu, Sun, CloudRain, Cloud, CloudLightning, Snowflake, Moon, Bell } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { toggleSidebar, darkMode, toggleDarkMode } = useAppStore();
  const { user, userData } = useAuthStore();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
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
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !initialLoad) {
          const data = change.doc.data();
          const prefs = userData?.notificationPreferences || { system: true, security: true, files: true };
          let shouldNotify = false;
          
          if (data.type === 'security' && prefs.security) shouldNotify = true;
          else if (data.type === 'file' && prefs.files) shouldNotify = true;
          else if (prefs.system) shouldNotify = true; 
          
          if (shouldNotify && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(data.title, { body: data.content, icon: 'https://tytpht.hdd.io.vn/img/bmassloadings.png' });
          }
        }
      });

      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.readBy?.includes(user.uid)) {
          count++;
        }
      });
      setUnreadCount(count);
      setInitialLoad(false);
    });
    return () => unsubscribe();
  }, [user, initialLoad, userData]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&current_weather=true`);
            const data = await res.json();
            if (data?.current_weather) {
              setWeather({
                temp: Math.round(data.current_weather.temperature),
                code: data.current_weather.weathercode
              });
            }
          } catch (e) {
            console.error("Không thể lấy dữ liệu thời tiết:", e);
          }
        },
        (error) => {
          console.error("Lỗi vị trí:", error);
        }
      );
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    switch (true) {
      case code === 0 || code === 1: return <Sun className="w-5 h-5 text-amber-500" />;
      case code >= 2 && code <= 4: return <Cloud className="w-5 h-5 text-slate-400" />;
      case code >= 51 && code <= 67: return <CloudRain className="w-5 h-5 text-blue-400" />;
      case code >= 71 && code <= 77: return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case code >= 95 && code <= 99: return <CloudLightning className="w-5 h-5 text-purple-500" />;
      default: return <Sun className="w-5 h-5 text-amber-500" />;
    }
  };

  const formatDate = (d: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <header className="h-20 flex-shrink-0 border-b border-slate-200 dark:border-white/5 backdrop-blur-md bg-white/50 dark:bg-transparent z-30 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/10 min-w-64">
           {weather ? (
             <div className="flex items-center gap-2 pr-4 border-r border-slate-300 dark:border-white/10">
               {getWeatherIcon(weather.code)}
               <span className="font-bold text-slate-700 dark:text-slate-200">{weather.temp}°C</span>
             </div>
           ) : (
              <div className="flex items-center gap-2 pr-4 border-r border-slate-300 dark:border-white/10">
               <Sun className="w-5 h-5 text-slate-400 animate-pulse" />
               <span className="text-sm text-slate-500">NaN°C</span>
             </div>
           )}
           <div className="flex flex-col">
             <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 leading-none mb-1">
               {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
             </span>
             <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider leading-none">
               {formatDate(time)}
             </span>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105"
          title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105 relative mr-2"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
              {userData?.displayName || 'Người dùng'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {userData?.role === 'admin' || userData?.role === 'superadmin' ? 'Quản trị viên' : 'Thành viên'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10 border-2 border-slate-200 dark:border-white/20 flex-shrink-0 flex items-center justify-center">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

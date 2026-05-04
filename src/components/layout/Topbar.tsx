import { Menu, Sun, CloudRain, Cloud, CloudLightning, Snowflake, Moon, Bell, MapPin } from 'lucide-react';
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
    const getWeatherDescription = (code: number) => {
      const descriptions: { [key: number]: string } = {
        0: 'Trời quang', 1: 'Ít mây', 2: 'Mây rải rác', 3: 'Nhiều mây', 45: 'Sương mù', 
        48: 'Sương muối', 51: 'Mưa phùn nhẹ', 53: 'Mưa phùn', 55: 'Mưa phùn nặng',
        61: 'Mưa nhẹ', 63: 'Mưa vừa', 65: 'Mưa to', 71: 'Tuyết nhẹ', 73: 'Tuyết vừa', 
        75: 'Tuyết mạnh', 80: 'Mưa rào nhẹ', 81: 'Mưa rào vừa', 82: 'Mưa rào mạnh',
        95: 'Dông', 96: 'Dông kèm theo mưa đá nhẹ', 99: 'Dông kèm theo mưa đá mạnh'
      };
      return descriptions[code] || 'Không rõ';
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Fetch Weather
            const weatherPromise = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            
            // Fetch Location Name (Reverse Geocoding)
            const geoPromise = fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, {
              headers: { 'Accept-Language': 'vi' }
            });

            const [weatherRes, geoRes] = await Promise.all([weatherPromise, geoPromise]);
            const weatherData = await weatherRes.json();
            const geoData = await geoRes.json();

            if (weatherData?.current_weather) {
              setWeather({
                temp: Math.round(weatherData.current_weather.temperature),
                code: weatherData.current_weather.weathercode,
                description: getWeatherDescription(weatherData.current_weather.weathercode)
              });
            }

            if (geoData?.address) {
              const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || geoData.address.county || '';
              const state = geoData.address.state || geoData.address.city || '';
              setLocationName(city && state && city !== state ? `${city}, ${state}` : city || state || 'Vị trí không xác định');
            }
          } catch (e) {
            console.error("Lỗi dữ liệu:", e);
          }
        },
        (error) => {
          console.error("Lỗi vị trí:", error);
          // Fallback if permission denied or error
          setLocationName('Việt Nam');
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
    <header className="h-20 flex-shrink-0 border-b border-slate-100 dark:border-white/5 backdrop-blur-xl bg-white/60 dark:bg-black/20 z-30 flex items-center justify-between px-6 lg:px-10">
      <div className="flex items-center gap-6">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-5 px-6 py-2.5 bg-white shadow-sm dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 min-w-[400px]">
           {weather ? (
             <div className="flex items-center gap-3 pr-5 border-r border-slate-100 dark:border-white/10">
               <div className="flex flex-col items-center">
                  {getWeatherIcon(weather.code)}
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{weather.description}</span>
               </div>
               <span className="font-medium text-slate-900 dark:text-slate-100 italic text-lg">{weather.temp}°C</span>
             </div>
           ) : (
              <div className="flex items-center gap-3 pr-5 border-r border-slate-100 dark:border-white/10">
               <Sun className="w-5 h-5 text-slate-300 animate-pulse" />
               <span className="text-xs font-medium text-slate-400">Loading...</span>
             </div>
           )}

           <div className="flex items-center gap-4 flex-1">
             <div className="flex flex-col border-r border-slate-100 dark:border-white/10 pr-4">
               <span className="text-sm font-medium tracking-tight text-slate-900 dark:text-slate-100 leading-none mb-1 shadow-white">
                 {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </span>
               <span className="text-[9px]  font-medium text-slate-400 tracking-[0.1em] leading-none">
                 {formatDate(time)}
               </span>
             </div>

             <div className="flex flex-col">
               <div className="flex items-center gap-1.5 mb-1 group">
                 <MapPin className="w-3 h-3 text-red-500 group-hover:animate-bounce" />
                 <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                   {locationName || 'Đang lấy vị trí...'}
                 </span>
               </div>
               <span className="text-[8px] font-medium text-slate-400 tracking-widest uppercase">VỊ TRÍ HIỆN TẠI</span>
             </div>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleDarkMode}
            className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm active:scale-90"
            title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm active:scale-90 relative"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-medium text-white shadow-xl shadow-red-500/40 ring-2 ring-white dark:ring-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
        
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 cursor-pointer group p-1.5 pr-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-100 dark:bg-blue-500/10 border-2 border-white dark:border-white/10 shadow-sm flex-shrink-0 flex items-center justify-center ring-1 ring-slate-100 dark:ring-white/5">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 font-medium italic text-lg">
                {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-900 dark:text-white leading-none  tracking-tight italic">
              {userData?.displayName || 'Guest'}
            </p>
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1  tracking-normal opacity-60">
              {userData?.role === 'admin' || userData?.role === 'superadmin' ? 'SYSTEM ADM' : 'MEMBER'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

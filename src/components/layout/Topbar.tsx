import { Menu, Sun, CloudRain, Cloud, CloudLightning, Snowflake, Moon, Bell, MapPin, Search, User, LogOut, ChevronDown, Maximize, Minimize, Music, Play, Pause, Volume2, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { signOut } from 'firebase/auth';
import { useAudioStore } from '../../store/audioStore';
import { createPortal } from 'react-dom';

export default function Topbar() {
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useAppStore();
  const { user, userData } = useAuthStore();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number; description: string } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  const { systemVersion } = useAppStore();
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    if (systemVersion) {
      const localVersion = localStorage.getItem('appVersion');
      if (localVersion !== systemVersion) {
        setNeedsUpdate(true);
      } else {
        setNeedsUpdate(false);
      }
    }
  }, [systemVersion]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = () => {
    const docElm = document.documentElement as any;
    const doc = document as any;

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen().catch((err: any) => console.error(`Error attempting to enable fullscreen: ${err.message}`));
      } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
      } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
      } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
      } else {
        console.warn("Fullscreen API is not supported in this browser.");
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setShowProfileMenu(false);
    navigate('/login');
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetVersion = () => {
    setShowResetConfirm(true);
  };

  const confirmResetVersion = () => {
    if (systemVersion) {
      localStorage.setItem('appVersion', systemVersion);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
    sessionStorage.clear();
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&email=sonlyhongduc@gmail.com`, { headers: { 'Accept-Language': 'vi' } })
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
            const addr = gData.address;
            const parts = [];
            const ward = addr.quarter || addr.suburb || addr.village || addr.hamlet || addr.neighbourhood;
            const district = addr.city_district || addr.county || addr.district || addr.town;
            const city = addr.city || addr.state || addr.province;
            if (ward) parts.push(ward);
            if (district) parts.push(district);
            if (city) parts.push(city);
            
            setLocationName(parts.length > 0 ? parts.join(', ') : (gData.display_name || 'Trái đất'));
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
    <header className="h-16 flex-shrink-0 z-30 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border shadow-md active:scale-95 relative ${
            !sidebarOpen 
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.55)]' 
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-white/5'
          }`}
          title="Mở thanh trình đơn"
        >
          <Menu className="w-5 h-5" />
          {!sidebarOpen && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-6 pl-4 border-l border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-900 dark:text-zinc-100 tabular-nums">
              {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              {time.toLocaleDateString('vi-VN', { weekday: 'long' })}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-zinc-500">
             <div className="flex items-center gap-2 group cursor-help">
               <MapPin className="w-3.5 h-3.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
               <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200 transition-colors">
                 {locationName || 'Đang định vị...'}
               </span>
             </div>
             {weather && (
               <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-white/5">
                 {getWeatherIcon(weather.code)}
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-zinc-200">{weather.temp}°C</span>
                    <span className="text-[9px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-tight">{weather.description}</span>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="relative hidden xl:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-focus-within:text-blue-500 dark:group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search commands..." 
            className="w-64 h-9 pl-10 pr-4 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-lg text-[11px] font-medium outline-none focus:border-blue-500 dark:focus:border-white/20 focus:bg-white dark:focus:bg-zinc-900 transition-all text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Player */}
          {(() => {
            const { isPlaying, currentTime, duration, toggle, seek, audioUrl, audioTitle } = useAudioStore();
            const [showPlayerTimeline, setShowPlayerTimeline] = useState(false);

            const formatTime = (secs: number) => {
              if (isNaN(secs) || secs === Infinity) return '0:00';
              const m = Math.floor(secs / 60);
              const s = Math.floor(secs % 60);
              return `${m}:${s < 10 ? '0' : ''}${s}`;
            };

            if (!audioUrl) return null;

            return (
              <div 
                className={cn(
                  "flex items-center gap-2 p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-full transition-all duration-300",
                  showPlayerTimeline ? "max-w-[200px] md:max-w-xs pr-3" : "max-w-[36px]"
                )}
                onMouseEnter={() => setShowPlayerTimeline(true)}
                onMouseLeave={() => setShowPlayerTimeline(false)}
              >
                <button
                  onClick={toggle}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-white transition-all shadow-sm active:scale-90",
                    isPlaying ? "bg-purple-600 shadow-purple-500/20" : "bg-slate-500 dark:bg-zinc-700 hover:bg-slate-600"
                  )}
                  title={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc nền"}
                >
                  {isPlaying ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      <Pause className="w-3 h-3 fill-current" />
                    </motion.div>
                  ) : <Play className="w-3 h-3 fill-current ml-0.5" />}
                </button>

                <AnimatePresence>
                  {showPlayerTimeline && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex items-center gap-1.5 md:gap-2 overflow-hidden whitespace-nowrap"
                    >
                      <div className="flex flex-col text-left max-w-[60px] md:max-w-[100px] select-none leading-none">
                        <span className="text-[9px] font-bold text-slate-800 dark:text-zinc-200 truncate capitalize">
                          {audioTitle}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <input 
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => seek(parseFloat(e.target.value))}
                        className="w-14 md:w-20 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-400 outline-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}

          <button
            onClick={handleFullscreenToggle}
            className="relative w-9 h-9 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-all"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={handleResetVersion}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group",
              needsUpdate 
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 animate-pulse border border-amber-200 dark:border-amber-700/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900"
            )}
            title="Làm mới phiên bản (Xóa Cache)"
          >
            <RefreshCw className={cn("w-4 h-4 transition-transform duration-500", !needsUpdate && "group-hover:rotate-180")} />
            {needsUpdate && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => toggleDarkMode()}
            className="relative w-9 h-9 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-all"
            title={darkMode ? "Vùng sáng" : "Vùng tối"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-white/5 hidden sm:block" />

        {user ? (
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 h-10 pl-1 pr-2 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-white/10 transition-all"
            >
              <div className="w-7 h-7 rounded-md overflow-hidden bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                {userData?.photoURL ? (
                  <img src={userData.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase">
                    {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="text-left hidden lg:block pr-1">
                <p className="text-[11px] font-semibold text-slate-900 dark:text-zinc-200 leading-tight truncate max-w-[100px]">{userData?.displayName || 'Guest User'}</p>
              </div>
              <ChevronDown className={cn("w-3 h-3 text-slate-400 dark:text-zinc-500 transition-transform duration-300", showProfileMenu && "rotate-180")} />
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
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg dark:shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-white/5">
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-zinc-100 truncate">{userData?.displayName || 'Guest'}</p>
                      <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{userData?.role || 'Member'}</p>
                    </div>
                    
                    <div className="p-1.5">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-rose-500 dark:text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-500 dark:hover:bg-rose-500/10 rounded-md transition-all text-[11px] font-medium"
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
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-md text-[10px] font-bold uppercase tracking-widest transition-all shadow-md dark:shadow-lg active:scale-95"
          >
            Đăng nhập
          </Link>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setShowResetConfirm(false); }}
            >
               <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col"
                onClick={e => e.stopPropagation()}
               >
                 <div className="p-6 pb-2">
                   <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                     <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Làm mới phiên bản?</h2>
                   <p className="text-slate-500 dark:text-zinc-400 text-sm text-center mt-2">
                     Đồng bộ ứng dụng mới nhất. Thao tác này sẽ xóa cache trình duyệt của bạn{needsUpdate && systemVersion ? ` và cập nhật lên phiên bản ${systemVersion}` : ''}.
                   </p>
                 </div>
                 <div className="p-6 flex gap-3">
                   <button 
                     onClick={() => setShowResetConfirm(false)}
                     className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                   >
                     Hủy Bỏ
                   </button>
                   <button 
                     onClick={confirmResetVersion}
                     className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md"
                   >
                     <RefreshCw className="w-4 h-4" />
                     Xác Nhận
                   </button>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}

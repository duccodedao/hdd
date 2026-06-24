import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  User, Shield, Wifi, Globe, MapPin, 
  CloudSun, Activity, LogIn, AppWindow, Calendar, Contact, 
  Heart, Users, LayoutDashboard, Clock, ArrowRight, ChevronsRight, Sparkles, 
  Navigation, Signal, Bot, Lock, Sun, Moon, RefreshCw, LogOut, Laptop, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { syncTelemetryToFirestore, syncGuestTelemetry } from '../services/telemetryService';

export default function IntroLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData, loading: authLoading } = useAuthStore();
  const { 
    webLogo,
    heroBanner,
    sharedLocationName,
    sharedWeather,
    sharedNetworkSpeed,
    sharedDeviceIp,
    sharedGps
  } = useAppStore();

  // Derived telemetry priority: userData (Firestore) -> appStore
  const deviceIp = userData?.ip || sharedDeviceIp || 'Đang truy vấn...';
  const locationName = userData?.location?.address || sharedLocationName || 'Đang định vị...';

  const weather = userData?.weather 
    ? {
        temp: `${userData.weather.temp}°C`,
        condition: userData.weather.description
      }
    : sharedWeather 
      ? {
          temp: `${sharedWeather.temp}°C`,
          condition: sharedWeather.description
        }
      : {
          temp: '--',
          condition: 'Đang đo...'
        };

  const networkSpeed = userData?.networkSpeed
    ? {
        speed: userData.networkSpeed.downlink ? `${userData.networkSpeed.downlink.toFixed(1)} Mbps` : 'Đang kiểm tra...',
        ping: userData.networkSpeed.ping !== null ? `${userData.networkSpeed.ping} ms` : 'Đang ping...'
      }
    : {
        speed: sharedNetworkSpeed.downlink ? `${sharedNetworkSpeed.downlink.toFixed(1)} Mbps` : 'Đang kiểm tra...',
        ping: sharedNetworkSpeed.ping !== null ? `${sharedNetworkSpeed.ping} ms` : 'Đang ping...'
      };

  const [wifiIp, setWifiIp] = useState<string>('Đang quét LAN...');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Precision GPS coordinates derived dynamically from userData or sharedGps
  const gpsCoords = userData?.location?.lat && userData?.location?.lng
    ? {
        lat: userData.location.lat.toFixed(6),
        lng: userData.location.lng.toFixed(6)
      }
    : {
        lat: sharedGps?.lat !== undefined ? sharedGps.lat.toFixed(6) : '10.7756',
        lng: sharedGps?.lng !== undefined ? sharedGps.lng.toFixed(6) : '106.7004'
      };

  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);

  // Theme preference states: 'light' | 'dark' | 'system'
  const [themePref, setThemePref] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return 'system';
  });

  // Handle Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Đã đăng xuất tài khoản an toàn!");
    } catch (err: any) {
      toast.error(`Lỗi đăng xuất: ${err.message}`);
    }
  };

  // Change Theme preference & DOM Class list
  const handleThemeChange = (pref: 'light' | 'dark' | 'system') => {
    setThemePref(pref);
    if (pref === 'light') {
      localStorage.setItem('theme', 'light');
      useAppStore.setState({ darkMode: false });
      document.documentElement.classList.remove('dark');
      toast.success("Chuyển sang giao diện Sáng");
    } else if (pref === 'dark') {
      localStorage.setItem('theme', 'dark');
      useAppStore.setState({ darkMode: true });
      document.documentElement.classList.add('dark');
      toast.success("Chuyển sang giao diện Tối");
    } else {
      localStorage.removeItem('theme');
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      useAppStore.setState({ darkMode: mediaQuery.matches });
      if (mediaQuery.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      toast.success("Áp dụng giao diện Hệ thống");
    }
  };

  // Listen to prefers-color-scheme when using system theme
  useEffect(() => {
    if (themePref === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        useAppStore.setState({ darkMode: e.matches });
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [themePref]);

  // Extract candidate LAN IP via WebRTC
  const detectLocalIP = async () => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const timeout = setTimeout(() => {
        setWifiIp('Mạng khép kín (WebRTC blocked)');
        pc.close();
      }, 1500);

      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          const candidateStr = ice.candidate.candidate;
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = ipRegex.exec(candidateStr);
          if (match && match[1]) {
            clearTimeout(timeout);
            setWifiIp(match[1]);
            pc.close();
          }
        }
      };
    } catch (e) {
      console.warn("WebRTC local IP query restriction: ", e);
      setWifiIp('Bị chặn bởi Browser Policy');
    }
  };

  useEffect(() => {
    detectLocalIP();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResetLocation = async () => {
    setIsGpsLoading(true);
    const toastId = toast.loading('Đang cập nhật vị trí thiết bị...');
    try {
      if (user?.uid) {
        await syncTelemetryToFirestore(user.uid);
        toast.success('Đã làm mới vị trí & thời tiết thành công!', { id: toastId });
      } else {
        await syncGuestTelemetry();
        toast.success('Đã làm mới vị trí & thời tiết thành công!', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Lỗi khi lưu vị trí: ' + (err.message || String(err)), { id: toastId });
    } finally {
      setIsGpsLoading(false);
    }
  };

  // List of all platform utilities with roles (rendered strictly display-only)
  const systemFeatures = [
    {
      id: 'portal',
      name: 'Core Portal (Bản tin số)',
      desc: 'Báo chí tổng hợp, tin truyền thông MOH và kết nối luồng tin tức trực tiếp từ các hãng truyền thông uy tín như VNExpress.',
      icon: AppWindow,
    },
    {
      id: 'utilities',
      name: 'Kho Tiện ích (Apps console)',
      desc: 'Kho lưu trữ siêu liên kết các tiện ích hữu dụng: sinh số ngẫu nhiên, đo thời gian, máy tính tài chính và quản lý.',
      icon: LayoutDashboard,
    },
    {
      id: 'apps',
      name: 'Kho Ứng dụng tích hợp',
      desc: 'Tổng quan các dự án ứng dụng phong phú, hệ quản trị vận hành phần mềm độc lập trong hệ thống.',
      icon: AppWindow,
    },
    {
      id: 'ai-tools',
      name: 'Công cụ Trợ lý AI',
      desc: 'Trí tuệ nhân tạo Gemini 3.5 và các mô hình tự động hóa trích xuất thông tin, nhận diện hình ảnh, tóm tắt bài viết.',
      icon: Bot,
    },
    {
      id: 'calendar',
      name: 'Lịch biểu & Công việc',
      desc: 'Đồng bộ hóa các biểu đồ thời gian biểu, nhắc nhở nhiệm vụ, lịch sự kiện và điều hành cuộc họp trực tiếp.',
      icon: Calendar,
    },
    {
      id: 'contacts',
      name: 'Danh bạ Cơ quan nội bộ',
      desc: 'Danh mục thông tin liên lạc thông minh, tra cứu nhanh số điện thoại cán bộ ban ngành, đơn vị sự nghiệp.',
      icon: Contact,
    },
    {
      id: 'population',
      name: 'Thống kê dân số (HRM)',
      desc: 'Hệ quản trị mật độ dân trí số, phân cấp cơ cấu theo nhóm tuổi, giới tính và biểu đồ diễn biến đô thị.',
      icon: Users,
    },
    {
      id: 'ncd',
      name: 'Bệnh Không Lây Nhiễm MOH',
      desc: 'Nền tảng kiểm soát và lập hồ sơ đăng ký mô hình bệnh tật mạn tính quốc gia chuẩn y khoa.',
      icon: Heart,
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans relative overflow-x-hidden pt-0 pb-16 transition-colors duration-300">
      <Helmet>
        <title>BMASS | Trung tâm điều hành & Cổng thông tin thông minh</title>
      </Helmet>


      {/* Background visual graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 bg-grid-pattern opacity-[0.03] dark:opacity-10" />
      
      {/* 1. VISIBLE HERO BANNER (Full width, Auto Height) */}
      {heroBanner && (
        <div className="w-full overflow-hidden mb-10 shadow-sm pt-0 mt-0">
           <img 
            src={heroBanner} 
            alt="Hero Banner" 
            className="w-full h-auto object-cover block m-0 p-0" 
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Ambient background glows */}
      <div className="absolute top-[10%] left-[-15%] w-[50vw] h-[50vw] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-15%] w-[45vw] h-[45vw] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className={`max-w-7xl mx-auto px-4 md:px-8 space-y-12 ${!heroBanner ? 'pt-20' : ''}`}>
        


        {/* DOUBLE COLUMN CONTAINER: PROFILE & TELEMETRY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: IDENTITY VERIFICATION CARD WITH AUTH CONDITIONAL VIEWS */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-lg dark:shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  Định Danh Hệ Thống
                </span>
                {user ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-650 dark:text-emerald-400 font-bold uppercase">
                    Đã Kết Nối
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold uppercase animate-pulse">
                    Chờ Đăng Nhập
                  </span>
                )}
              </div>

              {/* DYNAMIC SHIMMER LOADER SKELETON WHEN NOT LOGGED IN */}
              {authLoading ? (
                <div className="space-y-6 py-6 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-mono">Đang kết nối phiên bảo mật...</p>
                </div>
              ) : user ? (
                /* LOGGED IN USER STATE VIEW */
                <div className="space-y-6">
                  <div className="flex items-center gap-5">
                    <div className="relative shrink-0">
                      {userData?.photoURL ? (
                        <img 
                          src={userData.photoURL} 
                          alt={userData.displayName}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/30 dark:ring-indigo-500/50 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xl shadow-md">
                          {(userData?.displayName || user?.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans truncate">
                        {userData?.displayName || 'Thành viên Bmass'}
                      </h3>
                      <p className="text-xs text-indigo-600 dark:text-indigo-300 font-mono font-medium max-w-[200px] md:max-w-xs truncate">
                        {user.email || 'không công khai email'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 font-extrabold capitalize">
                          Quyền: {userData?.role || 'user'}
                        </span>
                        {userData?.status && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-extrabold capitalize">
                            Trạng thái: {userData.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/5 pt-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Ngày tham gia:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('vi-VN') : 'Đang lấy...'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span>Khóa Định Danh UID:</span>
                      <span className="font-mono bg-slate-200/50 dark:bg-white/5 rounded px-2 py-0.5 text-[10px] text-slate-800 dark:text-slate-350 flex items-center gap-1">
                        {user.uid.substring(0, 16)}...
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(user.uid);
                            toast.success("Đã sao chép mã UID!");
                          }}
                          className="hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
                          title="Sao chép UID"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* AUTH NOT LOGGED IN: SKELETON PLACEHOLDER LOADING VIEW (STRICT REQUIREMENT) */
                <div className="space-y-6">
                  <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed mb-4">
                    Hiện bạn chưa đăng nhập hệ thống. Vui lòng bấm Truy cập hoặc Đăng nhập để sử dụng các phân hệ chuyên trách.
                  </div>

                  {/* Shimmer layout container */}
                  <div className="space-y-4 animate-pulse">
                    <div className="flex items-center gap-5">
                      {/* Avatar item loader */}
                      <div className="w-16 h-16 rounded-2xl bg-slate-250 dark:bg-slate-800 shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-300/40 dark:via-white/5 to-transparent animate-shimmer" />
                      </div>
                      
                      {/* Name placeholder shimmers */}
                      <div className="space-y-2.5 flex-1">
                        <div className="h-4 bg-slate-250 dark:bg-slate-800 rounded w-2/3" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800/65 rounded w-5/6" />
                        <div className="flex gap-2">
                          <div className="h-4 bg-slate-200 dark:bg-slate-800/45 rounded w-16" />
                          <div className="h-4 bg-slate-200 dark:bg-slate-800/45 rounded w-20" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/5 pt-4 space-y-3">
                      <div className="flex justify-between">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded w-20" />
                        <div className="h-3 bg-slate-250 dark:bg-slate-800/90 rounded w-24" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded w-32" />
                        <div className="h-3 bg-slate-250 dark:bg-slate-800/90 rounded w-16" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LOWER ACTIONS BUTTON BAR */}
            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/5 space-y-3">
              {user ? (
                <div className="space-y-3">
                  {/* Standalone large button: Truy cập */}
                  <button 
                    id="nav-utilities-direct"
                    onClick={() => navigate('/utilities')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-2xl tracking-widest transition-all uppercase shadow-lg shadow-indigo-500/30 ring-2 ring-offset-2 ring-indigo-500/20"
                  >
                    <AppWindow className="w-4 h-4 text-white" />
                    Truy cập hệ thống
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Column 1: Quản lý */}
                    <button 
                      id="nav-profile-manage"
                      onClick={() => navigate('/profile')}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-white text-xs font-bold rounded-2xl tracking-wider transition-all uppercase shadow-xs"
                    >
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Quản lý
                    </button>

                    {/* Column 2: Đăng xuất */}
                    <button 
                      id="action-btn-logout"
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/40 dark:border-rose-500/20 active:scale-95 text-xs font-extrabold rounded-2xl tracking-wider transition-all uppercase"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-450" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ) : (
                /* GUEST ACTION BAR: SIGN IN TRIGGER */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    id="action-btn-login"
                    onClick={() => navigate('/login', { state: { from: location } })}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black tracking-wider uppercase transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    Đăng Nhập
                  </button>
                  
                  <button 
                    id="action-btn-portal"
                    onClick={() => navigate('/trang-chu')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-black tracking-wider uppercase transition-all active:scale-95"
                  >
                    Trang Thống Kê
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: REAL, HIGH FIDELITY TELEMETRY MONITOR (ACTIVE PRIOR TO LOGIN WITH ABSOLUTE ZERO BLOCKING) */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-lg dark:shadow-2xl">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl animate-pulse" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-650 dark:text-emerald-400 animate-pulse" />
                  Giám Sát Băng Thông & Tiện Ích Số
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-450 animate-ping" />
                  KẾT NỐI REAL-TIME
                </span>
              </div>

              {/* TELEMETRY DECK GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                
                {/* 1. Clock timer */}
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 transition-colors">
                  <div className="flex items-center gap-2 text-slate-450 dark:text-slate-500">
                    <Clock className="w-4 h-4 text-orange-550 text-orange-450" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Thời gian</span>
                  </div>
                  <div className="font-mono text-lg font-black text-slate-900 dark:text-white leading-none">
                    {currentTime.toLocaleTimeString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                    {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </div>
                </div>

                {/* 2. Device Wide Area IP */}
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 transition-colors font-sans">
                  <div className="flex items-center gap-2 text-slate-450 dark:text-slate-500">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">IP Thiết bị</span>
                  </div>
                  <div className="font-mono text-xs font-black text-slate-900 dark:text-white truncate" title={deviceIp}>
                    {deviceIp}
                  </div>
                  <div className="text-[10px] text-slate-400">WAN Address</div>
                </div>

                {/* 4. Geography Geography location */}
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 transition-colors">
                  <div className="flex items-center gap-2 text-slate-450 dark:text-slate-500">
                    <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Địa giới VR</span>
                  </div>
                  <div className="font-sans text-xs font-black text-slate-900 dark:text-white truncate" title={locationName}>
                    {locationName}
                  </div>
                  <div className="text-[10px] text-slate-400">Vị trí tương quan</div>
                </div>

                {/* 5. Thermal metrics OpenMeteo weather */}
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 transition-colors">
                  <div className="flex items-center gap-2 text-slate-450 dark:text-slate-500">
                    <CloudSun className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Thời tiết</span>
                  </div>
                  <div className="font-mono text-base font-black text-slate-900 dark:text-white leading-none">
                    {weather.temp}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate" title={weather.condition}>
                    {weather.condition}
                  </div>
                </div>

                {/* 6. Current Bandwidth speed and responsive latency ping */}
                <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 transition-colors">
                  <div className="flex items-center gap-2 text-slate-450 dark:text-slate-500">
                    <Signal className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Hệ thống mạng</span>
                  </div>
                  <div className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none">
                    {networkSpeed.speed}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                    Ping: {networkSpeed.ping}
                  </div>
                </div>

                {/* 7. HIGH PRECISION GEOLOCATION COORDINATES DISPLAY WITH SPECIFIED RESET ICON WORKFLOW */}
                <div id="gps-coordinate-module" className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-1.5 col-span-2 transition-colors relative group">
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-indigo-550 dark:text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Tọa độ GPS thực tế</span>
                    </div>
                    
                    {/* ACCURATE RESET POSITION GEOLOCATION ICON */}
                    <button
                      id="btn-reset-location"
                      onClick={handleResetLocation}
                      disabled={isGpsLoading}
                      className="p-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-350 transition-all disabled:opacity-50 flex items-center gap-1 active:scale-95 shrink-0"
                      title="Quét lại GPS"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
                      <span className="text-[9px] font-bold uppercase">Reset</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Vĩ độ (Latitude)</span>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-zinc-100 block truncate">
                        {gpsCoords.lat}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Kinh độ (Longitude)</span>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-zinc-100 block truncate">
                        {gpsCoords.lng}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/5 mt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 select-none">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-505 dark:text-indigo-400 shrink-0" />
                Dữ liệu băng thông & tọa độ được quét trực tiếp thời gian thực không ảo hóa.
              </span>
              <span className="font-mono text-[10px]">Mã hóa: TLS v1.3 SSL</span>
            </div>
          </div>

        </div>

        {/* COMPREHENSIVE FEATURES PREVIEW COVERED BY STRICT DISABLE BOUNDARIES */}
        <div id="core-utility-preview-deck" className="space-y-6 pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-white">
                  Khám Phá Các Phân Hệ Tiện Ích & Tính Năng
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-red-500/10 text-red-600 dark:text-red-300 font-extrabold uppercase border border-red-500/20">
                  Vô Hiệu Khóa Tương Tác
                </span>
              </div>
              <p className="text-slate-550 dark:text-slate-400 text-xs md:text-sm">
                Toàn bộ tiện ích bên dưới nằm trong diện chỉ trưng bày cấu trúc liên kết và thông tin chức năng để hỗ trợ an ninh.
              </p>
            </div>
          </div>

          {/* GRID OF UTILITIES EXPLICITLY DISABLED TO SATISFY "toàn bộ vô hiệu hóa không thể bấm được, chỉ hiển thị thôi" */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemFeatures.map((feat) => {
              const IconComp = feat.icon;
              return (
                <div 
                  key={feat.id}
                  className="bg-slate-100/50 dark:bg-slate-900/35 border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex flex-col justify-between select-none cursor-not-allowed opacity-60 relative group"
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <IconComp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {feat.name}
                      </h4>
                      <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[50px]">
                        {feat.desc}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/5 pt-4 mt-4 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 select-none">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Không hoạt động
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-mono">
                      {feat.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

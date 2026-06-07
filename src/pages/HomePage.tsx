import { ArrowRight, ShieldCheck, Zap, Globe, Code } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { motion, useSpring, useTransform } from 'motion/react';

function Counter({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function HomePage() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('Chào buổi sáng');
      else if (hour >= 12 && hour < 18) setGreeting('Chào buổi chiều');
      else if (hour >= 18 && hour < 22) setGreeting('Chào buổi tối');
      else setGreeting('Chúc bạn đêm ngon giấc');
    };
    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { stampConfig, webLogo } = useAppStore();
  const [siteStats, setSiteStats] = useState({ today: 0, month: 0, year: 0, total: 0 });
  const [partners, setPartners] = useState<{ id: string, name: string, logoUrl: string }[]>([]);
  const [aboutConfig, setAboutConfig] = useState<any>({
    introTitle: 'Nền tảng công nghệ toàn diện',
    introDesc: 'Trải nghiệm không gian công nghệ số hiện đại. Tích hợp các công cụ quản lý và tiện ích thông minh, mang đến trải nghiệm tinh tế cho người dùng.',
    adminName: 'Sơn Lý Hồng Đức',
    adminBio: 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.',
    adminPhoto: 'https://tytpht.hdd.io.vn/img/bmassloadings.png'
  });

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'about'));
        if (snap.exists()) {
          setAboutConfig(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (e) {
         console.warn(e || "Unknown error");
      }
    };
    fetchAbout();

    // Stats fetching
    const now = new Date();
    const todayId = `day_${format(now, 'yyyy-MM-dd')}`;
    const monthId = `month_${format(now, 'yyyy-MM')}`;
    const yearId = `year_${format(now, 'yyyy')}`;

    // Site Stats real-time listener
    const unsubStats = onSnapshot(collection(db, 'site_visitation_stats'), (snapshot) => {
      const stats: any = { today: 0, month: 0, year: 0, total: 0 };
      snapshot.docs.forEach(doc => {
        const id = doc.id;
        const count = doc.data().count || 0;
        if (id === 'total') stats.total = count;
        else if (id === todayId) stats.today = count;
        else if (id === monthId) stats.month = count;
        else if (id === yearId) stats.year = count;
      });
      setSiteStats(stats);
    }, (err) => {
      console.error("HomePage stats listener error:", err?.message || "Unknown error");
    });

    const unsubPartners = onSnapshot(collection(db, 'partners'), (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any));
    }, (error) => {
      console.warn("Partners stream blocked:", error?.message);
    });

    return () => {
      unsubStats();
      unsubPartners();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden font-sans text-slate-900 dark:text-zinc-300">
      <nav className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 md:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 border border-white/5 p-2 bg-white/10 backdrop-blur-xl ring-1 ring-white/10">
             <img src={webLogo || "https://tytpht.hdd.io.vn/img/bmassloadings.png"} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 bg-clip-text text-transparent leading-normal pb-1">BMASS</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-indigo-400 uppercase mt-0.5">Digital Platform</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!user && (
            <button 
              onClick={() => navigate('/login', { state: { from: location } })}
              className="hidden md:block px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Đăng nhập
            </button>
          )}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ 
              boxShadow: ["0px 0px 0px rgba(99, 102, 241, 0)", "0px 0px 20px rgba(99, 102, 241, 0.4)", "0px 0px 0px rgba(99, 102, 241, 0)"] 
            }}
            transition={{ 
              boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }}
            onClick={() => navigate('/utilities')}
            className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-sm font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
          >
            Truy cập
            <Zap className="w-4 h-4 fill-white/20" />
          </motion.button>
        </div>
      </nav>

      <main className="flex-1 relative z-10 flex flex-col items-center px-4 md:px-6 max-w-7xl mx-auto w-full">
        {/* Admin Bio Card - Refined */}
        <motion.div
           initial={{ opacity: 0, y: 50 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
           className="w-full max-w-4xl mx-auto mt-0 md:-mt-2"
         >
          <div className="glass-card p-6 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 md:p-12 opacity-[0.02] -rotate-12 translate-x-10 -translate-y-10 group-hover:opacity-5 transition-opacity">
               <ShieldCheck className="w-64 h-64 md:w-96 md:h-96 text-indigo-900" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
              <div className="shrink-0 relative mx-auto md:mx-0">
                <div className="w-40 h-40 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[2.5rem] border-[4px] border-slate-50 dark:border-white/5 p-1.5 relative shadow-2xl shadow-indigo-500/10 bg-white dark:bg-zinc-900">
                  <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-500/20 rounded-[2.5rem] animate-pulse blur-xl opacity-20"></div>
                  <img src={aboutConfig.adminPhoto || "https://tytpht.hdd.io.vn/img/bmassloadings.png"} alt="Admin" className="w-full h-full rounded-[2rem] md:rounded-[2rem] object-cover p-0 relative z-10 bg-white dark:bg-zinc-900" />
                  
                  {stampConfig && stampConfig.active && stampConfig.imageUrl && (
                    <img 
                      src={stampConfig.imageUrl}
                      alt="Watermark Overlay"
                      className="absolute z-20 pointer-events-none drop-shadow-xl"
                      style={{
                        opacity: (stampConfig.opacity || 50) / 100,
                        width: `${Math.min(stampConfig.width || 80, 80)}px`,
                        bottom: '-15%',
                        right: '-15%',
                        transform: 'rotate(-5deg)'
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-4 md:space-y-6 flex-1 mt-4 md:mt-0">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 dark:border-indigo-500/20 ring-4 ring-indigo-50/50 dark:ring-indigo-500/5">
                  <span className="w-2 h-2 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Quản trị viên
                </div>
                <div>
                  <div className="text-xs md:text-sm font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    {greeting},
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent pb-1 md:pb-2 leading-tight">{aboutConfig.adminName?.trim() || 'Sơn Lý Hồng Đức'}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-xs md:text-xs uppercase mt-1 md:mt-1">BMASS Digital Platform</p>
                </div>
                <p className="text-slate-600 dark:text-zinc-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto md:mx-0 font-medium">
                  {aboutConfig.adminBio || 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.'}
                </p>

                {/* Site Stats Display */}
                <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 dark:border-white/5 mt-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Hôm nay</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      <Counter value={siteStats.today} />
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Tháng này</span>
                    <span className="text-xl font-black text-slate-900 dark:text-zinc-100">
                      <Counter value={siteStats.month} />
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Năm nay</span>
                    <span className="text-xl font-black text-slate-900 dark:text-zinc-100">
                      <Counter value={siteStats.year} />
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Tổng cộng</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 group-hover:animate-pulse transition-all">
                      <Counter value={siteStats.total} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {partners.length > 0 && (
        <div className="relative z-10 w-full overflow-hidden py-6 md:py-8">
          <div className="flex w-full overflow-hidden mask-edges relative group">
            <motion.div 
              className="flex gap-8 md:gap-16 items-center px-4 md:px-8 w-max shrink-0"
              animate={{ x: [0, "-50%"] }}
              transition={{ repeat: Infinity, ease: "linear", duration: Math.max(20, partners.length * 4) }}
            >
              {Array.from({ length: 6 }).flatMap(() => partners).map((p, idx) => (
                <div key={`${p.id}-${idx}`} className="flex items-center justify-center shrink-0 w-24 md:w-32 h-10 md:h-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  <img src={p.logoUrl} alt={p.name} className="max-w-full max-h-full object-contain" />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      <footer className="relative z-10 py-8 md:py-12 text-center">
        <div className="flex flex-col items-center gap-6">
        </div>
      </footer>
    </div>
  );
}

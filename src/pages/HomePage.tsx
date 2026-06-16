import { ArrowRight, ShieldCheck, Zap, Globe, Code, ArrowUpRight, Activity, TerminalSquare, Box, Star, Blocks, Cpu, Users } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { motion, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Helmet } from 'react-helmet-async';

function Counter({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}

export default function HomePage() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('Good Morning');
      else if (hour >= 12 && hour < 18) setGreeting('Good Afternoon');
      else if (hour >= 18 && hour < 22) setGreeting('Good Evening');
      else setGreeting('Good Night');
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
  const [popStats, setPopStats] = useState({ 
    total: 0, male: 0, female: 0,
    over18: 0, over20: 0, over40: 0, over50: 0,
    range50_69: 0
  });
  const [aboutConfig, setAboutConfig] = useState<any>({
    introTitle: 'Nền tảng công nghệ toàn diện',
    introDesc: 'Trải nghiệm không gian công nghệ số hiện đại. Tích hợp các công cụ quản lý và tiện ích thông minh, mang đến trải nghiệm tinh tế cho người dùng.',
    adminName: 'Sơn Lý Hồng Đức',
    adminBio: 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế.',
    adminPhoto: 'https://tytpht.hdd.io.vn/img/bmassloadings.png'
  });

  useEffect(() => {
    const fetchAbout = async () => {
      if (useAuthStore.getState().userData?.role === 'review') {
        setAboutConfig({
          introTitle: '', introDesc: '', adminName: '', adminBio: '', adminPhoto: '', webLogo: ''
        });
        return;
      }
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

    if (useAuthStore.getState().userData?.role === 'review') {
      setSiteStats({ today: 0, month: 0, year: 0, total: 0 });
      setPopStats({ total: 0, male: 0, female: 0, over18: 0, over20: 0, over40: 0, over50: 0, range50_69: 0 });
      setPartners([]);
      return;
    }

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

    // Population Stats listener
    const unsubPop = onSnapshot(collection(db, 'hrm_population'), (snapshot) => {
      const totals = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const male = Number(data.maleCount || 0);
        const female = Number(data.femaleCount || 0);
        const count = male + female;
        const from = Number(data.fromAge || 0);
        const to = Number(data.toAge || 0);

        return {
          male: acc.male + male,
          female: acc.female + female,
          total: acc.total + count,
          over18: acc.over18 + (from >= 18 ? count : 0),
          over20: acc.over20 + (from >= 20 ? count : 0),
          over40: acc.over40 + (from >= 40 ? count : 0),
          over50: acc.over50 + (from >= 50 ? count : 0),
          range50_69: acc.range50_69 + (from >= 50 && to <= 69 ? count : 0)
        };
      }, { male: 0, female: 0, total: 0, over18: 0, over20: 0, over40: 0, over50: 0, range50_69: 0 });
      setPopStats(totals);
    });

    const unsubPartners = onSnapshot(collection(db, 'partners'), (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any));
    }, (error) => {
      console.warn("Partners stream blocked:", error?.message);
    });

    return () => {
      unsubStats();
      unsubPop();
      unsubPartners();
    };
  }, [user]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent flex flex-col relative overflow-hidden font-sans text-slate-900 dark:text-zinc-300">
      <Helmet>
        <title>BMass Ecosystem v5.0 | Central Node</title>
      </Helmet>

      {/* Hero Central Node */}
      <main className="flex-1 relative z-10 flex flex-col pt-12 md:pt-20 px-4 md:px-8 max-w-7xl mx-auto w-full gap-8">
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="w-full flex flex-col lg:flex-row items-center lg:items-start gap-12"
         >
           
           {/* Left Core Introduction */}
           <div className="flex-1 space-y-6 text-center lg:text-left">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest leading-none">BMass Ecosystem v5.0</span>
             </div>

             <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
               {greeting}.
               <span className="block mt-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                 Welcome to the Node.
               </span>
             </h1>

             <p className="text-base md:text-lg text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
               Hệ thống cảnh quan định danh và trung tâm lưu trữ siêu liên kết nội bộ. Quản lý tiện ích, nhật ký hành vi và thống kê hệ sinh thái tối ưu nhất.
             </p>

             <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
               {user ? (
                 <button 
                  onClick={() => navigate('/portal')}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold tracking-wider uppercase transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                 >
                   Vào Core Portal
                   <ArrowRight className="w-4 h-4" />
                 </button>
               ) : (
                 <button 
                  onClick={() => navigate('/login', { state: { from: location } })}
                  className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-2xl text-sm font-bold tracking-wider uppercase transition-all shadow-xl dark:shadow-white/10 active:scale-95 flex items-center gap-2"
                 >
                   Đăng nhập Hệ Thống
                   <TerminalSquare className="w-4 h-4" />
                 </button>
               )}
               <button 
                 onClick={() => navigate('/utilities')}
                 className="px-8 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-2xl text-sm font-bold tracking-wider uppercase transition-all active:scale-95 flex items-center gap-2"
               >
                 Khám phá Tiện ích
                 <Box className="w-4 h-4" />
               </button>
             </div>
           </div>

           {/* Right Bento Grid Stats & Visual */}
           <div className="w-full lg:w-[500px] shrink-0 grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                  <Globe className="w-40 h-40" />
                </div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">Total Network Interactions</p>
                  <Counter value={siteStats.total} className="text-4xl md:text-5xl font-black tracking-tighter" />
                  <p className="text-xs font-medium text-white/80 mt-4 leading-relaxed max-w-[200px]">
                    Lượt kết nối truy cập hệ thống bmass portal toàn cầu từ trước tới nay.
                  </p>
                </div>
              </div>

              <div className="col-span-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 shadow-xl flex flex-col justify-between h-32 md:h-40">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hôm nay</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                   <Counter value={siteStats.today} className="text-3xl font-black text-slate-900 dark:text-white block" />
                   <span className="text-[9px] text-slate-400 font-medium">Session events</span>
                </div>
              </div>

              <div className="col-span-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 shadow-xl flex flex-col justify-between h-32 md:h-40">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tháng này</span>
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div>
                   <Counter value={siteStats.month} className="text-3xl font-black text-slate-900 dark:text-white block" />
                   <span className="text-[9px] text-slate-400 font-medium">Network growth</span>
                </div>
              </div>

              {/* Population Stat Card */}
              <div className="col-span-2 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 shadow-xl group hover:border-indigo-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng dân số Phường</p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Thống kê dân cư</h4>
                    </div>
                  </div>
                  <Link 
                    to="/dan-so"
                    className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
                   <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Toàn phường</span>
                      <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                        <Counter value={popStats.total} />
                      </p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Nam</span>
                      <p className="text-xl font-bold text-slate-700 dark:text-zinc-300">
                        <Counter value={popStats.male} />
                      </p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Nữ</span>
                      <p className="text-xl font-bold text-slate-700 dark:text-zinc-300">
                        <Counter value={popStats.female} />
                      </p>
                   </div>
                   <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">18 tuổi trở lên</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-zinc-200">
                        <Counter value={popStats.over18} />
                      </p>
                   </div>
                   <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">20 tuổi trở lên</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-zinc-200">
                        <Counter value={popStats.over20} />
                      </p>
                   </div>
                   <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">40 tuổi trở lên</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-zinc-200">
                        <Counter value={popStats.over40} />
                      </p>
                   </div>
                   <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">50 tuổi trở lên</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-zinc-200">
                        <Counter value={popStats.over50} />
                      </p>
                   </div>
                   <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5 col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">50 tuổi đến 69</span>
                      <p className="text-lg font-bold text-indigo-500">
                        <Counter value={popStats.range50_69} />
                      </p>
                   </div>
                </div>
              </div>
           </div>

        </motion.div>

        {/* Identity Section */}
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
           className="w-full mt-8 md:mt-12"
        >
          <div className="bg-white/60 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-slate-200/50 dark:border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center md:items-start group">
            
            {/* Ambient Background Gradient */}
            <div className="absolute -inset-24 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 blur-3xl rounded-full opacity-50 pointer-events-none group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative shrink-0">
               <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] p-1.5 bg-white dark:bg-zinc-900 shadow-xl border border-slate-200 dark:border-white/10 relative z-10">
                 <img src={aboutConfig.adminPhoto || "https://tytpht.hdd.io.vn/img/bmassloadings.png"} alt="Admin Profile" className="w-full h-full rounded-[1.5rem] object-cover" />
                 {stampConfig && stampConfig.active && stampConfig.imageUrl && (
                    <img 
                      src={stampConfig.imageUrl}
                      alt="Watermark Overlay"
                      className="absolute z-20 pointer-events-none drop-shadow-xl"
                      style={{
                        opacity: (stampConfig.opacity || 50) / 100,
                        width: `${Math.min(stampConfig.width || 60, 60)}px`,
                        bottom: '-10%',
                        right: '-10%',
                        transform: 'rotate(12deg)'
                      }}
                    />
                  )}
               </div>
               <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-indigo-600 rounded-2xl rotate-12 flex items-center justify-center shadow-lg transform group-hover:rotate-0 transition-transform duration-500">
                 <ShieldCheck className="w-6 h-6 text-white" />
               </div>
            </div>

            <div className="flex-1 text-center md:text-left relative z-10 pt-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 block">System Architect</span>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                {aboutConfig.adminName?.trim() || 'Sơn Lý Hồng Đức'}
              </h3>
              <p className="text-sm md:text-base text-slate-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto md:mx-0">
                {aboutConfig.adminBio || 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.'}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 mt-6">
                {['React Architecture', 'Cloud Services', 'Security Core', 'UI/UX Craft'].map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
          </div>
        </motion.div>

      </main>

      {/* Partners Auto-Scroll */}
      {partners.length > 0 && (
        <div className="relative z-10 w-full overflow-hidden py-12 md:py-16 mt-8">
          <div className="text-center mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Integrations & Trust</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Trusted by our technical environment</h4>
          </div>
          <div className="flex w-full overflow-hidden mask-edges relative group">
            <motion.div 
              className="flex gap-12 md:gap-20 items-center px-4 md:px-8 w-max shrink-0"
              animate={{ x: [0, "-50%"] }}
              transition={{ repeat: Infinity, ease: "linear", duration: Math.max(20, partners.length * 4) }}
            >
              {Array.from({ length: 6 }).flatMap(() => partners).map((p, idx) => (
                <div key={`${p.id}-${idx}`} className="flex items-center justify-center shrink-0 w-24 md:w-32 h-10 md:h-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  <img src={p.logoUrl} alt={p.name} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-slate-50 dark:bg-zinc-950">
        <div className="absolute top-0 right-0 w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 text-transparent" />
        <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] md:w-[50vw] md:h-[50vw] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 text-transparent" />
        {/* Subtle grid logic */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay"></div>
      </div>
    </div>
  );
}


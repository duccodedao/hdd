import { ArrowRight, ShieldCheck, Zap, Globe, Code } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { motion, useSpring, useTransform, AnimatePresence } from 'motion/react';

function Counter({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

const obfuscateEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 3) return name + '****@' + domain;
  return name.substring(0, 3).toUpperCase() + '****@' + domain;
};

function RecentLoginsStream({ logins }: { logins: {id: string, email: string}[] }) {
  const [items, setItems] = useState<{id: string, email: string}[]>([]);

  useEffect(() => {
    if (logins.length > 0) {
      setItems(logins);
    }
  }, [logins]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setItems(prev => {
        const newItems = [...prev];
        const first = newItems.shift();
        if (first) newItems.push(first);
        return newItems;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="relative h-[200px] w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}>
      <AnimatePresence mode="popLayout">
        {items.slice(0, 5).map((item, index) => {
           const isTop = index === 0;
           return (
             <motion.div
               layout
               key={item.id}
               initial={{ opacity: 0, y: 40, scale: 0.9 }}
               animate={{ 
                 opacity: isTop ? 1 : Math.max(0.15, 0.8 - (index * 0.2)), 
                 y: 0,
                 scale: isTop ? 1 : 1 - (index * 0.05),
                 zIndex: 10 - index
               }}
               exit={{ opacity: 0, y: -40, scale: 1.08, filter: "blur(4px)" }}
               transition={{ type: "spring", stiffness: 400, damping: 40, mass: 0.8 }}
               className={`flex items-center gap-3 py-2 px-4 rounded-xl border mb-2 transition-colors duration-500 relative ${
                 isTop 
                   ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)] shadow-indigo-500/10' 
                   : 'bg-transparent border-transparent'
               }`}
             >
               <div className={`w-2 h-2 rounded-full shrink-0 ${isTop ? 'bg-indigo-400 animate-pulse' : 'bg-transparent'}`} />
               <div className="flex-1 min-w-0 truncate">
                 <span className={`font-mono text-sm tracking-tight ${isTop ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
                   {obfuscateEmail(item.email)}
                 </span>
                 <span className={`text-xs ml-2 hidden sm:inline-block ${isTop ? 'text-indigo-400/80 font-medium' : 'text-slate-600'}`}>
                   | Đã đăng ký/Đăng nhập thành công.
                 </span>
               </div>
             </motion.div>
           );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stampConfig } = useAppStore();
  const [siteStats, setSiteStats] = useState({ today: 0, month: 0, year: 0, total: 0 });
  const [recentLogins, setRecentLogins] = useState<{id: string, email: string}[]>([]);
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
         console.warn(e);
      }
    };
    fetchAbout();

    // Stats fetching
    const now = new Date();
    const todayId = `day_${format(now, 'yyyy-MM-dd')}`;
    const monthId = `month_${format(now, 'yyyy-MM')}`;
    const yearId = `year_${format(now, 'yyyy')}`;

    const statIds = ['total', todayId, monthId, yearId];
    
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
      console.error("HomePage stats listener error:", err);
    });

    const unsubLogins = onSnapshot(query(collection(db, 'users'), orderBy('lastLoginAt', 'desc'), limit(15)), (snapshot) => {
      const users: {id: string, email: string}[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const email = data.email;
        const role = data.role;
        // Do not display Admin or Manager accounts
        if (email && role !== 'admin' && role !== 'manager' && email !== 'sonlyhongduc@gmail.com') {
          users.push({ id: doc.id, email });
        }
      });
      
      // Setup 10 fake emails
      const fakeEmails = [
        "nguyenanhminh@gmail.com",
        "trunghieu1998@gmail.com",
        "lethuyduong@gmail.com",
        "hoangnamhai@gmail.com",
        "phamthimai@gmail.com",
        "dangquangvinh@gmail.com",
        "hoaison_92@gmail.com",
        "trinhngocdiep@gmail.com",
        "vulamanh@gmail.com",
        "ngodung_88@gmail.com"
      ].map((email, index) => ({ id: `fake-${index}`, email }));
      
      // Merge and ensure we have items for the stream
      setRecentLogins([...users, ...fakeEmails]);
    });

    return () => {
      unsubStats();
      unsubLogins();
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden font-sans text-zinc-300">
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 border border-white/5 p-2 bg-white/10 backdrop-blur-xl ring-1 ring-white/10">
             <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 bg-clip-text text-transparent leading-normal pb-1">BMASS</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-indigo-400 uppercase mt-0.5">Digital Platform</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!user && (
            <button 
              onClick={() => navigate('/login')}
              className="hidden md:block px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Đăng nhập
            </button>
          )}
          <button 
            onClick={() => navigate('/utilities')}
            className="px-6 py-2.5 bg-white text-slate-950 hover:bg-indigo-500 hover:text-white rounded-full text-sm font-bold transition-all shadow-xl shadow-indigo-500/10 active:scale-95"
          >
            Truy cập
          </button>
        </div>
      </nav>

      <main className="flex-1 relative z-10 flex flex-col items-center px-6 py-12 md:py-20 max-w-7xl mx-auto w-full">
        {/* Admin Bio Card - Refined */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl mx-auto mt-10 md:mt-16"
        >
          <div className="glass-card p-10 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] -rotate-12 translate-x-10 -translate-y-10 group-hover:opacity-5 transition-opacity">
               <ShieldCheck className="w-96 h-96 text-indigo-900" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-20 text-center md:text-left">
              <div className="shrink-0 relative">
                <div className="w-40 h-40 rounded-[2.5rem] border-[6px] border-slate-50 dark:border-white/5 p-1.5 relative shadow-2xl shadow-indigo-500/10 bg-white dark:bg-zinc-900">
                  <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-500/20 rounded-[2.5rem] animate-pulse blur-2xl opacity-20"></div>
                  <img src={aboutConfig.adminPhoto || "https://tytpht.hdd.io.vn/img/bmassloadings.png"} alt="Admin" className="w-full h-full rounded-[2rem] object-cover p-0 relative z-10 bg-white dark:bg-zinc-900" />
                  
                  {stampConfig && stampConfig.active && stampConfig.imageUrl && (
                    <img 
                      src={stampConfig.imageUrl}
                      alt="Watermark Overlay"
                      className="absolute z-20 pointer-events-none drop-shadow-xl"
                      style={{
                        opacity: (stampConfig.opacity || 50) / 100,
                        width: `${Math.min(stampConfig.width || 120, 80)}px`,
                        bottom: '-15%',
                        right: '-15%',
                        transform: 'rotate(-5deg)'
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-6 flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 dark:border-indigo-500/20 ring-4 ring-indigo-50/50 dark:ring-indigo-500/5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Quản trị viên
                </div>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent pb-2">{aboutConfig.adminName?.trim() || 'Sơn Lý Hồng Đức'}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-xs uppercase">BMASS Digital Platform</p>
                </div>
                <p className="text-slate-600 dark:text-zinc-400 text-lg leading-relaxed max-w-xl font-medium">
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
                
                {/* Recent Logins Stream */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                   <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     Hoạt động trực tuyến
                   </h3>
                   <RecentLoginsStream logins={recentLogins} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-slate-50 py-16 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
            <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Footer Logo" className="h-8 w-auto" />
            <span className="font-black text-sm tracking-tighter uppercase bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent pb-0.5">BMASS</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <button onClick={() => navigate('/privacy')} className="hover:text-indigo-600 transition-colors">Bảo mật</button>
            <button onClick={() => navigate('/policy')} className="hover:text-indigo-600 transition-colors">Policy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-indigo-600 transition-colors">Điều khoản</button>
            <button onClick={() => navigate('/contact')} className="hover:text-indigo-600 transition-colors">Liên hệ</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

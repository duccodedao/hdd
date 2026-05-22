import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, Globe, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function HomePage() {
  const navigate = useNavigate();
  const [aboutConfig, setAboutConfig] = useState({
    introTitle: 'Hệ thống - Nền tảng công nghệ toàn diện',
    introDesc: 'Trải nghiệm không gian công nghệ số hiện đại. Tích hợp các công cụ quản lý và tiện ích thông minh, mang đến trải nghiệm tinh tế cho người dùng.',
    adminName: 'Sơn Lý Hồng Đức',
    adminBio: 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.',
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
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-sans text-slate-900">
      {/* Refined Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
           animate={{ 
             scale: [1, 1.2, 1],
             opacity: [0.3, 0.5, 0.3]
           }}
           transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
           className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-50 blur-[120px]"
        />
        <motion.div
           animate={{ 
             scale: [1, 1.1, 1],
             opacity: [0.2, 0.4, 0.2]
           }}
           transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
           className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-50 blur-[150px]"
        />
      </div>

      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-100 border border-white p-2 bg-white ring-1 ring-slate-100">
             <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-slate-900 leading-none">BMASS</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-indigo-600 uppercase mt-0.5">Operating System</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="hidden md:block px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Đăng nhập
          </button>
          <button 
            onClick={() => navigate('/utilities')}
            className="px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-full text-sm font-bold transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            Truy cập Hệ thống
          </button>
        </div>
      </nav>

      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-12 md:py-20 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-10">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8 }}
             className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-100 bg-indigo-50/50 text-indigo-600 text-[10px] font-black tracking-widest uppercase mb-4"
           >
             <Zap className="w-3 h-3 fill-indigo-600" /> Nền tảng công nghệ toàn diện
           </motion.div>
           
           <motion.h1 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
             className="text-6xl md:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9] text-slate-900"
           >
             {aboutConfig.introTitle.split(' - ')[0]}<br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">{aboutConfig.introTitle.split(' - ')[1] || 'Hệ thống'}</span>
           </motion.h1>

           <motion.p 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
             className="text-lg md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed"
           >
             {aboutConfig.introDesc}
           </motion.p>
           
           <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
             className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
           >
             <button
               onClick={() => navigate('/utilities')}
               className="group relative inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-slate-900 rounded-full text-white font-black text-lg transition-all shadow-2xl shadow-indigo-200 active:scale-95"
             >
               <span>Bắt đầu Trải nghiệm</span>
               <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
             </button>
             
             <button
               onClick={() => navigate('/about')}
               className="px-10 py-5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600 font-bold text-lg transition-all border border-slate-100"
             >
               Tìm hiểu thêm
             </button>
           </motion.div>
        </div>

        {/* Admin Bio Card - Refined */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl mx-auto mt-20"
        >
          <div className="bg-white border border-slate-100 rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] -rotate-12 translate-x-10 -translate-y-10">
               <ShieldCheck className="w-96 h-96 text-indigo-900" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-20 text-center md:text-left">
              <div className="shrink-0">
                <div className="w-40 h-40 rounded-[2.5rem] border-[6px] border-slate-50 p-1.5 relative shadow-2xl shadow-indigo-500/10 bg-white">
                  <div className="absolute inset-0 bg-indigo-100 rounded-[2.5rem] animate-pulse blur-2xl opacity-20"></div>
                  <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Admin" className="w-full h-full rounded-[2rem] object-contain p-4 relative z-10 bg-white" />
                </div>
              </div>
              <div className="space-y-6 flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 ring-4 ring-indigo-50/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Founder & Lead Architect
                </div>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{aboutConfig.adminName || 'Sơn Lý Hồng Đức'}</h2>
                  <p className="text-indigo-600 font-bold tracking-widest text-xs uppercase mt-2">BMASS Operating System</p>
                </div>
                <p className="text-slate-500 text-lg leading-relaxed max-w-xl font-medium">
                  {aboutConfig.adminBio || 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-slate-50 py-16 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
            <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Footer Logo" className="h-8 w-auto" />
            <span className="font-black text-sm tracking-tighter">BMASS</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <button onClick={() => navigate('/privacy')} className="hover:text-indigo-600 transition-colors">Bảo mật</button>
            <button onClick={() => navigate('/terms')} className="hover:text-indigo-600 transition-colors">Điều khoản</button>
            <button onClick={() => navigate('/contact')} className="hover:text-indigo-600 transition-colors">Liên hệ</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, ShieldCheck, Zap, Heart, Globe, Cpu, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AboutConfig {
  introTitle: string;
  introDesc: string;
  adminName: string;
  adminBio: string;
  adminPhoto: string;
}

const DEFAULT_ABOUT: AboutConfig = {
  introTitle: "Sơn Lý Hồng Đức Ecosystem",
  introDesc: "Hệ sinh thái Profile chuyên nghiệp All-in-One. Tối ưu trải nghiệm, tinh gọn giao diện và đảm bảo hiệu suất cực hạn.",
  adminName: "Sơn Lý Hồng Đức",
  adminBio: "Xin chào, tôi là Sơn Lý Hồng Đức (Bmass). Với tầm nhìn kiến tạo hệ sinh thái số hiện đại, tôi phát triển nền tảng này để tối ưu hóa quản trị và truyền tải giá trị thực qua từng dòng code. Đơn giản, tinh tế và hiệu quả là tôn chỉ của tôi.",
  adminPhoto: "https://tytpht.hdd.io.vn/img/bmassloadings.png"
};

export default function AboutPage() {
  const [config, setConfig] = useState<AboutConfig>(DEFAULT_ABOUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'about'), (snap) => {
      if (snap.exists()) {
        setConfig({ ...DEFAULT_ABOUT, ...snap.data() } as AboutConfig);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-12 md:space-y-16 pb-20 pt-8 px-4">
      <section className="text-center space-y-4 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <img 
            src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
            alt="Logo" 
            className="w-24 h-24 md:w-32 md:h-32 mx-auto relative z-10 drop-shadow-2xl" 
          />
        </motion.div>
        
        <div className="space-y-3 md:space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-display font-medium tracking-tight text-slate-900 dark:text-white italic leading-[1.1]"
          >
            {config.introTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-bold opacity-70"
          >
            {config.introDesc}
          </motion.p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {[
          { icon: Zap, title: "Tốc độ", desc: "Tối ưu hóa performance cực hạn, phản hồi tức thì với hệ thống Real-time hiện đại.", color: "text-amber-500", bg: "bg-amber-500/5" },
          { icon: ShieldCheck, title: "Bảo mật", desc: "Phân quyền đa tầng, mã hóa đầu cuối đảm bảo an toàn dữ liệu tuyệt đối.", color: "text-emerald-500", bg: "bg-emerald-500/5" },
          { icon: Globe, title: "Toàn cầu", desc: "Hệ sinh thái không giới hạn, kết nối đa nền tảng với độ ổn định 99.9%.", color: "text-blue-500", bg: "bg-blue-500/5" }
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -8 }}
            className={`p-10 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:shadow-2xl hover:shadow-black/[0.02] ${item.bg}`}
          >
            <item.icon className={`w-12 h-12 ${item.color} mb-8`} />
            <h3 className="text-xl md:text-2xl font-medium text-slate-900 dark:text-white mb-3  tracking-tight italic">{item.title}</h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold  tracking-wide opacity-80">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <section className="bg-slate-900 rounded-3xl p-10 lg:p-20 text-white relative overflow-hidden shadow-3xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 md:w-96 md:h-96" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="shrink-0">
             <div className="w-44 h-44 md:w-64 md:h-64 rounded-2xl border-8 border-white/5 bg-white/10 p-2 overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
               <img 
                src={config.adminPhoto} 
                alt="Founder" 
                className="w-full h-full object-contain"
               />
             </div>
          </div>
          
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 px-5 py-2 rounded-2xl text-[10px] font-medium tracking-normal  border border-blue-500/20">
              <User className="w-3.5 h-3.5" /> Sáng lập & Kiến trúc sư chính
            </div>
            <h2 className="text-4xl md:text-8xl font-display font-medium tracking-tight italic leading-[1.1]">
              {config.adminName.split(' ').slice(0, -1).join(' ')} <span className="text-blue-400">{config.adminName.split(' ').slice(-1)}</span>
            </h2>
            <p className="text-sm md:text-xl text-slate-300 max-w-2xl leading-relaxed font-bold opacity-80">
              {config.adminBio}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 px-4 py-2 md:px-5 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3">
                 <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500 fill-red-500" />
                 <span className="font-medium text-[10px] md:text-sm  tracking-normal">Sáng tạo</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 md:px-5 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3">
                 <Zap className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                 <span className="font-medium text-[10px] md:text-sm  tracking-normal">Giám sát 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center text-slate-400 text-xs font-bold  tracking-normal">
        Sơn Lý Hồng Đức © 2026
      </footer>
    </div>
  );
}

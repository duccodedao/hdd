import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Zap, Globe, Cpu, Loader2, ArrowRight, Star, Layers, Sparkles } from 'lucide-react';
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
  introTitle: "Hệ sinh thái Sơn Lý Hồng Đức",
  introDesc: "Hệ sinh thái chuyên nghiệp tất cả trong một. Tối ưu cho hiệu suất cực cao, thẩm mỹ tối giản và độ tin cậy tuyệt đối.",
  adminName: "Sơn Lý Hồng Đức",
  adminBio: "Xin chào, tôi là Sơn Lý Hồng Đức (Bmass). Một nhà thiết kế sản phẩm và kỹ sư full-stack, tận tâm tạo ra những trải nghiệm kỹ thuật số đơn giản, tinh tế và hiệu quả nhất.",
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
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-8 h-8 text-blue-600/50" />
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-32 pt-12 space-y-32">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-12"
        >
          <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full scale-150 animate-pulse" />
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10"
          >
            <img 
              src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
              alt="Brand Identity" 
              className="w-20 md:w-28 drop-shadow-[0_0_40px_rgba(59,130,246,0.3)] filter brightness-0 dark:brightness-100" 
            />
          </motion.div>
        </motion.div>

        <div className="max-w-4xl space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-9xl font-display font-medium tracking-tight text-gradient leading-none italic"
          >
            {config.introTitle}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            {config.introDesc}
          </motion.p>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.6 }}
             className="flex items-center justify-center gap-4"
          >
            <button className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-semibold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/10">
              Bắt đầu ngay <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 border border-slate-200 dark:border-white/10 rounded-full font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Tìm hiểu thêm
            </button>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Zap, label: "Hiệu suất", title: "Phản hồi tức thì", desc: "Được xây dựng với sự tập trung tối đa vào tốc độ. Mọi tương tác đều mang lại cảm giác mượt mà và tức thì.", delay: 0.1 },
          { icon: ShieldCheck, label: "Bảo mật", title: "Quyền riêng tư", desc: "Biện pháp bảo mật đầu cuối hiện đại. Dữ liệu của bạn được cô lập, mã hóa và bảo vệ tuyệt đối.", delay: 0.2 },
          { icon: Sparkles, label: "Thiết kế", title: "Thanh lịch tối giản", desc: "Thẩm mỹ thuần khiết lấy cảm hứng từ sự tối giản. Loại bỏ các chi tiết thừa để các giá trị cốt lõi tỏa sáng.", delay: 0.3 }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: item.delay, duration: 0.6 }}
            className="premium-card group relative overflow-hidden"
          >
            <div className={`p-3 rounded-xl bg-slate-100 dark:bg-white/5 inline-flex mb-8 group-hover:scale-110 transition-transform duration-500`}>
              <item.icon className="w-6 h-6 text-blue-500" />
            </div>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-blue-500">{item.label}</span>
              <h3 className="text-3xl font-display italic">{item.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Admin Showcase */}
      <section className="relative rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none">
          <Layers className="w-[500px] h-[500px]" />
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-16 p-8 md:p-20 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-full" />
            <div className="w-56 h-56 md:w-72 md:h-72 rounded-[2rem] bg-slate-100 dark:bg-white/5 p-3 relative z-10 rotate-2 group-hover:rotate-0 transition-all duration-700 shadow-2xl overflow-hidden ring-4 ring-white dark:ring-white/5">
              <img 
                src={config.adminPhoto} 
                alt="Founder Profile" 
                className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-1000"
              />
            </div>
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-4 -right-4 p-4 glass rounded-2xl shadow-xl z-20 hidden md:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold tracking-tight">SẴN SÀNG CHO DỰ ÁN MỚI</span>
              </div>
            </motion.div>
          </div>

          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/5 dark:bg-blue-500/10 text-blue-500 border border-blue-500/10 rounded-full text-[10px] font-bold tracking-widest uppercase">
              <User className="w-3.5 h-3.5" /> Nhà sáng lập & Kiến trúc sư
            </div>
            
            <h2 className="text-5xl md:text-8xl font-display font-medium tracking-tight italic text-zinc-900 dark:text-white leading-[0.9]">
              {config.adminName.split(' ').slice(0, -1).join(' ')} <span className="text-blue-500">{config.adminName.split(' ').slice(-1)}</span>
            </h2>

            <p className="text-lg md:text-2xl text-slate-500 dark:text-zinc-400 leading-relaxed font-medium max-w-2xl mx-auto lg:mx-0">
              {config.adminBio}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <div className="flex -space-x-3 overflow-hidden">
                {[1,2,3,4].map(i => (
                  <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-slate-200 dark:bg-zinc-800" />
                ))}
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900 bg-blue-500 text-[10px] font-bold text-white uppercase">
                  +1k
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400">Được tin dùng bởi các đối tác và khách hàng trên toàn cầu.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Footer */}
      <footer className="pt-24 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-400">
        <div className="flex items-center gap-3">
          <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Mini Logo" className="w-6 h-6 grayscale" />
          <span className="text-xs font-bold tracking-widest uppercase">Hihi Studio</span>
        </div>
        <div className="flex items-center gap-10 text-[10px] font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-blue-500 transition-colors">Twitter</a>
          <a href="#" className="hover:text-blue-500 transition-colors">GitHub</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Facebook</a>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest">Sơn Lý Hồng Đức © 2026</p>
      </footer>
    </div>
  );
}

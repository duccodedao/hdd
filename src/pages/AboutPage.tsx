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
  introTitle: "Hệ Sinh Thái Personal Profile",
  introDesc: "Đây không chỉ là một website profile thông thường, mà là một nền tảng quản trị cá nhân All-in-One. Được xây dựng trên nền tảng công nghệ Web 5.0, hệ thống mang lại sự kết hợp hoàn hảo giữa tốc độ, bảo mật và trải nghiệm người dùng tinh tế.",
  adminName: "Personal Admin System",
  adminBio: "Xin chào, mình là người đứng sau dự án này. Với niềm đam mê công nghệ và thiết kế, mình đã dành thời gian để kiến tạo nên hệ sinh thái này nhằm mục đích quản lý, chia sẻ và tối ưu hóa workflow cá nhân. Mọi dòng code đều được chăm chút để đạt tới độ hoàn thiện cao nhất.",
  adminPhoto: "https://graph.facebook.com/100028269784534/picture?type=large"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
          >
            {config.introTitle.split(' ').slice(0, -2).join(' ')} <span className="text-blue-600 italic">{config.introTitle.split(' ').slice(-2).join(' ')}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm md:text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed"
          >
            {config.introDesc}
          </motion.p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {[
          { icon: Zap, title: "Tốc độ", desc: "Tối ưu hóa performance, phản hồi tức thì với Real-time Database.", color: "text-amber-500" },
          { icon: ShieldCheck, title: "Bảo mật", desc: "Hệ thống phân quyền đa lớp, bảo vệ dữ liệu tuyệt đối với Firebase Auth.", color: "text-emerald-500" },
          { icon: Globe, title: "Sẵn sàng", desc: "Hoạt động mượt mà trên mọi thiết bị và nền tảng với chuẩn PWA.", color: "text-blue-500" }
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm"
          >
            <item.icon className={`w-8 h-8 md:w-10 md:h-10 ${item.color} mb-4 md:mb-6`} />
            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3 uppercase tracking-tighter">{item.title}</h3>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-bold">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <section className="bg-slate-900 dark:bg-blue-600/10 rounded-[2.5rem] md:rounded-[3rem] p-6 lg:p-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 md:opacity-10">
          <Cpu className="w-48 h-48 md:w-64 md:h-64" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="shrink-0">
             <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 md:border-8 border-white/10 overflow-hidden shadow-2xl scale-110">
               <img 
                src={config.adminPhoto} 
                alt="Admin" 
                className="w-full h-full object-cover"
               />
             </div>
          </div>
          
          <div className="space-y-4 md:space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-2">
              <User className="w-3 h-3" /> System Architect & Founder
            </div>
            <h2 className="text-2xl md:text-5xl font-black tracking-tight">{config.adminName.split(' ').slice(0, -1).join(' ')} <span className="text-blue-400">{config.adminName.split(' ').slice(-1)}</span></h2>
            <p className="text-sm md:text-lg text-slate-300 max-w-2xl leading-relaxed font-medium">
              {config.adminBio}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 px-4 py-2 md:px-5 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3">
                 <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500 fill-red-500" />
                 <span className="font-black text-[10px] md:text-sm uppercase tracking-widest">Sáng tạo</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 md:px-5 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3">
                 <Zap className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                 <span className="font-black text-[10px] md:text-sm uppercase tracking-widest">24/7 Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center text-slate-500 text-sm">
        Built with <span className="text-red-500">♥</span> by Admin System • © 2026
      </footer>
    </div>
  );
}

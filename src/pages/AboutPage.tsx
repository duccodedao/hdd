import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Fingerprint, Activity, Globe, Cpu, Server, Lock, ArrowUpRight, Github, Mail, Facebook, ExternalLink, CheckCircle2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Helmet } from 'react-helmet-async';

interface AboutConfig {
  introTitle: string;
  introDesc: string;
  adminName: string;
  adminBio: string;
  adminPhoto: string;
  facebook?: string;
  github?: string;
  youtube?: string;
  email?: string;
}

const DEFAULT_ABOUT: AboutConfig = {
  introTitle: "Hệ thống Quản trị",
  introDesc: "Giải pháp quản trị bảo mật và định danh số thế hệ mới. Trải nghiệm tối giản, hiệu suất tối ưu.",
  adminName: "Hệ thống",
  adminBio: "Chúng tôi xây dựng những giải pháp công nghệ minh bạch, an toàn và tối ưu cho người dùng.",
  adminPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
  email: "support@system.com"
};

export default function AboutPage() {
  const [config, setConfig] = useState<AboutConfig>(DEFAULT_ABOUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'about'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({ 
          ...DEFAULT_ABOUT, 
          ...data
        } as AboutConfig);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null;

  return (
    <div className="max-w-[1800px] mx-auto py-8 lg:py-32 space-y-20 lg:space-y-32 animate-fade-in no-scrollbar">
      <Helmet>
        <title>Giới thiệu | BMASS Dashboard</title>
        <meta name="description" content="Khám phá hệ sinh thái quản trị bảo mật BMASS." />
      </Helmet>
      
      {/* Hero Section */}
      <section className="relative flex flex-col justify-center min-h-[50dvh] lg:min-h-[60dvh] space-y-8 lg:space-y-12 max-w-4xl">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="inline-flex items-center gap-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full w-fit"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">System Active • v2.4.0</span>
        </motion.div>
 
        <div className="space-y-4 lg:space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-9xl font-display font-medium tracking-tighter text-slate-950 dark:text-white leading-[0.85] italic uppercase"
          >
            {config.introTitle}.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg md:text-2xl text-slate-600 dark:text-zinc-300 font-medium leading-relaxed max-w-2xl"
          >
            {config.introDesc}
          </motion.p>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="flex flex-wrap gap-4 pt-10"
        >
          <button className="px-10 py-5 bg-white hover:bg-zinc-200 text-black rounded-2xl font-bold uppercase tracking-widest transition-all shadow-2xl shadow-white/5 active:scale-95 text-[11px]">
            Khởi tạo ngay
          </button>
          <button className="px-10 py-5 bg-zinc-900/50 hover:bg-zinc-800 text-white border border-white/10 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center gap-3 text-[11px] backdrop-blur-md">
            Khám phá <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </button>
        </motion.div>
      </section>

      {/* Philosophy Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-20 py-20 border-t border-white/5">
        <div className="space-y-8">
           <h2 className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Triết lý thiết kế</h2>
           <h3 className="text-4xl md:text-5xl font-display font-medium text-slate-950 dark:text-white tracking-tighter leading-tight italic">Sự đơn giản là hình thái cuối cùng của sự sành điệu.</h3>
        </div>
        <div className="space-y-12">
            <p className="text-lg text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
              Chúng tôi tin rằng bảo mật không nên là một gánh nặng. Nucleus OS được thiết kế để ẩn đi sự phức tạp, chỉ để lại những gì quan trọng nhất cho trải nghiệm của người dùng.
            </p>
            <div className="grid grid-cols-2 gap-10">
               {[
                 { label: 'Latency', val: '< 50ms' },
                 { label: 'Uptime', val: '99.99%' },
                 { label: 'Encryption', val: 'End-to-End' },
                 { label: 'Nodes', val: 'Global' }
               ].map(stat => (
                 <div key={stat.label} className="space-y-1">
                    <p className="text-2xl font-display font-semibold text-slate-950 dark:text-white tracking-tight">{stat.val}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{stat.label}</p>
                 </div>
               ))}
            </div>
        </div>
      </section>

      {/* Professional Profile */}
      <section className="py-32 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 blur-[150px] pointer-events-none rounded-full" />
        <div className="relative glass-card overflow-hidden rounded-[3rem] p-12 md:p-24 border-white/5 bg-zinc-900/40 backdrop-blur-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
             <div className="space-y-10">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Kiến trúc sư</h4>
                  <h3 className="text-4xl md:text-6xl font-display font-medium text-slate-950 dark:text-white tracking-tighter italic">{config.adminName}.</h3>
                </div>
                <p className="text-xl text-slate-600 dark:text-zinc-300 font-medium leading-relaxed italic border-l-2 border-indigo-500 pl-8 py-2">
                  "{config.adminBio}"
                </p>
                <div className="flex flex-wrap gap-8 pt-6">
                  {[
                    { icon: Facebook, href: config.facebook, label: 'FB' },
                    { icon: Github, href: config.github, label: 'GH' },
                    { icon: Mail, href: config.email ? `mailto:${config.email}` : '#', label: 'EMAIL' }
                  ].map(social => social.href && (
                    <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all group">
                      <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{social.label}</span>
                    </a>
                  ))}
                </div>
             </div>
             <div className="flex justify-center md:justify-end">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-[3rem] overflow-hidden bg-zinc-950 border border-white/10 p-2 shadow-2xl">
                   <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-zinc-900 flex items-center justify-center p-8">
                      <img src={config.adminPhoto} alt={config.adminName} className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all duration-1000" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Tech Footer */}
      <section className="py-20 border-t border-white/5 flex flex-wrap justify-between items-center gap-10 opacity-30">
         <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded bg-white/10 border border-white/10" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Encrypted Infrastructure</span>
         </div>
         <div className="flex gap-12 grayscale">
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" className="h-5" alt="React" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/cf/Firebase_icon.svg" className="h-6" alt="Firebase" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a8/Vitejs-logo.svg" className="h-5" alt="Vite" />
         </div>
      </section>
    </div>
  );
}

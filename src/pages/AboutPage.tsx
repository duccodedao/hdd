import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Fingerprint, Activity } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AboutConfig {
  introTitle: string;
  introDesc: string;
  adminName: string;
  adminBio: string;
  adminPhoto: string;
  facebook?: string;
  github?: string;
  zalo?: string;
  youtube?: string;
  email?: string;
}

const DEFAULT_ABOUT: AboutConfig = {
  introTitle: "Hệ sinh thái Admin Pro",
  introDesc: "Hệ sinh thái chuyên nghiệp tất cả trong một. Thiết kế theo chủ nghĩa tối giản, hiệu năng tối đa và tính bảo mật vượt trội.",
  adminName: "Sơn Lý Hồng Đức",
  adminBio: "Kỹ sư và Nhà thiết kế Hệ thống. Tôi tập trung vào việc kiến tạo những nền tảng có kiến trúc minh bạch, độ tin cậy tuyệt đối và tính thẩm mỹ sắc sảo.",
  adminPhoto: "https://tytpht.hdd.io.vn/img/bmassloadings.png",
  email: "support@admin-pro.com"
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

  if (loading) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 lg:py-24">
      <div className="flex flex-col gap-24">
        
        {/* Header / Hero */}
        <section className="space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-medium tracking-tighter text-white uppercase"
          >
            Về chúng tôi
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row gap-12 items-start justify-between"
          >
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl leading-relaxed">
              {config.introDesc}
            </p>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Zap, label: "Tốc độ", val: "0.1s", desc: "Xử lý tương tác siêu âm" },
            { icon: ShieldCheck, label: "Bảo mật", val: "AES", desc: "Mã hóa đa lớp an toàn" },
            { icon: Fingerprint, label: "Định danh", val: "SSO", desc: "Đăng nhập một chạm" },
            { icon: Activity, label: "Ổn định", val: "99%", desc: "Uptime hệ thống tối đa" }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-white/[0.03] border border-white/[0.05] rounded-2xl flex items-center justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-xl font-medium text-white">{item.label}</h3>
                </div>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
              <span className="text-3xl font-display font-medium text-white/20 group-hover:text-white/60 transition-colors">{item.val}</span>
            </motion.div>
          ))}
        </section>

        {/* Founder Footer */}
        <section className="pt-20 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex items-start gap-6 max-w-2xl">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-1 shrink-0">
              <img src={config.adminPhoto} alt={config.adminName} className="w-full h-full object-contain" />
            </div>
            <div className="space-y-3">
              <h4 className="text-2xl font-display font-medium text-white">{config.adminName}</h4>
              <p className="text-lg text-slate-400 italic leading-relaxed">"{config.adminBio}"</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-6 md:text-right md:items-end">
            <div className="flex flex-wrap gap-6 text-sm font-bold uppercase tracking-widest text-slate-500">
              {config.facebook && <a href={config.facebook} target="_blank" rel="noreferrer" className="hover:text-indigo-400">Facebook</a>}
              {config.github && <a href={config.github} target="_blank" rel="noreferrer" className="hover:text-indigo-400">GitHub</a>}
              {config.zalo && <a href={`https://zalo.me/${config.zalo}`} target="_blank" rel="noreferrer" className="hover:text-indigo-400">Zalo</a>}
              {config.email && <a href={`mailto:${config.email}`} className="hover:text-indigo-400">Email</a>}
            </div>
            <p className="text-xs text-slate-600 font-medium tracking-wider uppercase">©2026 Admin Pro Ecosystem</p>
          </div>
        </section>
      </div>
    </div>
  );
}

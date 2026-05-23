import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, Facebook, MessageCircle, Send, Globe, MapPin, Zap, ExternalLink, X, Loader2, Phone, Hash, Sparkles, ArrowRight, Moon, Sun, Shield } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/appStore';

export default function ContactPage() {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [socialConfig, setSocialConfig] = useState<any>({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'about'));
        if (snap.exists()) {
          setSocialConfig(snap.data());
        }
      } catch (e) {
        console.error("Config fetch failed", e);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return toast.error('Hãy điền đầy đủ các thông tin.');
    
    setIsSending(true);
    try {
      await addDoc(collection(db, 'contact_requests'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      toast.success('Thông điệp đã được gửi đi.');
      setShowRequestModal(false);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error('Gửi tin nhắn thất bại.');
    } finally {
      setIsSending(false);
    }
  };

  const contacts = [
    { 
      name: 'Email hỗ trợ', 
      value: socialConfig.email || 'sonlyhongduc@gmail.com', 
      icon: Mail, 
      url: `mailto:${socialConfig.email || 'sonlyhongduc@gmail.com'}`, 
      color: 'from-blue-500/10 to-indigo-500/10',
      iconColor: 'text-indigo-500',
      desc: 'Technical Support'
    },
    { 
      name: 'Facebook', 
      value: 'Sơn Lý Hồng Đức', 
      icon: Facebook, 
      url: socialConfig.facebook || 'https://facebook.com/your-username', 
      color: 'from-blue-600/10 to-sky-500/10',
      iconColor: 'text-blue-600',
      desc: 'Community & News'
    },
    { 
      name: 'GitHub Repository', 
      value: '@duclsh', 
      icon: Github, 
      url: socialConfig.github || 'https://github.com/duclsh', 
      color: 'from-zinc-500/10 to-slate-500/10',
      iconColor: 'text-zinc-600 dark:text-zinc-400',
      desc: 'Source Control'
    }
  ];

  return (
    <>
    <div className="max-w-[1600px] mx-auto px-6 py-12 lg:py-24 relative min-h-screen">
      {/* Mesh Gradients */}
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-40 z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-indigo-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-blue-500/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-32">
        {/* Modern Split Header */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-4 py-1.5 bg-indigo-50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 rounded-full"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-600 dark:text-indigo-400">Communication Node</span>
            </motion.div>
            
            <div className="space-y-6">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8] uppercase italic text-slate-950 dark:text-white"
              >
                Contact<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-600 italic">Network.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl text-slate-500 dark:text-zinc-400 font-medium leading-relaxed max-w-xl"
              >
                Xây dựng cầu nối vững chắc giữa hệ thống quản trị và người dùng thông qua các giao thức liên lạc bảo mật.
              </motion.p>
            </div>

            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="flex flex-wrap gap-4"
            >
               <button 
                 onClick={() => setShowRequestModal(true)}
                 className="px-10 py-5 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4 group"
               >
                 Gửi yêu cầu <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
               <a 
                 href={`mailto:${socialConfig.email || 'sonlyhongduc@gmail.com'}`}
                 className="px-10 py-5 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-4 group"
               >
                 Email Node <Mail className="w-4 h-4" />
               </a>
            </motion.div>
          </div>

          {/* Vùng Tối System Display */}
          <motion.div 
            initial={{ opacity: 0, rotateY: 15 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="perspective-2000 hidden lg:block"
          >
             <div 
               onClick={toggleDarkMode}
               className={cn(
                 "relative aspect-square rounded-[4rem] border p-12 flex flex-col justify-between transition-all duration-1000 cursor-pointer group hover:scale-[1.02]",
                 darkMode 
                   ? "bg-zinc-950 border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.1)]" 
                   : "bg-white border-slate-200 shadow-[0_0_100px_rgba(0,0,0,0.05)]"
               )}
             >
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center border transition-all duration-700 group-hover:rotate-12",
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}>
                    {darkMode ? <Moon className="w-10 h-10 fill-white" /> : <Sun className="w-10 h-10" />}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", darkMode ? "text-indigo-400" : "text-indigo-600")}>Protocol</span>
                    <span className={cn("text-2xl font-black tracking-tighter italic", darkMode ? "text-white" : "text-black")}>Vùng Tối.</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className={cn("text-4xl font-black tracking-tighter leading-none italic uppercase", darkMode ? "text-white/20" : "text-slate-100")}>
                    Dark Zone<br/>Operating<br/>System
                  </p>
                  <div className="space-y-2">
                    <h3 className={cn("text-3xl font-black tracking-tighter uppercase italic", darkMode ? "text-white" : "text-black")}>Hệ điều hành số.</h3>
                    <p className={cn("text-sm font-medium leading-relaxed max-w-xs", darkMode ? "text-zinc-400" : "text-slate-500")}>
                      Chuyển đổi sang giao diện tối ưu hóa thị giác và tiết kiệm năng lượng cho các phiên làm việc đêm khuya.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={cn("px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest border transition-all", darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black")}>
                    {darkMode ? "Vô hiệu hóa" : "Kích hoạt ngay"}
                  </div>
                  <div className={cn("w-12 h-1 bg-gradient-to-r rounded-full", darkMode ? "from-indigo-500 to-transparent" : "from-black to-transparent")} />
                </div>

                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
             </div>
          </motion.div>
        </section>

        {/* Bento Grid Contacts */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {contacts.map((contact, idx) => (
            <motion.a 
              key={idx}
              href={contact.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[3rem] p-10 transition-all duration-700 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${contact.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10 space-y-8 h-full flex flex-col">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-white/5 transition-all duration-700 group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-black",
                    contact.iconColor
                  )}>
                    <contact.icon className="w-8 h-8" />
                  </div>
                  <div className="p-2.5 rounded-full border border-slate-200 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-45">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <h3 className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic leading-none mb-2">{contact.name}</h3>
                  <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">{contact.desc}</p>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="w-full h-px bg-slate-100 dark:bg-white/5" />
                  <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate">
                    {contact.value}
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </section>

        {/* Support Banner */}
        <section>
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-slate-50 dark:bg-zinc-950 rounded-[4rem] p-12 lg:p-24 overflow-hidden border border-slate-100 dark:border-white/5"
          >
            <div className="absolute top-0 right-0 w-2/3 h-full bg-indigo-500/[0.03] blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-32">
              <div className="space-y-8 flex-1">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/20">
                   <MessageCircle className="w-8 h-8" />
                </div>
                <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-950 dark:text-white italic uppercase leading-[0.9]">
                  Kênh phản hồi <br/> đặc biệt.
                </h2>
                <p className="text-xl text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                  Chúng tôi xử lý các yêu cầu kỹ thuật và đề xuất tính năng mới trong vòng 24 giờ. Hệ thống luôn mở để tiếp nhận mọi ý tưởng sáng tạo.
                </p>
                <div className="flex gap-12 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" /> Phản hồi nhanh
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" /> Bảo mật RSA
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full lg:w-96">
                <button 
                  onClick={() => setShowRequestModal(true)}
                  className="w-full aspect-square rounded-[3rem] bg-indigo-600 hover:bg-slate-950 dark:hover:bg-white dark:hover:text-black text-white p-12 flex flex-col justify-between transition-all duration-500 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-10 group-hover:scale-110 transition-transform duration-1000" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)' , backgroundSize: '100px 100px' }} />
                  <div className="relative z-10 flex justify-end">
                    <ArrowRight className="w-12 h-12 rotate-[-45deg] group-hover:rotate-0 transition-transform duration-500" />
                  </div>
                  <span className="relative z-10 text-4xl font-black tracking-tighter uppercase italic leading-none text-left">Gửi thông điệp<br/>ngay.</span>
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>

    {/* Dispatch Modal (Enhanced) */}
    <AnimatePresence>
      {showRequestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRequestModal(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 p-10 md:p-16 rounded-[4rem] border border-slate-200 dark:border-white/10 shadow-full overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
            
            <button 
              onClick={() => setShowRequestModal(false)}
              className="absolute top-10 right-10 p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-12 space-y-4 relative z-10">
              <div className="w-12 h-1 bg-indigo-600 rounded-full" />
              <h2 className="text-5xl font-black text-slate-950 dark:text-white italic tracking-tighter uppercase leading-none">Liên hệ.</h2>
              <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-[0.3em]">Secure Data Transmission Node</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Tên của bạn</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-16 px-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="Identity"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full h-16 px-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="node@network.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Message Content</label>
                <textarea 
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full p-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                  placeholder="Nội dung truyền tin..."
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isSending}
                className="w-full h-20 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black tracking-[0.2em] uppercase hover:scale-[0.98] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4 group disabled:opacity-50 text-xs"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>Xác nhận truyền tin <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}


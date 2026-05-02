import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, Facebook, MessageCircle, Send, Globe, MapPin, Zap, ExternalLink, X, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function ContactPage() {
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
        console.error("Lỗi khi tải thông tin", e);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return toast.error('Vui lòng điền đủ thông tin');
    
    setIsSending(true);
    try {
      await addDoc(collection(db, 'contact_requests'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      toast.success('Yêu cầu đã được gửi thành công!');
      setShowRequestModal(false);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error('Gửi yêu cầu thất bại.');
    } finally {
      setIsSending(false);
    }
  };

  const contacts = [
    { 
      name: 'Email Support', 
      value: socialConfig.email || 'sonlyhongduc@gmail.com', 
      icon: Mail, 
      url: `mailto:${socialConfig.email || 'sonlyhongduc@gmail.com'}`, 
      color: 'bg-rose-500',
      desc: 'Hỗ trợ kỹ thuật 24/7'
    },
    { 
      name: 'Facebook Page', 
      value: 'Admin System', 
      icon: Facebook, 
      url: socialConfig.facebook || 'https://facebook.com/sonlyhongduc', 
      color: 'bg-blue-600',
      desc: 'Cập nhật tin tức mới nhất'
    },
    { 
      name: 'GitHub Repo', 
      value: '@duclsh', 
      icon: Github, 
      url: socialConfig.github || 'https://github.com/duclsh', 
      color: 'bg-slate-900',
      desc: 'Mã nguồn & Đóng góp'
    },
    { 
      name: 'Zalo Connect', 
      value: socialConfig.zalo || '09xxxxxxxxx', 
      icon: MessageCircle, 
      url: socialConfig.zalo?.startsWith('http') ? socialConfig.zalo : '#', 
      color: 'bg-sky-500',
      desc: 'Liên hệ nhanh qua tin nhắn'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 pt-4">
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowRequestModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Gửi tin nhắn cho Admin</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tên của bạn</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email liên hệ</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nội dung</label>
                  <textarea 
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Tôi muốn hỗ trợ về..."
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSending}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gửi ngay'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-3 md:space-y-4 max-w-2xl mx-auto px-4">
        <motion.div
// ... rest of the file stays same
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest"
        >
          <Zap className="w-3.5 h-3.5" /> Get in Touch
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          Kết nối với <span className="text-blue-600 italic">Admin</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-bold"
        >
          Chúng tôi luôn sẵn sàng lắng nghe mọi thắc mắc từ bạn. 
          Hãy kết nối qua các kênh dưới đây!
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {contacts.map((contact, idx) => (
          <motion.a 
            key={idx}
            href={contact.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col h-full items-center text-center overflow-hidden"
          >
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${contact.color} text-white flex items-center justify-center mb-6 shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
              <contact.icon className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">{contact.name}</h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 px-2">{contact.desc}</p>
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 w-full">
               <span className="text-[10px] md:text-xs font-black text-blue-600 dark:text-blue-400 group-hover:underline uppercase tracking-widest">{contact.value}</span>
            </div>
          </motion.a>
        ))}
      </div>

      <div className="px-4 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative bg-slate-900 dark:bg-blue-600 rounded-[2.5rem] md:rounded-[3rem] p-8 lg:p-16 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="space-y-4 md:space-y-6 text-center lg:text-left flex-1">
              <h2 className="text-2xl lg:text-5xl font-black text-white leading-tight uppercase tracking-tighter">Gửi yêu cầu trực tiếp</h2>
              <p className="text-sm md:text-lg text-slate-300 max-w-xl line-clamp-2 md:line-clamp-none font-medium">Bạn có ý tưởng hay hoặc cần hỗ trợ chuyên sâu? Đừng ngần ngại gửi tin nhắn trực tiếp.</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Vietnam</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Active Worldwide</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowRequestModal(true)}
              className="w-full lg:w-auto shrink-0 bg-white text-slate-900 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-xs md:text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
            >
               <Send className="w-4 h-4 fill-slate-900" /> Nhắn ngay
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

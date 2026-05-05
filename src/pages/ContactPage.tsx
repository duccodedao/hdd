import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, Facebook, MessageCircle, Send, Globe, MapPin, Zap, ExternalLink, X, Loader2, Phone, Hash, Sparkles, ArrowRight } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

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
      name: 'Thư điện tử', 
      value: socialConfig.email || 'sonlyhongduc@gmail.com', 
      icon: Mail, 
      url: `mailto:${socialConfig.email || 'sonlyhongduc@gmail.com'}`, 
      color: 'text-indigo-500',
      desc: 'Hỗ trợ kỹ thuật & quản trị'
    },
    { 
      name: 'Mạng xã hội', 
      value: 'Bmass Profile', 
      icon: Facebook, 
      url: socialConfig.facebook || 'https://facebook.com/sonlyhongduc', 
      color: 'text-blue-600',
      desc: 'Cập nhật tin tức & cộng đồng'
    },
    { 
      name: 'Mã nguồn', 
      value: '@duclsh', 
      icon: Github, 
      url: socialConfig.github || 'https://github.com/duclsh', 
      color: 'text-slate-900 dark:text-white',
      desc: 'Kho lưu trữ & kiến trúc'
    },
    { 
      name: 'Tin nhắn nhanh', 
      value: 'Zalo Connect', 
      icon: MessageCircle, 
      url: socialConfig.zalo?.startsWith('http') ? socialConfig.zalo : '#', 
      color: 'text-sky-500',
      desc: 'Kênh liên lạc khẩn cấp'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 space-y-32">
      
      {/* Immersive Header */}
      <section className="text-center space-y-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 glass rounded-full"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Đã thiết lập kết nối</span>
        </motion.div>
        
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-display font-medium tracking-tight italic leading-none text-gradient"
          >
            Kết nối khoảng <br className="hidden md:block" /><span className="text-blue-500">cách.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 font-medium leading-relaxed"
          >
            Khởi tạo liên kết với hệ thống hạ tầng cốt lõi của chúng tôi. Chúng tôi luôn sẵn sàng lắng nghe bạn.
          </motion.p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {contacts.map((contact, idx) => (
          <motion.a 
            key={idx}
            href={contact.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            className="group glass p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-blue-500/20 transition-all duration-700 flex flex-col h-full items-center text-center shadow-2xl shadow-blue-500/[0.02]"
          >
            <div className={cn(
              "w-20 h-20 rounded-[2rem] glass p-5 flex items-center justify-center mb-8 shadow-2xl transition-transform duration-700 group-hover:scale-110",
              contact.color
            )}>
              <contact.icon className="w-full h-full object-contain" />
            </div>
            <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white mb-2 italic tracking-tight">{contact.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">
              {contact.desc}
            </p>
            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 w-full">
               <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] group-hover:underline">
                 {contact.value}
               </span>
            </div>
          </motion.a>
        ))}
      </section>

      {/* CTA Section */}
      <section>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-slate-900 dark:bg-white rounded-[3rem] p-12 lg:p-24 overflow-hidden border border-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="space-y-8 text-center lg:text-left flex-1">
              <h2 className="text-4xl lg:text-7xl font-display font-medium text-white dark:text-black italic tracking-tight leading-none">
                Gửi phản hồi.
              </h2>
              <p className="text-xl text-slate-400 dark:text-slate-500 font-medium max-w-xl">
                Bạn có ý tưởng hoặc yêu cầu kỹ thuật? Hãy gửi thông điệp trực tiếp để chúng tôi hỗ trợ.
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-white dark:text-black uppercase tracking-widest">Trái Đất / Việt Nam</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-bold text-white dark:text-black uppercase tracking-widest">Toàn cầu</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowRequestModal(true)}
              className="w-full lg:w-auto px-12 h-20 bg-blue-500 text-white rounded-[1.5rem] font-bold tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(59,130,246,0.3)] flex items-center justify-center gap-4 group"
            >
               Gửi ngay <Send className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Dispatch Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass p-10 md:p-14 rounded-[3rem] border border-white/10 shadow-full"
            >
              <button 
                onClick={() => setShowRequestModal(false)}
                className="absolute top-10 right-10 p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-12 space-y-4">
                <h2 className="text-3xl font-display font-medium text-slate-900 dark:text-white italic tracking-tight text-gradient">Gửi thông điệp.</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kênh truyền thông mã hóa</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full h-14 px-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                      placeholder="Nhập tên của bạn"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full h-14 px-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                      placeholder="email@vi_du.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nội dung</label>
                  <textarea 
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full p-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm resize-none"
                    placeholder="Mô tả ý tưởng hoặc yêu cầu của bạn..."
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSending}
                  className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4 group disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Bắt đầu gửi <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" /></>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

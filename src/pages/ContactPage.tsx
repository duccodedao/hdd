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
      value: 'Trang cá nhân', 
      icon: Facebook, 
      url: socialConfig.facebook || 'https://facebook.com/your-username', 
      color: 'text-blue-600',
      desc: 'Cập nhật tin tức & cộng đồng'
    },
    { 
      name: 'Mã nguồn', 
      value: '@duclsh', 
      icon: Github, 
      url: socialConfig.github || 'https://github.com/duclsh', 
      color: 'text-zinc-500 hover:text-white',
      desc: 'Mã nguồn & quy trình'
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
    <>
    <div className="max-w-7xl mx-auto px-6 py-8 lg:py-16 relative min-h-screen">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full animate-blob" />
        <div className="absolute bottom-[20%] left-[5%] w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full animate-blob [animation-delay:3s]" />
      </div>

      <div className="relative z-10 space-y-24">
        {/* Immersive Header */}
        <section className="text-center space-y-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2.5 px-5 py-2 bg-indigo-50/50 backdrop-blur-xl border border-indigo-100 rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-600">Connect with the future</span>
          </motion.div>
          
          <div className="space-y-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl lg:text-8xl font-display font-medium tracking-tighter leading-[0.8] uppercase italic text-slate-950 dark:text-white"
            >
              Contact <br />
              <span className="text-indigo-600 italic">Us.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto"
            >
              Chúng tôi luôn sẵn sàng lắng nghe mọi ý kiến đóng góp, yêu cầu hỗ trợ hoặc đề xuất hợp tác từ phía bạn.
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
              className="group p-10 rounded-[3rem] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-all duration-700 flex flex-col h-full items-center text-center shadow-sm hover:shadow-2xl"
            >
              <div className={cn(
                "w-20 h-20 rounded-[2rem] p-5 flex items-center justify-center mb-8 border border-slate-100 dark:border-white/5 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 bg-slate-50 dark:bg-zinc-950",
                contact.color
              )}>
                <contact.icon className="w-full h-full" />
              </div>
              <h3 className="text-2xl font-display font-medium text-slate-950 dark:text-white mb-2 italic tracking-tight group-hover:text-indigo-400 transition-colors">{contact.name}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-8 leading-relaxed">
                {contact.desc}
              </p>
              <div className="mt-auto pt-8 border-t border-white/5 w-full group-hover:border-indigo-500/20 transition-colors">
                 <span className="text-[10px] font-bold text-zinc-400 group-hover:text-indigo-400 uppercase tracking-[0.2em] break-all">
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
            className="relative bg-slate-900 dark:bg-zinc-900 border border-slate-800 dark:border-white/5 rounded-[3.5rem] p-12 lg:p-24 overflow-hidden text-center lg:text-left shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none blur-3xl" />
            <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none blur-3xl" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="space-y-8 flex-1">
                <h2 className="text-5xl lg:text-7xl font-display font-medium text-white italic tracking-tighter leading-[0.9] uppercase">
                  Gửi phản hồi <br className="hidden lg:block" /> trực tiếp.
                </h2>
                <p className="text-lg md:text-xl text-slate-400 dark:text-zinc-400 font-medium max-w-xl leading-relaxed">
                  Bạn có ý tưởng hoặc yêu cầu kỹ thuật? Hãy gửi thông điệp trực tiếp để chúng tôi hỗ trợ nhanh nhất.
                </p>
                
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-12 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Việt Nam</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Toàn cầu</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowRequestModal(true)}
                className="h-24 px-14 bg-white text-black rounded-[1.5rem] font-bold tracking-[0.2em] uppercase hover:scale-105 active:scale-95 hover:bg-zinc-200 transition-all shadow-2xl shadow-white/5 flex items-center justify-center gap-6 group shrink-0"
              >
                 Bắt đầu gửi <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>
        </section>
      </div>
    </div>

      {/* Dispatch Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 p-10 md:p-14 rounded-[3rem] border border-white/10 shadow-full"
            >
              <button 
                onClick={() => setShowRequestModal(false)}
                className="absolute top-10 right-10 p-3 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-12 space-y-4">
                <h2 className="text-3xl font-display font-medium text-white italic tracking-tight text-gradient">Gửi thông điệp.</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Kênh truyền thông mã hóa</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Họ và tên</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full h-14 px-6 bg-zinc-900 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm text-white placeholder:text-zinc-600"
                      placeholder="Nhập tên của bạn"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Địa chỉ Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full h-14 px-6 bg-zinc-900 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm text-white placeholder:text-zinc-600"
                      placeholder="email@vi_du.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nội dung</label>
                  <textarea 
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full p-6 bg-zinc-900 border border-white/5 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm resize-none text-white placeholder:text-zinc-600"
                    placeholder="Mô tả ý tưởng hoặc yêu cầu của bạn..."
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSending}
                  className="w-full h-16 bg-white text-black rounded-2xl font-bold tracking-[0.2em] uppercase hover:bg-zinc-200 active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-4 group disabled:opacity-50 text-[10px]"
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
    </>
  );
}

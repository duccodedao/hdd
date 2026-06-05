import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, MessageCircle, Send, Globe, Facebook, Github, Clock, ChevronDown, MousePointerClick, ArrowRight, Loader2, Navigation, MessageSquare, AlertCircle, ArrowLeft } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/appStore';

// Form validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  phone: z.string().min(10, 'Số điện thoại không hợp lệ').regex(/^[0-9+]+$/, 'Số điện thoại chỉ bao gồm chữ số'),
  email: z.string().email('Email không đúng định dạng'),
  subject: z.string().min(5, 'Chủ đề quá ngắn'),
  message: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự')
});

type ContactFormValues = z.infer<typeof contactSchema>;

const faqs = [
  {
    question: "Thời gian làm việc của chúng tôi như thế nào?",
    answer: "Chúng tôi hoạt động từ Thứ 2 đến Thứ 6 (08:00 - 17:30) và Thứ 7 (08:00 - 12:00). Hệ thống hỗ trợ trực tuyến vẫn tiếp nhận yêu cầu 24/7."
  },
  {
    question: "Tốc độ phản hồi qua email là bao lâu?",
    answer: "Tất cả các email liên hệ sẽ được đội ngũ chăm sóc khách hàng của chúng tôi ưu tiên xử lý và phản hồi trong vòng tối đa 24 giờ làm việc."
  },
  {
    question: "Tôi có thể đặt lịch hẹn trực tiếp không?",
    answer: "Có, bạn hoàn toàn có thể liên hệ qua Hotline hoặc Zalo để đặt lịch hẹn tham quan và trao đổi công việc trực tiếp tại văn phòng cơ quan."
  },
  {
    question: "Hỗ trợ kỹ thuật có hoạt động 24/7 không?",
    answer: "Hệ thống Hotline hỗ trợ kỹ thuật và Zalo OA của chúng tôi hoạt động 24/7 đối với các trường hợp khẩn cấp liên quan đến gián đoạn dịch vụ."
  }
];

export default function ContactPage() {
  const [socialConfig, setSocialConfig] = useState<any>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema)
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'about'));
        if (snap.exists()) {
          setSocialConfig(snap.data());
        }
      } catch (e) {
        console.error("Config fetch failed", e);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const onSubmit = async (data: ContactFormValues) => {
    try {
      await addDoc(collection(db, 'contact_requests'), {
        ...data,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      toast.success('Gửi thông điệp thành công. Chúng tôi sẽ sớm liên hệ lại với bạn!');
      reset();
    } catch (err) {
      toast.error('Có lỗi xảy ra trong quá trình gửi, vui lòng thử lại sau.');
    }
  };

  const defaultAddress = 'Hẻm 46, Phường Tam Phú, TP. Thủ Đức';
  const addressQuery = socialConfig.address || defaultAddress;
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 relative overflow-hidden transition-colors duration-500 pb-20">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 blur-[150px] rounded-full pointer-events-none translate-x-1/3 translate-y-1/3" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 lg:pt-32">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </button>

        {/* --- HERO SECTION --- */}
        <section className="text-center max-w-3xl mx-auto mb-20 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400">Trực tuyến 24/7</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-6"
          >
            Liên hệ với <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-500">Chúng tôi</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto"
          >
            Hãy cho chúng tôi biết vấn đề của bạn, mọi thắc mắc và yêu cầu sẽ được đội ngũ xử lý một cách nhanh chóng và tận tâm nhất.
          </motion.p>
        </section>

        {/* --- MAIN GRID (INFO + FORM) --- */}
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 mb-24">
          
          {/* Left: Contact Info */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
                Thông tin liên hệ
              </h2>
              
              <div className="space-y-6">
                {/* Info Item */}
                <div className="group flex gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all hover:border-indigo-500/30">
                  <div className="w-12 h-12 shrink-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Văn phòng chính</h3>
                    {loadingConfig ? (
                      <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    ) : (
                      <p className="font-medium">{socialConfig.address || 'Hẻm 46, Phường Tam Phú, TP. Thủ Đức'}</p>
                    )}
                  </div>
                </div>

                <div className="group flex gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30">
                  <div className="w-12 h-12 shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Đường dây nóng</h3>
                    {loadingConfig ? (
                      <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    ) : (
                      <a href={`tel:${socialConfig.phone}`} className="font-medium hover:text-blue-500 transition-colors">{socialConfig.phone || '09xx.xxx.xxx'}</a>
                    )}
                  </div>
                </div>

                <div className="group flex gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all hover:border-rose-500/30">
                  <div className="w-12 h-12 shrink-0 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Email hỗ trợ</h3>
                    {loadingConfig ? (
                      <div className="h-5 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    ) : (
                      <a href={`mailto:${socialConfig.email}`} className="font-medium hover:text-rose-500 transition-colors break-all">{socialConfig.email || 'sonlyhongduc@gmail.com'}</a>
                    )}
                  </div>
                </div>

                <div className="group flex gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all hover:border-amber-500/30">
                  <div className="w-12 h-12 shrink-0 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">Giờ làm việc</h3>
                    <p className="font-medium">Thứ 2 - Thứ 6: 08:00 - 17:30<br/>Thứ 7: 08:00 - 12:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4">Kết nối nhanh</h3>
              <div className="flex flex-wrap gap-3">
                <a 
                  href={socialConfig.zalo || '#'} 
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0068FF]/10 text-[#0068FF] dark:text-[#0068FF] hover:bg-[#0068FF] hover:text-white transition-all font-semibold text-sm border border-[#0068FF]/20"
                >
                  <MessageSquare className="w-4 h-4" /> Zalo
                </a>
                <a 
                  href={socialConfig.facebook || '#'} 
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0866FF]/10 text-[#0866FF] dark:text-[#0866FF] hover:bg-[#0866FF] hover:text-white transition-all font-semibold text-sm border border-[#0866FF]/20"
                >
                  <Facebook className="w-4 h-4" /> Messenger
                </a>
                <a 
                  href={`tel:${socialConfig.phone}`} 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-semibold text-sm border border-emerald-500/20"
                >
                  <Phone className="w-4 h-4" /> Gọi điện
                </a>
              </div>
            </div>

          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
              
              <h2 className="text-2xl font-bold tracking-tight mb-2 relative z-10">Gửi lời nhắn cho chúng tôi</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 relative z-10">Vui lòng điền thông tin chi tiết vào biểu mẫu bên dưới, chúng tôi sẽ sớm liên hệ lại với bạn.</p>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Họ và tên *</label>
                    <input 
                      {...register("name")}
                      className={cn(
                        "w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border outline-none transition-all placeholder:text-slate-400 font-medium",
                        errors.name ? "border-red-500 focus:border-red-500" : "border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      )}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.name && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Số điện thoại *</label>
                    <input 
                      {...register("phone")}
                      className={cn(
                        "w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border outline-none transition-all placeholder:text-slate-400 font-medium",
                        errors.phone ? "border-red-500 focus:border-red-500" : "border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      )}
                      placeholder="09xx xxx xxx"
                    />
                    {errors.phone && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.phone.message}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Email (Tùy chọn)</label>
                    <input 
                      type="email"
                      {...register("email")}
                      className={cn(
                        "w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border outline-none transition-all placeholder:text-slate-400 font-medium",
                        errors.email ? "border-red-500 focus:border-red-500" : "border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      )}
                      placeholder="example@gmail.com"
                    />
                    {errors.email && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Chủ đề *</label>
                    <input 
                      {...register("subject")}
                      className={cn(
                        "w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border outline-none transition-all placeholder:text-slate-400 font-medium",
                        errors.subject ? "border-red-500 focus:border-red-500" : "border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      )}
                      placeholder="Yêu cầu hỗ trợ phần mềm"
                    />
                    {errors.subject && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.subject.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Nội dung chi tiết *</label>
                  <textarea 
                    {...register("message")}
                    rows={5}
                    className={cn(
                      "w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border outline-none transition-all placeholder:text-slate-400 font-medium resize-none",
                      errors.message ? "border-red-500 focus:border-red-500" : "border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                    placeholder="Vui lòng mô tả chi tiết yêu cầu hoặc vấn đề của bạn..."
                  />
                  {errors.message && <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.message.message}</p>}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none group shadow-lg shadow-indigo-500/20"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</>
                  ) : (
                    <>
                       Gửi thông điệp
                       <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* --- GOOGLE MAPS DIRECTORY --- */}
        <div className="mb-24 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/5 relative bg-slate-100 dark:bg-zinc-900 shadow-sm">
          <div className="absolute top-6 left-6 z-10 p-4 rounded-2xl bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl max-w-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="font-bold">Chỉ đường</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{socialConfig.address || defaultAddress}</p>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`} 
              target="_blank" rel="noreferrer"
              className="block w-full py-2.5 text-center bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Mở trên Google Maps
            </a>
          </div>
          <iframe 
            src={mapSrc}
            width="100%" 
            height="500" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            className="filter dark:contrast-[0.9] dark:brightness-75 transition-all"
            title="Google Maps Location"
          />
        </div>

        {/* --- FAQ SECTION --- */}
        <section className="max-w-3xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Câu hỏi thường gặp</h2>
            <p className="text-slate-500 dark:text-zinc-400">Dưới đây là một số giải đáp nhanh cho các thắc mắc phổ biến nhất của người dùng.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "border rounded-2xl transition-all duration-300 overflow-hidden bg-white dark:bg-zinc-900/50",
                  activeFaq === idx ? "border-indigo-500 dark:border-indigo-500/50 shadow-md shadow-indigo-500/5" : "border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                )}
              >
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex items-center justify-between w-full p-6 text-left"
                >
                  <span className="font-semibold">{faq.question}</span>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ml-4",
                    activeFaq === idx ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rotate-180" : "bg-slate-50 dark:bg-zinc-800 text-slate-500"
                  )}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-slate-500 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* --- SOCIAL LINKS --- */}
        <section className="flex flex-col items-center border-t border-slate-200 dark:border-white/5 pt-16">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-8">Theo dõi chúng tôi trên mạng xã hội</p>
          <div className="flex gap-4">
            <a href={socialConfig.facebook || '#'} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-[#0866FF] hover:border-[#0866FF]/30 hover:shadow-lg hover:shadow-[#0866FF]/10 hover:-translate-y-1 transition-all">
              <Facebook className="w-6 h-6" />
            </a>
            <a href={socialConfig.github || '#'} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:dark:text-white hover:border-slate-400 dark:hover:border-white/30 hover:shadow-lg hover:-translate-y-1 transition-all">
              <Github className="w-6 h-6" />
            </a>
            <a href={socialConfig.website || '#'} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1 transition-all">
              <Globe className="w-6 h-6" />
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}



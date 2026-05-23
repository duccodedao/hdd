import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Cpu, ArrowRight, ShieldCheck, Fingerprint, Lock, Globe, Command, Sparkles, Box, CreditCard, ChevronRight, Activity, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import AppLogo from '../components/ui/AppLogo';

const NavItem = ({ children, href }: { children: React.ReactNode; href: string }) => (
  <a 
    href={href} 
    className="text-[12px] font-sans font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-[0.2em]"
  >
    {children}
  </a>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const featuresList = [
    { icon: ShieldCheck, title: "Bảo vệ Danh tính", desc: "Mã hóa sinh trắc học và quản lý định danh số chuẩn Zero-Knowledge.", content: "Hệ thống bảo vệ danh tính nhiều lớp, sử dụng thuật toán mã hóa tối tân AES-256 GCM kết hợp với xác thực sinh trắc học. Dữ liệu định danh được phân mảnh và mã hóa từ thiết bị người dùng (End-to-End Encryption) đảm bảo nguyên tắc Zero-Knowledge: không ai ngoại trừ bạn có thể đọc được dữ liệu." },
    { icon: Zap, title: "Trung tâm AI", desc: "Xử lý dữ liệu, trích xuất văn bản và tự động hóa tác vụ bởi Gemini 3.0 Flash.", content: "Khai thác sức mạnh của mô hình AI Gemini 3.0 Flash để tự động hóa xử lý ngôn ngữ tự nhiên, phân tích văn bản siêu tốc, và tối ưu hóa luồng công việc. Nhận diện hình ảnh và trích xuất dữ liệu thông minh trong một nền tảng hợp nhất." },
    { icon: Globe, title: "Đồng bộ Toàn cầu", desc: "Đồng bộ hóa dữ liệu cá nhân xuyên quốc gia với độ trễ tối thiểu.", content: "Hạ tầng mạng lưới toàn cầu với các trạm máy chủ Edge Computing đặt tại 180+ quốc gia. Đồng bộ dữ liệu xuyên khu vực với độ trễ dưới 0.04ms, cho phép truy cập tài nguyên liên tục và an toàn ở mọi nơi, mọi lúc." },
    { icon: Lock, title: "Két sắt Cá nhân", desc: "Két sắt kỹ thuật số bảo mật chuẩn quân sự AES-256 GCM.", content: "Không gian lưu trữ khép kín dành riêng cho bạn, nơi mọi tập tin, hình ảnh, khóa mật khẩu được cô lập với thế giới bên ngoài. Quy trình mã hóa diễn ra tự động trước khi di chuyển lên không gian lưu trữ đám mây. Bảo vệ tuyệt đối quyền riêng tư." },
    { icon: Activity, title: "Giám sát Thời gian thực", desc: "Theo dõi mọi hoạt động đăng nhập và vị trí thiết bị theo thời gian thực.", content: "Hệ thống Telemetry cao cấp liên tục kiểm tra và ghi nhận các phiên truy cập vào tài khoản của bạn. Nhanh chóng phát hiện các IP đáng ngờ và tự động gửi thông báo phòng hộ, hỗ trợ vô hiệu hóa đăng nhập từ xa ngay lập tức." },
    { icon: Cpu, title: "Hạ tầng Đám mây", desc: "Hệ thống hạ tầng phân tán mạnh mẽ, hỗ trợ mọi quy mô người dùng.", content: "Kiến trúc Serverless kết hợp Microservices giúp mở rộng sức mạnh điện toán một cách linh hoạt không giới hạn. Uptime cam kết 99.9%, tự động chịu lỗi (Fault-Tolerant), mang đến trải nghiệm không gián đoạn trong mọi điều kiện." }
  ];

  return (
    <div className="min-h-screen bg-[#000] text-zinc-400 font-sans selection:bg-[#ff5f00] selection:text-white overflow-x-hidden relative">
      {/* Premium Mastercard-style Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         {/* Overlapping Circles (Mastercard Brand Identity vibe) */}
         <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] max-w-[1200px] bg-gradient-to-br from-[#eb001b]/10 to-transparent rounded-full blur-[120px] opacity-60" />
         <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[1000px] bg-gradient-to-tr from-[#f79e1b]/10 to-transparent rounded-full blur-[100px] opacity-40" />
         
         {/* Global Noise Overlay */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-16 h-20 lg:h-24 flex items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 lg:gap-3 cursor-pointer shrink-0" 
              onClick={() => navigate('/')}
            >
              <AppLogo className="w-8 h-8 lg:w-10 lg:h-10" />
              <span className="font-display font-black text-white text-xl lg:text-2xl tracking-tighter uppercase italic ml-2 lg:ml-4">BMASS.</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden xl:flex items-center gap-12"
            >
              <NavItem href="#features">Đặc quyền</NavItem>
              <NavItem href="#benefits">Lợi ích</NavItem>
              <NavItem href="#contact">Hỗ trợ</NavItem>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 lg:gap-8"
          >
            <button 
                onClick={() => navigate('/login')}
                className="text-[10px] lg:text-[12px] font-bold text-zinc-400 hover:text-white uppercase tracking-[0.25em] transition-colors"
            >
                Đăng nhập
            </button>
            <button 
                onClick={() => navigate('/register')}
                className="group relative px-4 lg:px-8 py-2.5 lg:py-3.5 bg-white text-black rounded-full text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em] lg:tracking-[0.25em] hover:bg-[#ff5f00] hover:text-white transition-all active:scale-95 shadow-xl shadow-white/5 overflow-hidden whitespace-nowrap"
            >
                <span className="relative z-10">Bắt đầu ngay</span>
                <motion.div className="absolute inset-0 bg-[#ff5f00] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-64 lg:pb-64 px-4 lg:px-16 overflow-hidden">
        <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="space-y-8 lg:space-y-12 relative z-10"
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl"
            >
              <div className="relative w-2 h-2 lg:w-3 lg:h-3">
                 <div className="absolute inset-0 bg-[#eb001b] rounded-full animate-ping opacity-40" />
                 <div className="absolute inset-0 bg-[#eb001b] rounded-full" />
              </div>
              <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-[0.2em]">Priceless Security Dashboard • V4.0</span>
            </motion.div>

            <div className="space-y-4 lg:space-y-6">
              <motion.h1 
                variants={{
                  hidden: { opacity: 0, x: -50 },
                  visible: { 
                    opacity: 1, 
                    x: 0,
                    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
                  }
                }}
                className="text-5xl md:text-[8rem] xl:text-[10rem] font-serif font-medium text-white tracking-tighter leading-[0.9] lg:leading-[0.8] italic uppercase"
              >
                Chủ nhân của <br />
                <span className="bg-gradient-to-r from-[#eb001b] via-[#f79e1b] to-[#ff5f00] bg-clip-text text-transparent italic leading-[1.1]">thế giới số.</span>
              </motion.h1>

              <motion.p 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="text-lg md:text-2xl lg:text-3xl text-zinc-400 font-medium leading-snug lg:leading-tight max-w-2xl tracking-normal italic"
              >
                Tận hưởng quyền năng tối thượng với hệ sinh thái quản trị bảo mật quốc tế. Tối giản và sang trọng.
              </motion.p>
            </div>

            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row gap-4 lg:gap-8 pt-4"
            >
              <button 
                onClick={() => navigate('/register')}
                className="group px-8 lg:px-12 py-4 lg:py-6 bg-white text-black rounded-full font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] hover:bg-[#eb001b] hover:text-white transition-all active:scale-95 text-[11px] lg:text-[13px] flex items-center justify-center gap-4 shadow-2xl shadow-white/10"
              >
                SỞ HỮU NGAY <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/utilities')}
                className="px-8 lg:px-12 py-4 lg:py-6 bg-white/5 border border-white/10 text-white rounded-full font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] hover:bg-white/10 transition-all text-[11px] lg:text-[13px] backdrop-blur-xl"
              >
                TRẢI NGHIỆM UTILITIES
              </button>
            </motion.div>

             <motion.div 
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="flex items-center gap-8 lg:gap-12 pt-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000"
             >
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" className="h-8 lg:h-12" alt="Mastercard" referrerPolicy="no-referrer" />
                <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" className="h-6 lg:h-8 object-contain opacity-80" alt="BMASS" referrerPolicy="no-referrer" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-6 lg:h-8" alt="PayPal" referrerPolicy="no-referrer" />
             </motion.div>
          </motion.div>

          {/* Mastercard Premium Card Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex justify-center perspective-[1000px] relative z-10"
          >
            <motion.div 
               animate={{ 
                rotateX: [0, 5, -5, 0],
                rotateY: [0, 5, -5, 0]
               }}
               transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               className="relative w-[500px] aspect-[1.58/1] bg-gradient-to-br from-zinc-800 to-black rounded-[2.5rem] p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/10 overflow-hidden group"
            >
               {/* Card Background Patterns */}
               <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent transform -skew-x-12" />
               </div>

               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className="space-y-2">
                        <div className="w-16 h-12 bg-gradient-to-br from-zinc-500/20 to-zinc-500/5 rounded-lg border border-white/10 flex items-center justify-center">
                           <div className="grid grid-cols-2 gap-1 px-4">
                              <div className="h-6 w-1 bg-white/20 rounded-full" />
                              <div className="h-6 w-1 bg-white/20 rounded-full" />
                           </div>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-500 tracking-[0.3em]">NUCLEUS CORE</p>
                     </div>
                     <div className="flex -space-x-4">
                        <div className="w-16 h-16 bg-[#eb001b] rounded-full opacity-80 backdrop-blur-sm" />
                        <div className="w-16 h-16 bg-[#f79e1b] rounded-full opacity-80 backdrop-blur-sm" />
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-4">
                         <div className="flex gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="text-3xl font-mono text-white tracking-[0.2em] font-medium drop-shadow-lg">••••</div>
                            ))}
                         </div>
                         <div className="flex justify-between items-end">
                            <div className="space-y-1">
                               <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Card Holder</p>
                               <p className="text-lg font-mono text-white tracking-widest font-bold uppercase">SON LY HONG DUC</p>
                            </div>
                            <div className="text-right space-y-1">
                               <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Expires</p>
                               <p className="text-sm font-mono text-white tracking-widest font-bold">12 / 28</p>
                            </div>
                         </div>
                     </div>
                  </div>
               </div>

               {/* Reflective light sweep */}
               <motion.div 
                 animate={{ left: ['-100%', '200%'] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                 className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
               />
            </motion.div>

            {/* Back glow */}
            <div className="absolute inset-0 bg-[#eb001b]/10 blur-[120px] rounded-full -z-10 group-hover:bg-[#f79e1b]/15 transition-all duration-700" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 lg:py-64 px-4 lg:px-16 relative">
         <div className="max-w-[1920px] mx-auto space-y-20 lg:space-y-32">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 lg:gap-16">
               <div className="space-y-4 lg:space-y-8">
                  <h2 className="text-[10px] lg:text-[12px] font-black text-[#eb001b] uppercase tracking-[0.4em] lg:tracking-[0.6em]">Premium Features</h2>
                  <h3 className="text-5xl md:text-9xl font-serif italic text-white leading-[0.9] lg:leading-[0.85] tracking-tighter lowercase">
                     Đặc quyền <br /> <span className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-clip-text text-transparent">vô tận.</span>
                  </h3>
               </div>
               <p className="text-zinc-500 text-lg lg:text-2xl font-medium max-w-xl leading-relaxed italic border-l-2 border-[#f79e1b] pl-6 lg:pl-10">
                  Hệ sinh thái BMASS mang đến những công cụ xử lý dữ liệu và bảo mật cấp cao nhất.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
               {featuresList.map((f, i) => (
                  <motion.div 
                     key={i}
                     onClick={() => setActiveFeature(i)}
                     whileHover={{ y: -8, scale: 1.01 }}
                     className="group p-8 lg:p-12 bg-zinc-950 border border-white/5 rounded-[2rem] lg:rounded-[3rem] hover:border-[#f79e1b]/30 transition-all duration-700 relative overflow-hidden cursor-pointer"
                  >
                     <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                     
                     <div className="space-y-6 lg:space-y-10 relative z-10">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-[1rem] lg:rounded-[1.5rem] bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-black transition-all duration-500">
                           <f.icon className="w-7 h-7 lg:w-9 lg:h-9" />
                        </div>
                        <div className="space-y-3 lg:space-y-4">
                           <h4 className="text-3xl lg:text-4xl font-serif italic text-white tracking-tight leading-none lowercase group-hover:text-[#f79e1b] transition-colors">{f.title}</h4>
                           <p className="text-zinc-500 text-base lg:text-lg font-medium leading-relaxed tracking-tight">{f.desc}</p>
                        </div>
                     </div>

                     <div className="mt-8 lg:mt-12 flex justify-end">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-700 group-hover:text-white group-hover:border-[#f79e1b] transition-all">
                           <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Pricing section disabled */}

      {/* Security Call to Action */}
      <section className="py-32 lg:py-64 px-4 lg:px-16 relative overflow-hidden bg-white rounded-[3rem] lg:rounded-[10rem] mx-4 lg:mx-8 mb-20 lg:mb-32 z-20">
         <div className="absolute top-0 right-0 w-[60%] h-[120%] bg-gradient-to-l from-zinc-100 to-transparent pointer-events-none" />
         <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center relative z-10">
            <div className="space-y-8 lg:space-y-12">
               <div className="space-y-4 lg:space-y-6">
                  <h2 className="text-[10px] lg:text-[12px] font-black text-zinc-400 uppercase tracking-[0.4em] lg:tracking-[0.6em]">Start Your Journey</h2>
                  <h3 className="text-5xl md:text-9xl font-serif italic text-black leading-[0.9] lg:leading-[0.8] tracking-tighter lowercase">Sẵn sàng để <br /> trở thành vĩ đại?</h3>
                  <p className="text-zinc-600 text-lg lg:text-2xl font-medium max-w-xl italic leading-relaxed tracking-tight">Gia nhập cộng đồng người dùng chuyên nghiệp đang làm chủ mọi công cụ ngay hôm nay.</p>
               </div>
               
               <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-8 pt-4 lg:pt-8">
                  <button onClick={() => navigate('/register')} className="w-full sm:w-auto px-10 lg:px-16 py-5 lg:py-8 bg-black text-white rounded-full font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] hover:bg-[#eb001b] transition-all active:scale-95 text-[11px] lg:text-[14px]">Bắt đầu ngay</button>
                  <button onClick={() => navigate('/contact')} className="w-full sm:w-auto px-10 lg:px-16 py-5 lg:py-8 bg-transparent border-2 border-black text-black rounded-full font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] hover:bg-black hover:text-white transition-all text-[11px] lg:text-[14px]">Hỗ trợ kỹ thuật</button>
               </div>
            </div>

            <div className="relative">
               <div className="aspect-video bg-zinc-900 rounded-[2rem] lg:rounded-[4rem] overflow-hidden shadow-2xl relative group">
                   <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-[3s]" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                   <div className="absolute bottom-6 lg:bottom-12 left-6 lg:left-12">
                      <div className="flex items-center gap-4 lg:gap-6">
                         <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                               <ShieldCheck className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                            </motion.div>
                         </div>
                         <div className="space-y-0.5 lg:space-y-1">
                            <p className="text-[8px] lg:text-[10px] font-black text-white uppercase tracking-[0.2em] lg:tracking-[0.3em]">Identity Verified</p>
                            <p className="text-[8px] lg:text-[10px] font-mono text-emerald-400 font-bold uppercase">System_Success_001</p>
                         </div>
                      </div>
                   </div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="max-w-[1920px] mx-auto px-4 lg:px-16 py-20 lg:py-32 border-t border-white/5 relative z-10">
         <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
            <div className="md:col-span-6 space-y-8 lg:space-y-12">
               <div className="flex items-center gap-3 lg:gap-4">
               <AppLogo className="w-8 h-8 lg:w-10 lg:h-10" />
               <span className="font-display font-black text-white text-2xl lg:text-3xl tracking-tighter uppercase italic ml-2">BMASS.</span>
               </div>
               <p className="text-zinc-600 text-lg lg:text-xl font-medium leading-relaxed italic max-w-sm">
                  Lý tưởng được định hình từ khối óc. Bảo mật được đảm bảo bởi BMASS.
               </p>
            </div>

            <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-12">
               <div className="space-y-6 lg:space-y-12">
                  <h4 className="text-[10px] lg:text-[12px] font-black text-white uppercase tracking-[0.4em] lg:tracking-[0.5em]">HỆ THỐNG</h4>
                  <ul className="space-y-4">
                     <li><button onClick={() => navigate('/login')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Quản trị</button></li>
                     <li><button onClick={() => navigate('/utilities')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Tiện ích</button></li>
                     <li><button onClick={() => navigate('/releases')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Cập nhật</button></li>
                  </ul>
               </div>

               <div className="space-y-6 lg:space-y-12">
                  <h4 className="text-[10px] lg:text-[12px] font-black text-white uppercase tracking-[0.4em] lg:tracking-[0.5em]">PHÁP LÝ</h4>
                  <ul className="space-y-4">
                     <li><button onClick={() => navigate('/privacy')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Bảo mật</button></li>
                     <li><button onClick={() => navigate('/terms')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Điều khoản</button></li>
                     <li><button onClick={() => navigate('/policy')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Chính sách</button></li>
                  </ul>
               </div>

               <div className="hidden md:block space-y-6 lg:space-y-12">
                  <h4 className="text-[10px] lg:text-[12px] font-black text-white uppercase tracking-[0.4em] lg:tracking-[0.5em]">KẾT NỐI</h4>
                  <ul className="space-y-4">
                     <li><button onClick={() => navigate('/contact')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Hỗ trợ</button></li>
                     <li><button onClick={() => window.open('https://github.com/sonlyhongduc', '_blank')} className="text-zinc-500 hover:text-white uppercase text-[10px] tracking-widest transition-colors font-bold">Github</button></li>
                  </ul>
               </div>
            </div>

            <div className="md:col-span-4 space-y-6 lg:space-y-12">
               <h4 className="text-[10px] lg:text-[12px] font-black text-white uppercase tracking-[0.4em] lg:tracking-[0.5em]">XÁC THỰC</h4>
               <button 
                  onClick={() => navigate('/login')}
                  className="w-full relative group overflow-hidden bg-white/5 border border-white/10 hover:border-[#eb001b]/50 rounded-2xl px-6 lg:px-8 py-5 lg:py-6 flex items-center justify-center gap-4 transition-all duration-300 active:scale-95"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#eb001b]/10 to-[#f79e1b]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-white font-bold uppercase tracking-widest text-[11px] lg:text-[13px] relative z-10">
                     Đăng nhập với Google
                  </span>
               </button>
               <p className="text-[10px] lg:text-[11px] text-zinc-700 italic">Xác thực một chạm (SSO) để truy cập không gian cá nhân.</p>
            </div>
         </div>

          <div className="mt-12 lg:mt-64 flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-16 pt-12 border-t border-white/5 opacity-50">
            <span className="text-[8px] lg:text-[11px] font-mono font-bold text-zinc-600 uppercase tracking-[0.3em] lg:tracking-[0.4em] text-center lg:text-left">© 2026 BMASS Ecosystem / Nucleus Labs • ALL RIGHTS RESERVED</span>
            <div className="flex gap-8 lg:gap-16 items-center">
               <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" className="h-6 lg:h-10" alt="Mastercard" referrerPolicy="no-referrer" />
               <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" className="h-4 lg:h-6 object-contain opacity-60" alt="BMASS" referrerPolicy="no-referrer" />
            </div>
          </div>
      </footer>

      {/* Feature Details Modal */}
      <AnimatePresence>
         {activeFeature !== null && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-16"
            >
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                  onClick={() => setActiveFeature(null)} 
               />
               <motion.div 
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="relative z-10 w-full max-w-3xl bg-zinc-950 border border-white/10 rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-16 overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f79e1b]/20 to-transparent blur-3xl opacity-50" />
                  
                  <button 
                     onClick={() => setActiveFeature(null)}
                     className="absolute top-6 right-6 lg:top-8 lg:right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors z-20"
                  >
                     <X className="w-5 h-5" />
                  </button>

                  <div className="relative z-10 space-y-8 lg:space-y-12">
                     <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-[1.5rem] lg:rounded-[2rem] bg-zinc-900 border border-white/5 flex items-center justify-center text-[#f79e1b]">
                        {React.createElement(featuresList[activeFeature].icon, { className: "w-10 h-10 lg:w-12 lg:h-12" })}
                     </div>
                     <div className="space-y-6">
                        <h3 className="text-4xl lg:text-6xl font-serif italic text-white tracking-tighter lowercase">{featuresList[activeFeature].title}</h3>
                        <p className="text-zinc-400 text-lg lg:text-2xl font-medium leading-relaxed italic">{featuresList[activeFeature].desc}</p>
                     </div>
                     <div className="h-px w-full bg-white/5" />
                     <p className="text-zinc-300 text-base lg:text-lg leading-loose font-sans">
                        {featuresList[activeFeature].content}
                     </p>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

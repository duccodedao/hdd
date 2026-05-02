import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { 
  TrendingUp, Newspaper, Box, 
  Grid, Zap, ShieldCheck, Cpu, Globe2, 
  ChevronRight, Sparkles, Rocket, 
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Section = ({ children, title, subtitle, icon: Icon, id }: { children: React.ReactNode, title: string, subtitle?: string, icon: any, id?: string }) => (
  <motion.section 
    id={id}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    className="py-32 relative"
  >
    <div className="flex flex-col items-center text-center mb-24 px-4 relative z-10">
      <div className="w-16 h-16 bg-blue-500/10 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20 dark:border-white/10 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]">
        <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
    {children}
  </motion.section>
);

export default function Home() {
  const navigate = useNavigate();
  const { userData } = useAuthStore();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const features = [
    { title: 'Tài chính 4.0', desc: 'Theo dõi thị trường vàng, ngoại tệ và tiền số theo thời gian thực với độ trễ thấp.', icon: TrendingUp, path: '/market', color: 'from-[#00c6ff] to-[#0072ff]' },
    { title: 'Hệ sinh thái Apps', desc: 'Cung cấp công cụ tiện ích, quản lý dữ liệu linh hoạt, tối giản hoá quy trình.', icon: Grid, path: '/utilities', color: 'from-[#667eea] to-[#764ba2]' },
    { title: 'Cập nhật 24/7', desc: 'Dữ liệu được làm mới liên tục với hệ thống notification đa lớp cực kỳ tin cậy.', icon: Newspaper, path: '/news', color: 'from-[#ff0844] to-[#ffb199]' },
    { title: 'Sản phẩm số', desc: 'Khám phá gian hàng bản quyền, nơi trải nghiệm được đặt lên hàng đầu.', icon: Box, path: '/products', color: 'from-[#fbc2eb] to-[#a6c1ee]' },
  ];

  const steps = [
    { number: '01', title: 'Khám phá', desc: 'Truy cập vào không gian lưu trữ và công cụ được tối ưu cho tốc độ.' },
    { number: '02', title: 'Phân tích', desc: 'Tra cứu, lọc dữ liệu và xuất báo cáo trong môi trường an toàn.' },
    { number: '03', title: 'Tối ưu', desc: 'Đồng bộ hóa mọi thao tác giúp nâng cao năng suất công việc.' },
  ];

  return (
    <div className="relative bg-[#f7f8fa] dark:bg-[#0b1020] min-h-screen selection:bg-blue-500/30" ref={containerRef}>
      {/* Premium Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-purple-500/20 dark:bg-purple-600/20 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" />
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-400/20 dark:bg-cyan-500/20 blur-[130px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[70vw] h-[70vw] bg-blue-500/20 dark:bg-blue-600/20 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob animation-delay-4000" />
      </div>

      {/* Hero Section */}
      <motion.div 
        style={{ opacity, scale, y }}
        className="relative min-h-[95vh] flex items-center justify-center pt-28 pb-16 px-4 z-10"
      >
        <div className="max-w-7xl mx-auto text-center space-y-12 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="inline-flex items-center gap-3 px-6 py-2.5 bg-white/40 dark:bg-white/5 text-slate-900 dark:text-white rounded-full text-xs font-bold tracking-[0.2em] uppercase border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl shadow-black/5"
          >
            <Sparkles className="w-4 h-4 text-blue-500" /> 
            Thiết kế cho tương lai
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="text-5xl md:text-8xl lg:text-[7.5rem] font-black tracking-tighter leading-[1] text-slate-900 dark:text-white drop-shadow-sm"
          >
            Trải nghiệm <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-cyan-400 dark:via-blue-500 dark:to-purple-500">
              Vượt Giới Hạn.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="text-slate-600 dark:text-slate-400 text-lg md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed"
          >
            Hệ sinh thái Bmass đem lại cho bạn sức mạnh của dữ liệu, sự mượt mà trong thao tác và vẻ đẹp tĩnh lặng trong thiết kế.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8"
          >
            <button 
              onClick={() => navigate('/market')}
              className="group relative w-full sm:w-auto px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)] overflow-hidden flex items-center justify-center gap-3"
            >
              <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.4,0,0.2,1]" />
              <span className="relative flex items-center gap-3">Bắt đầu <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /></span>
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group w-full sm:w-auto px-10 py-5 bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-900 dark:text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-3"
            >
              Tìm hiểu thêm
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 lg:px-8">
        <Section id="features" title="Sức mạnh tích hợp" subtitle="Những mô-đun chức năng được thiết kế không thoả hiệp về độ hoàn thiện." icon={Grid}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => navigate(feat.path)}
                className="group relative h-[320px] bg-white/60 dark:bg-[#12182b]/60 border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-10 overflow-hidden cursor-pointer backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
              >
                {/* Light Sweep Effect */}
                <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent skew-x-[-25deg] group-hover:animate-sweep pointer-events-none" />
                
                <div className={`absolute -right-20 -bottom-20 w-80 h-80 bg-gradient-to-br ${feat.color} opacity-[0.05] group-hover:opacity-[0.15] rounded-full transition-all duration-700 blur-[80px] pointer-events-none`} />
                <div className={`w-16 h-16 bg-gradient-to-br ${feat.color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-[0.4,0,0.2,1]`}>
                  <feat.icon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 transition-colors relative z-10">{feat.title}</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md relative z-10">{feat.desc}</p>
                <div className="absolute right-10 bottom-10 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 ease-[0.4,0,0.2,1] z-10">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-2xl">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Process Section */}
        <Section title="Vận hành mượt mà" subtitle="Ba bước đơn giản để trải nghiệm một tiêu chuẩn mới về phần mềm." icon={Cpu}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative p-10 bg-white/60 dark:bg-[#12182b]/60 backdrop-blur-2xl rounded-[3rem] border border-slate-200/50 dark:border-white/10 group hover:-translate-y-2 transition-transform duration-500 ease-[0.4,0,0.2,1] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <span className="absolute -top-6 -left-2 text-[8rem] font-black text-slate-100 dark:text-white/5 group-hover:text-blue-500/10 transition-colors duration-500 pointer-events-none select-none">
                  {step.number}
                </span>
                <div className="relative z-10 pt-16">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Security & Reliability */}
        <Section title="Kiến trúc hạ tầng" subtitle="Xây dựng trên nền tảng an toàn, đáp ứng mọi quy chuẩn bảo mật đám mây." icon={Shield}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Mã hoá', title: 'AES-256', icon: ShieldCheck, color: 'text-emerald-500' },
              { label: 'Uptime', title: '99.99%', icon: Zap, color: 'text-amber-500' },
              { label: 'Độ trễ', title: '< 20ms', icon: Cpu, color: 'text-blue-500' },
              { label: 'Truy cập', title: 'Toàn cầu', icon: Globe2, color: 'text-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center bg-white/60 dark:bg-[#12182b]/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 p-10 rounded-[2.5rem] hover:scale-[1.02] transition-transform duration-500 ease-[0.4,0,0.2,1] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <stat.icon className={`w-12 h-12 ${stat.color} mb-6`} />
                <h4 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{stat.title}</h4>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Final CTA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="my-32 bg-slate-900 dark:bg-gradient-to-br dark:from-blue-900 dark:to-indigo-900 rounded-[3.5rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-50 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-10">
            <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-[1.1]">
              Khai phóng sức mạnh <br /> không gian số.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto px-12 py-5 bg-white text-slate-900 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform duration-300 shadow-xl"
              >
                Tạo tài khoản
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="w-full sm:w-auto px-12 py-5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-colors duration-300"
              >
                Trung tâm hỗ trợ
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer minimal info */}
      <footer className="py-16 border-t border-slate-200/50 dark:border-white/10 text-center relative z-20">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          © {new Date().getFullYear()} Bmass Ecosystem. Thiết kế tinh giản.
        </p>
      </footer>
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Settings, 
  User, 
  Newspaper, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  MousePointer2,
  Lock,
  Box,
  LayoutGrid,
  Gift,
  Landmark,
  LineChart,
  Wrench,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const CURR_HOST = window.location.hostname;

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const mainFeatures = [
    {
      title: 'Quản lý DNS & Subdomain',
      desc: 'Sở hữu và cấu hình subdomain hoàn toàn miễn phí trên hạ tầng Bmass HD.',
      icon: <Globe className="w-10 h-10 text-blue-600" />,
      path: '/dns',
      color: 'bg-blue-50',
      tag: 'Cốt lõi'
    },
    {
      title: 'Hệ sinh thái Sản phẩm',
      desc: 'Khám phá danh mục sản phẩm và dịch vụ đa dạng phục vụ cộng đồng.',
      icon: <Box className="w-10 h-10 text-indigo-600" />,
      path: '/products',
      color: 'bg-indigo-50',
      tag: 'Đa dạng'
    },
    {
      title: 'Tài chính & Giao dịch',
      desc: 'Hỗ trợ các công cụ quản lý ngân hàng và sàn giao dịch hiện đại.',
      icon: <LineChart className="w-10 h-10 text-emerald-600" />,
      path: '/exchanges',
      color: 'bg-emerald-50',
      tag: 'Tài chính'
    },
    {
      title: 'Tiện ích & Tính năng',
      desc: 'Tổng hợp các công cụ hỗ trợ web, tối ưu hóa trải nghiệm người dùng.',
      icon: <Wrench className="w-10 h-10 text-orange-600" />,
      path: '/utilities',
      color: 'bg-orange-50',
      tag: 'Công cụ'
    }
  ];

  const secondaryFeatures = [
    {
      title: 'Airdrop & Quà tặng',
      icon: <Gift className="w-5 h-5" />,
      desc: 'Phần thưởng dành cho thành viên tích cực.',
      path: '/airdrop'
    },
    {
      title: 'Ngân hàng số',
      icon: <Landmark className="w-5 h-5" />,
      desc: 'Liên kết và quản lý tài chính thông minh.',
      path: '/banks'
    },
    {
      title: 'Profile Chuyên nghiệp',
      icon: <User className="w-5 h-5" />,
      desc: 'Định danh cá nhân trên không gian số.',
      path: '/profile'
    }
  ];

  return (
    <div className="bg-[#fcfdfe] min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Soft Background Accents */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-blue-50 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-50 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Floating Header Space */}
        <div className="h-16" />

        {/* Hero Section */}
        <section className="pt-20 pb-32 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white shadow-sm border border-slate-100 text-blue-600 rounded-full mb-10"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-medium  tracking-[0.2em]">Hệ sinh thái Bmass HD Pro</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-9xl font-display font-medium tracking-tight leading-[0.9] mb-12 text-slate-900"
            >
              GIẢI PHÁP <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                ĐỊNH DANH SỐ.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-3xl mx-auto text-slate-500 text-lg md:text-2xl font-medium leading-relaxed mb-16 opacity-80"
            >
              Nền tảng cung cấp hạ tầng Subdomain & DNS miễn phí hàng đầu. <br className="hidden md:block" /> 
              Xây dựng thương hiệu cá nhân và quản lý tài chính số trong một hệ sinh thái duy nhất.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-5 justify-center items-center"
            >
              <button 
                onClick={() => navigate(user ? '/dns' : '/register')}
                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
              >
                Khám phá ngay <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-10 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-medium  tracking-normal text-xs hover:border-slate-300 transition-all active:scale-95 shadow-sm"
              >
                Tính năng chi tiết
              </button>
            </motion.div>
          </div>
        </section>


        {/* Main Bento Grid */}
        <section id="features" className="py-20 px-4 max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-medium tracking-tight mb-6">Tính Năng Chủ Chốt</h2>
            <div className="w-24 h-2 bg-blue-600 rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mainFeatures.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                onClick={() => navigate(f.path)}
                className="group p-10 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all cursor-pointer overflow-hidden relative"
              >
                <div className={`absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700`}>
                  {f.icon}
                </div>
                
                <div className="flex justify-between items-start mb-10">
                  <div className={`w-16 h-16 rounded-2xl ${f.color} flex items-center justify-center`}>
                    {f.icon}
                  </div>
                  <span className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-[10px] font-medium  tracking-normal border border-slate-100">
                    {f.tag}
                  </span>
                </div>

                <h3 className="text-3xl font-medium mb-4  tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-lg max-w-md">
                  {f.desc}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-8 mt-auto">
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-xs font-bold text-slate-400  tracking-normal italic group-hover:text-slate-600 transition-colors">Nội dung đã xác minh</span>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-300">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Secondary Grid */}
        <section className="py-20 px-4 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {secondaryFeatures.map((f, i) => (
                    <motion.div 
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => navigate(f.path)}
                        className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 mb-6 transition-colors">
                            {f.icon}
                        </div>
                        <h4 className="font-medium text-sm  tracking-tight mb-2">{f.title}</h4>
                        <p className="text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">{f.desc}</p>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* Brand Bar */}
        <section className="py-24 border-y border-slate-100 bg-white/50">
            <div className="max-w-7xl mx-auto px-4 text-center">
                 <p className="text-[10px] font-medium  tracking-[1em] text-slate-300 mb-8">Được tin dùng bởi cộng đồng</p>
                 <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all">
                     <span className="text-2xl font-medium italic tracking-tight">CLOUDCORE</span>
                     <span className="text-2xl font-medium italic tracking-tight">DNSRIP</span>
                     <span className="text-2xl font-medium italic tracking-tight">PROBMASS</span>
                     <span className="text-2xl font-medium italic tracking-tight">BMASS ECO</span>
                 </div>
            </div>
        </section>

        {/* Quick Help / News Section */}
        <section className="py-32 px-4 max-w-5xl mx-auto text-center">
            <div className="p-16 md:p-24 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-4xl md:text-6xl font-medium mb-8 leading-[1.1]  tracking-tight">Sẵn sàng trải nghiệm <br/> ngay bây giờ?</h2>
                    <p className="text-slate-400 text-lg md:text-xl font-medium mb-12 max-w-xl mx-auto">Chỉ mất 2 phút khởi tạo để bắt đầu hành trình định danh và xây dựng hệ sinh thái của riêng bạn.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button 
                            onClick={() => navigate(user ? '/dns' : '/register')}
                            className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-[10px] hover:bg-white hover:text-slate-900 transition-all flex items-center gap-2"
                        >
                            Đăng ký miễn phí <ArrowRight className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => navigate('/contact')}
                            className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-medium  tracking-normal text-[10px] hover:bg-white/10 transition-all"
                        >
                            Liên hệ hỗ trợ
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <footer className="py-20 border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-medium italic shadow-lg shadow-blue-600/20">B</div>
              <div>
                <span className="font-medium italic text-xl tracking-tight  text-slate-800 leading-none block">Bmass Eco</span>
                <span className="text-[9px] font-medium text-blue-600  tracking-normal">Hệ sinh thái chuyên nghiệp</span>
              </div>
            </div>
            
            <p className="text-[10px] font-medium  tracking-[0.5em] text-slate-400">© 2026 Phát triển bởi Digital Architecture</p>

            <div className="flex gap-10 text-[10px] font-medium  tracking-[0.2em] text-slate-500">
              <button onClick={() => navigate('/about')} className="hover:text-blue-600 transition-colors">Về chúng tôi</button>
              <button onClick={() => navigate('/dns')} className="hover:text-blue-600 transition-colors">Hệ thống</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

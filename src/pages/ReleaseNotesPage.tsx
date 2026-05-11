import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitCommit, Star, Bug, Zap, ArrowLeft, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReleaseNotesPage() {
  const navigate = useNavigate();

  const versions = [
    {
      version: 'v2.4.0',
      date: '09/05/2026',
      changes: [
        { type: 'feature', val: 'Cập nhật thiết kế toàn diện (Premium Dark Mode) cho tất cả các phân hệ giao diện.' },
        { type: 'feature', val: 'Viết lại hoàn toàn kiến trúc của Notification và Quản lý Sản phẩm theo phong cách tối giản.' },
        { type: 'fix', val: 'Sửa lỗi ảnh đại diện phim (poster/thumb) không hiển thị tại lưới Phim và Chi tiết Phim.' },
        { type: 'performance', val: 'Tối ưu độ trễ render ứng dụng và thêm các animation chuyển hướng mượt mà hơn.' }
      ]
    },
    {
      version: 'v2.1.0',
      date: '08/05/2026',
      changes: [
        { type: 'feature', val: 'Ra mắt tính năng Timeline cho lịch sử hoạt động, kiểm tra phiên đăng nhập người dùng.' },
        { type: 'feature', val: 'Quản trị viên có hệ thống CMS (Admin Dashboard) mạnh mẽ hơn.' }
      ]
    },
    {
      version: 'v2.0.0',
      date: '01/05/2026',
      changes: [
        { type: 'feature', val: 'Phát hành BMASS Nucleus OS với kiến trúc Zero-Trust.' },
        { type: 'feature', val: 'Tích hợp Firebase Auth và Firestore Security Rules cấp doanh nghiệp.' },
        { type: 'performance', val: 'Cải thiện TTI (Time to Interactive) xuống dưới 1s trên kết nối ổn định.' }
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-24 relative min-h-screen">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="absolute top-[20%] left-[10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-16">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay lại
        </button>

        <div className="space-y-6">
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400">Changelog & Updates</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-medium tracking-tighter uppercase italic leading-[0.8] text-white"
          >
            Bản Phát Hành.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl leading-relaxed"
          >
            Theo dõi quá trình tiến hóa của hệ sinh thái qua từng phiên bản. Cập nhật cốt lõi (Core Updates) và vá lỗi hệ thống.
          </motion.p>
        </div>

        <div className="relative pl-4 md:pl-0 mt-20">
          {/* Vertical Line */}
          <div className="absolute left-6 md:left-[50%] top-6 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-white/10 to-transparent" />
          
          <div className="space-y-24">
            {versions.map((ver, idx) => (
              <motion.div 
                 key={idx} 
                 initial={{ opacity: 0, y: 40 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, margin: "-100px" }}
                 transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                 className="relative flex flex-col md:flex-row md:justify-between group"
              >
                {/* Node Dot */}
                <div className="absolute left-[3px] md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-zinc-950 border-4 border-indigo-500/20 flex items-center justify-center z-10 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-colors duration-500 shadow-2xl">
                  <div className="w-3 h-3 bg-indigo-400 rounded-full group-hover:scale-150 transition-transform duration-500" />
                </div>
                
                {/* Left Side (Date & Version - Desktop) */}
                <div className="hidden md:block w-1/2 pr-16 text-right pt-2 space-y-2">
                  <h2 className="text-4xl font-display font-bold text-white tracking-tighter italic">{ver.version}</h2>
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{ver.date}</p>
                </div>

                {/* Right Side (Content) */}
                <div className="md:w-1/2 pl-16 md:pl-16 pt-0">
                  <div className="md:hidden space-y-1 mb-6">
                    <h2 className="text-3xl font-display font-bold text-white tracking-tighter italic">{ver.version}</h2>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{ver.date}</p>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl hover:border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-500">
                    <ul className="space-y-6">
                      {ver.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-5">
                          <div className="mt-1 flex-shrink-0">
                            {change.type === 'feature' ? (
                               <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                 <Star className="w-4 h-4 text-indigo-400" />
                               </div>
                            ) : change.type === 'fix' ? (
                               <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                 <Bug className="w-4 h-4 text-rose-400" />
                               </div>
                            ) : (
                               <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                 <Zap className="w-4 h-4 text-emerald-400" />
                               </div>
                            )}
                          </div>
                          <p className="text-zinc-300 font-medium leading-relaxed text-base">{change.val}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="text-center pt-24 pb-8">
           <div className="inline-flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <GitCommit className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Initial Release (Genesis Block)</p>
           </div>
        </div>
      </div>
    </div>
  );
}

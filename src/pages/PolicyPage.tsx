import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, FileText, Lock, Scale, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-24 relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="absolute bottom-[20%] right-[30%] w-[600px] h-[600px] bg-slate-500/10 blur-[130px] rounded-full" />
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
             className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-slate-500/10 border border-slate-500/20 rounded-full"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Governance</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-medium tracking-tighter uppercase italic leading-[0.8] text-slate-950 dark:text-white"
          >
            Chính sách <br/> Hệ thống.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 font-medium max-w-2xl leading-relaxed"
          >
            Các quy tắc vận hành, quản trị tài nguyên và cam kết chất lượng của BMASS đối với cộng đồng người dùng.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[3rem] p-10 shadow-xl">
               <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Scale className="text-indigo-400 w-6 h-6" />
               </div>
               <h3 className="text-2xl font-display italic font-medium text-slate-950 dark:text-white mb-4">Quản trị Tài nguyên</h3>
               <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                 Nền tảng sử dụng kiến trúc serverless linh hoạt. Người dùng được cấp hạn ngạch (quota) dựa trên nhu cầu thực tế và lịch sử hoạt động để tối ưu hóa hiệu năng chung.
               </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[3rem] p-10 shadow-xl">
               <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <UserCheck className="text-emerald-400 w-6 h-6" />
               </div>
               <h3 className="text-2xl font-display italic font-medium text-slate-950 dark:text-white mb-4">Xác thực Định danh</h3>
               <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                 Chúng tôi áp dụng quy chuẩn Multi-Factor Authentication (MFA) cho tất cả các truy cập nhạy cảm. Việc từ chối thiết lập bảo mật có thể dẫn đến hạn chế tính năng.
               </p>
            </div>
          </div>

          <div className="bg-slate-950 p-10 md:p-14 rounded-[4rem] text-white overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
             <div className="relative z-10 space-y-8">
                <h2 className="text-3xl font-display italic font-medium tracking-tight">Cam kết Dịch vụ (SLA)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   <div>
                      <div className="text-4xl font-display font-medium text-indigo-400 mb-2">99.9%</div>
                      <p className="text-zinc-500 font-medium text-sm">Thời gian hoạt động (Uptime) được cam kết cho toàn bộ hạ tầng đám mây.</p>
                   </div>
                   <div>
                      <div className="text-4xl font-display font-medium text-emerald-400 mb-2">&lt;200ms</div>
                      <p className="text-zinc-500 font-medium text-sm">Độ trễ trung bình cho các phản hồi API từ các trung tâm dữ liệu toàn cầu.</p>
                   </div>
                   <div>
                      <div className="text-4xl font-display font-medium text-slate-400 mb-2">24/7</div>
                      <p className="text-zinc-500 font-medium text-sm">Hệ thống giám sát tự động IDS/IPS phát hiện và ngăn chặn xâm nhập thời gian thực.</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="max-w-3xl space-y-10">
             <section className="space-y-4">
                <h3 className="text-xl font-display italic font-medium text-slate-950 dark:text-white">1. Chính sách Sử dụng Hợp lý</h3>
                <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                  BMASS được xây dựng để hỗ trợ công việc và quản trị. Mọi hành vi lạm dụng tài nguyên tính toán (crypto mining, ddos, scanning) đều bị cấm và sẽ bị khóa vĩnh viễn.
                </p>
             </section>
             <section className="space-y-4">
                <h3 className="text-xl font-display italic font-medium text-slate-950 dark:text-white">2. Bảo trì và Cập nhật</h3>
                <p className="text-slate-600 dark:text-zinc-400 font-medium leading-relaxed">
                  Chúng tôi thực hiện cập nhật nóng (hot-patching) liên tục mà không làm gián đoạn người dùng. Các đợt bảo trì lớn sẽ được thông báo trước trên kênh chính thức.
                </p>
             </section>
          </div>
        </motion.div>

        <div className="text-center pt-16 border-t border-slate-200 dark:border-white/5">
           <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Codebase v5.0 | Cập nhật: 2026</p>
        </div>
      </div>
    </div>
  );
}

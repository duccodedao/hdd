import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f7f8fa] dark:bg-[#0b1020] p-6 text-center">
      <div className="relative">
         <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full pointer-events-none" />
         <div className="w-24 h-24 bg-red-100 dark:bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-center mb-8 relative z-10 shadow-xl shadow-red-500/10">
           <AlertTriangle className="w-12 h-12 text-red-500" />
         </div>
      </div>
      <h1 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">404</h1>
      <h2 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">Trang không tồn tại hoặc có lỗi!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-lg text-lg leading-relaxed">
         Chúng tôi không thể tìm thấy trang bạn đang yêu cầu. Địa chỉ có thể đã bị thay đổi, bị xóa, hoặc bạn không có quyền truy cập.
      </p>
      <button 
        onClick={() => navigate(-1)} 
        className="group relative flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.4,0,0.2,1]" />
        <span className="relative flex items-center gap-3"><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Quay lại trang trước</span>
      </button>
    </div>
  );
}

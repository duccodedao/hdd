import { motion } from 'motion/react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ComingSoon({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 relative overflow-hidden">
      {/* Background decoration matching loading screen */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      
      <motion.div 
        initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10"
      >
        <div className="w-24 h-24 mb-8 bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 shadow-2xl flex items-center justify-center mx-auto">
          <Sparkles className="w-12 h-12 text-blue-500" />
        </div>
        <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full"></div>
      </motion.div>

      <div className="relative z-10 max-w-lg">
        <h1 className="text-3xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-400">
          {title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg leading-relaxed">
          Tính năng này đang được phát triển và tối ưu hóa. Chúng tôi sẽ sớm ra mắt phiên bản hoàn thiện nhất. Cảm ơn tài khoản bmassHD đã tin tưởng!
        </p>
        
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition shadow-xl"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Quay lại ngay
        </button>
      </div>
    </div>
  );
}

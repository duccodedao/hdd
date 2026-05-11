import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="absolute top-[20%] left-[10%] w-[600px] h-[600px] bg-rose-500/5 blur-[120px] rounded-full animate-blob" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full animate-blob [animation-delay:2s]" />
      </div>

      <div className="relative z-10 space-y-12 max-w-2xl">
        <div className="relative group">
           <div className="absolute inset-0 bg-rose-500/10 blur-[80px] rounded-full scale-150 group-hover:scale-110 transition-transform duration-1000" />
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-32 h-32 bg-zinc-900 border border-white/5 rounded-[2.5rem] flex items-center justify-center relative z-10 shadow-2xl"
           >
             <AlertTriangle className="w-14 h-14 text-rose-500" />
           </motion.div>
        </div>

        <div className="space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[120px] md:text-[200px] font-display font-medium text-white tracking-tighter uppercase italic leading-[0.7]"
          >
            404.
          </motion.h1>
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
          >
            <h2 className="text-3xl md:text-5xl font-display font-medium text-white mb-6 italic tracking-tight uppercase">Access Denied.</h2>
            <p className="text-zinc-500 font-medium text-lg md:text-xl leading-relaxed max-w-lg mx-auto">
              Hệ thống không thể xác định tài nguyên bạn đang yêu cầu. Địa chỉ có thể đã bị thay đổi, bị xóa, hoặc giao thức của bạn không hợp lệ.
            </p>
          </motion.div>
        </div>

        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate(-1)} 
          className="group relative h-24 px-12 bg-white text-black rounded-[1.5rem] font-bold text-[10px] uppercase tracking-[0.3em] overflow-hidden shadow-2xl active:scale-95 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.4,0,0.2,1]" />
          <span className="relative flex items-center gap-4 group-hover:text-white transition-colors duration-500">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" /> 
            Back to Base
          </span>
        </motion.button>
      </div>
    </div>
  );
}

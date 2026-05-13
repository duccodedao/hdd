import React from 'react';
import { Ghost, ArrowLeft, Home, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-black p-6 text-center relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] bg-rose-500/5 dark:bg-rose-500/5 rounded-full blur-[100px] animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        
        {/* Visual Element */}
        <motion.div
           initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
           animate={{ opacity: 1, scale: 1, rotate: 0 }}
           transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
           className="relative mb-12"
        >
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
            <div className="relative w-32 h-32 lg:w-48 lg:h-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl flex items-center justify-center group overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500/5 to-transparent" />
                <Ghost size={64} className="text-slate-900 dark:text-white group-hover:scale-110 transition-transform duration-700 lg:w-24 lg:h-24" strokeWidth={1.5} />
            </div>
            
            {/* Pulsing Dot */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full border-4 border-slate-50 dark:border-black animate-bounce shadow-lg shadow-rose-500/50" />
        </motion.div>

        <div className="space-y-6 lg:space-y-10">
          <div className="relative">
            <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="text-[120px] md:text-[220px] font-display font-medium text-slate-950 dark:text-white tracking-tighter leading-none select-none opacity-5 dark:opacity-10 absolute left-1/2 -translate-x-1/2 -top-12 md:-top-24 w-full"
            >
                VOID
            </motion.h1>
            <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="relative text-5xl md:text-8xl font-display font-bold text-slate-950 dark:text-white tracking-tight leading-tight uppercase italic"
            >
                Lost in <br/> Space.
            </motion.h2>
          </div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3, duration: 0.8 }}
             className="space-y-4 lg:space-y-6"
          >
            <p className="text-slate-600 dark:text-zinc-400 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
              Bạn đã đi vào một vùng không gian không xác định. Tàu thám hiểm của chúng tôi không tìm thấy dữ liệu tại tọa độ này.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full w-fit mx-auto">
                <Search size={12} /> Error Code: 0x404_NOT_FOUND
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <button 
                onClick={() => navigate(-1)} 
                className="w-full sm:w-auto h-16 px-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" /> 
                Quay lại
            </button>
            <button 
                onClick={() => navigate('/')} 
                className="w-full sm:w-auto h-16 px-10 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20"
            >
                <Home size={16} /> 
                Về trung tâm
            </button>
          </motion.div>
        </div>

        {/* Global Footer in Error Page */}
        <div className="absolute bottom-12 flex flex-col items-center gap-4 opacity-30">
            <div className="flex gap-8 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-500">
                <span>Nucleus OS</span>
                <span>•</span>
                <span>System Protocol Alpha</span>
            </div>
        </div>
      </div>
    </div>
  );
}

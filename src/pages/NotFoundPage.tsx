import React from 'react';
import { Ghost, ArrowLeft, Home, Monitor, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black p-6 text-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[120vw] h-[120vw] bg-gradient-to-br from-indigo-500/10 via-transparent to-rose-500/5 blur-[120px] opacity-50 dark:opacity-40" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-16">
        
        {/* Error Code Display */}
        <div className="relative inline-block">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-[12rem] md:text-[20rem] font-display font-black leading-none tracking-tighter text-slate-900/5 dark:text-white/5 select-none"
          >
            404
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[40px] shadow-2xl flex items-center justify-center group overflow-hidden">
                <ShieldAlert size={48} className="text-rose-500 md:w-16 md:h-16" strokeWidth={1} />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-10">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.3em' }}
              transition={{ delay: 0.8, duration: 1 }}
              className="inline-flex items-center gap-3 px-6 py-2 bg-rose-500/5 border border-rose-500/20 rounded-full"
            >
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase text-rose-500">Address Not Found</span>
            </motion.div>
            
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 1 }}
                className="text-5xl md:text-7xl font-display font-light text-slate-900 dark:text-white tracking-widest uppercase italic"
              >
                Vùng tối <span className="font-bold text-indigo-600 dark:text-indigo-400">BMASS.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="text-slate-400 dark:text-zinc-500 text-lg font-medium max-w-xl mx-auto leading-relaxed italic"
              >
                Liên kết định danh bạn đang truy xuất đã bị ngắt kết nối hoặc không tồn tại trong cấu trúc dữ liệu của BMASS Platform.
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <button 
              onClick={() => navigate(-1)} 
              className="h-16 px-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center gap-3 group shadow-xl shadow-slate-200/50 dark:shadow-none"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
              Quay lại
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="h-16 px-12 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-indigo-500/20"
            >
              <Home size={16} /> 
              Về Trang Chủ
            </button>
          </motion.div>
        </div>

        {/* Technical Metadata */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.8, duration: 1 }}
          className="pt-20 flex flex-col items-center gap-8"
        >
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-zinc-600">
            <span>Protocol: NULL</span>
            <span>•</span>
            <span>Target: {window.location.pathname}</span>
            <span>•</span>
            <span>Ref: {Math.random().toString(36).substring(7).toUpperCase()}</span>
          </div>
          <div className="w-px h-24 bg-gradient-to-b from-slate-200 dark:from-white/10 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}

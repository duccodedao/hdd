import React from 'react';
import { ArrowLeft, Home, Link2Off } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B] p-6 text-center relative overflow-hidden font-sans">
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-10 w-full max-w-2xl px-4">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center relative">
            <div className="absolute inset-0 bg-indigo-400/20 blur-[20px] rounded-full" />
            <Link2Off size={40} className="text-white relative z-10" />
          </div>
          
          <h1 className="text-[120px] font-black leading-none text-white tracking-tighter">404</h1>
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-widest">
              Lạc hướng định tuyến
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang một liên kết khác trên hệ thống.
            </p>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5, duration: 0.5 }}
           className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
        >
          <button 
            onClick={() => navigate(-1)} 
            className="w-full sm:w-auto h-12 px-8 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> 
            Quay lại
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} /> 
            Trang chủ
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="pt-12"
        >
          <div className="h-[1px] w-16 bg-white/10 mx-auto" />
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-6">
            BmassHD Ecosystem
          </p>
        </motion.div>
      </div>
    </div>
  );
}

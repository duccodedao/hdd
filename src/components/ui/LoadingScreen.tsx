import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-[100] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
           animate={{ 
             scale: [1, 1.2, 1],
             opacity: [0.1, 0.2, 0.1],
             x: [0, 50, 0],
             y: [0, 30, 0]
           }}
           transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
           className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-blue-600/30 blur-[150px] rounded-full" 
        />
        <motion.div
           animate={{ 
             scale: [1, 1.1, 1],
             opacity: [0.1, 0.3, 0.1],
             x: [0, -40, 0],
             y: [0, -20, 0]
           }}
           transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
           className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] bg-indigo-600/20 blur-[150px] rounded-full" 
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative group"
        >
          {/* Outer Ring Animation */}
          <div className="absolute -inset-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
          
          <div className="relative w-32 h-32 bg-slate-900/40 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <motion.img 
              src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
              alt="Logo" 
              className="w-full h-full object-contain relative z-10 shadow-inner"
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
        
        <div className="mt-12 flex flex-col items-center space-y-6">
          <div className="flex flex-col items-center space-y-1">
             <h2 className="text-xl font-medium text-white tracking-[0.2em] ">B-MASS PRO</h2>
             <div className="h-0.5 w-12 bg-blue-600 rounded-full" />
          </div>

          <div className="relative w-64 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              animate={{ left: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "40%" }}
            />
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-400 font-bold  tracking-[0.3em] text-[10px]"
          >
            Đang tải hệ sinh thái...
          </motion.p>
        </div>
      </div>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
    </div>
  );
}

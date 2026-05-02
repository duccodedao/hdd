import { motion } from 'motion/react';
import { Hammer, Loader2, Sparkles, ServerCrash } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full text-center relative z-10"
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-10 inline-block"
        >
          <img 
            src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
            alt="Logo" 
            className="w-32 h-32 md:w-40 md:h-40 mx-auto drop-shadow-[0_20px_50px_rgba(59,130,246,0.3)]"
          />
        </motion.div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/20">
            <Hammer className="w-3 h-3" /> System Upgrade In Progress
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
            Hệ thống đang <span className="text-blue-600 dark:text-blue-500 italic">bảo trì</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Chúng tôi đang nâng cấp hệ thống để mang lại trải nghiệm tốt nhất. Vui lòng quay lại sau ít phút.
          </p>

          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-6 py-4 rounded-[2rem] shadow-sm">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Dự kiến hoàn thành: <span className="text-blue-600 dark:text-blue-400 italic">Sớm nhất có thể</span>
              </span>
            </div>
            
            <div className="flex items-center gap-8 text-slate-400 pt-8 opacity-50 grayscale">
               <div className="flex flex-col items-center gap-1">
                 <ServerCrash className="w-6 h-6" />
                 <span className="text-[10px] uppercase font-bold tracking-widest">Server</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                 <Loader2 className="w-6 h-6" />
                 <span className="text-[10px] uppercase font-bold tracking-widest">Update</span>
               </div>
               <div className="flex flex-col items-center gap-1">
                 <Sparkles className="w-6 h-6" />
                 <span className="text-[10px] uppercase font-bold tracking-widest">Optimized</span>
               </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modern Footer Branding */}
      <div className="absolute bottom-10 left-0 w-full text-center">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-white/20">
           Admin Pro Ecosystem • 2026
         </p>
      </div>
    </div>
  );
}

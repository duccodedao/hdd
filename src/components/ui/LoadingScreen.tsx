import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#050508] flex flex-col items-center justify-center z-[100]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <div className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 border border-white/10 shadow-2xl flex items-center justify-center">
            <img 
              src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>
        
        <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="relative w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"
            animate={{ left: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: "50%" }}
          />
        </div>
        <p className="text-slate-400 font-medium tracking-wider text-sm animate-pulse capitalize">
          Đang chuẩn bị hệ sinh thái...
        </p>
      </div>
    </div>
  );
}

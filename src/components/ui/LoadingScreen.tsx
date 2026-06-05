import { motion } from 'motion/react';
import AppLogo from './AppLogo';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[100] transition-colors duration-700">
      <div className="relative flex flex-col items-center">
        
        <motion.div
          initial={{ scale: 0.85, opacity: 0.9 }}
          animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 flex items-center justify-center p-3 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/10 shadow-2xl shadow-indigo-500/10 dark:shadow-none"
        >
          <AppLogo className="w-full h-full" isLoading={true} />
        </motion.div>
        
      </div>
    </div>
  );
}

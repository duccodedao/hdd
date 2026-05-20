import { motion } from 'motion/react';
import AppLogo from './AppLogo';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100] transition-colors duration-700">
      <div className="relative flex flex-col items-center">
        
        {/* Loading Indicator: Zooming Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 flex items-center justify-center p-4 rounded-3xl bg-white shadow-xl shadow-indigo-100"
        >
          <AppLogo className="w-full h-full" isLoading={true} />
        </motion.div>
        
      </div>
    </div>
  );
}

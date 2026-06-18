import { motion } from 'motion/react';
import AppLogo from './AppLogo';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center z-[100] transition-colors duration-700">
      <motion.div
         animate={{ scale: [1, 1.1, 1] }}
         transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
         className="w-24 h-24 flex items-center justify-center"
      >
        <AppLogo className="w-full h-full" isLoading={true} />
      </motion.div>
    </div>
  );
}

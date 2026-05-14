import { motion } from 'motion/react';
import AppLogo from './AppLogo';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center z-[100] transition-colors duration-700">
      <div className="relative flex flex-col items-center space-y-8">
        
        {/* Loading Indicator: Zooming Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 flex items-center justify-center"
        >
          <AppLogo className="w-full h-full" isLoading={true} />
        </motion.div>
        
        <div className="text-center space-y-2">
        </div>
      </div>

      {/* Subtle Bottom Branding */}
      <div className="fixed bottom-12 text-center opacity-10">
      </div>
    </div>
  );
}

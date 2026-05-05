import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center z-[100] transition-colors duration-700">
      <div className="relative flex flex-col items-center space-y-8">
        
        {/* Loading Indicator: Zooming Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 flex items-center justify-center"
        >
          <img 
            src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
            alt="Loading" 
            className="w-full h-full object-contain"
          />
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

import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center z-[100] transition-colors duration-700">
      <div className="relative flex flex-col items-center space-y-8">

        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 relative flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-t-2 border-blue-500 border-r-2 border-r-transparent"
            />
            <div className="w-8 h-8 rounded-full border-2 border-white/5" />
          </div>
          
          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-slate-200">
              Identity Portal
            </h2>
            <div className="flex items-center justify-center gap-1">
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Branding */}
      <div className="fixed bottom-12 text-center opacity-10">
        <p className="text-[8px] font-bold text-white uppercase tracking-[0.3em]">
          Secure Authentication Layer
        </p>
      </div>
    </div>
  );
}

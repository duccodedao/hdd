import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export const OfflineNotification: React.FC = () => {
  const { isOnline } = useAppStore();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md"
        >
          <div className="bg-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-rose-600/30 flex items-center justify-between gap-4 border border-rose-500/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm tracking-tight leading-none">Mất kết nối Internet</p>
                <p className="text-[10px] font-medium opacity-80 mt-1 uppercase tracking-wider">Một số tính năng có thể bị hạn chế</p>
              </div>
            </div>
            <AlertCircle className="w-5 h-5 opacity-40" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

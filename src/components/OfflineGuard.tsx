import React from 'react';
import { WifiOff, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { motion } from 'motion/react';

interface OfflineGuardProps {
  children: React.ReactNode;
  message?: string;
}

export const OfflineGuard: React.FC<OfflineGuardProps> = ({ 
  children, 
  message = "Tính năng này yêu cầu kết nối Internet để đồng bộ với máy chủ." 
}) => {
  const { isOnline } = useAppStore();

  if (!isOnline) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl"
      >
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mb-8">
          <WifiOff className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-display font-medium tracking-tight mb-4 italic">Đang ngoại tuyến</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-10 leading-relaxed font-medium">
          {message}
        </p>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-white/10">
          <ShieldAlert className="w-3.5 h-3.5" />
          Offline Mode Restricted
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
};

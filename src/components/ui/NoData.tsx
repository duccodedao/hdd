import { motion } from 'motion/react';
import { Inbox, LucideIcon } from 'lucide-react';

interface NoDataProps {
  message?: string;
  description?: string;
  icon?: LucideIcon;
}

export default function NoData({ 
  message = "Chưa có dữ liệu", 
  description = "Hiện tại chưa có thông tin nào để hiển thị.",
  icon: Icon = Inbox
}: NoDataProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center py-24 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[3rem]">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mb-6"
      >
        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
          <Icon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="absolute -inset-2 bg-blue-500/10 blur-xl rounded-full"></div>
      </motion.div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{message}</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}

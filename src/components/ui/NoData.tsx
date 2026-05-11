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
    <div className="flex flex-col items-center justify-center p-12 text-center py-32 rounded-[2.5rem] bg-zinc-900 border border-white/5 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/5 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-10"
      >
        <div className="w-20 h-20 rounded-3xl bg-zinc-950 flex items-center justify-center border border-white/5 shadow-lg shadow-black/50 relative z-10 overflow-hidden">
          <Icon className="w-8 h-8 text-zinc-500 group-hover:text-indigo-400 transition-colors duration-500" />
        </div>
        {/* Decorative orbits */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset--4 border border-dashed border-white/10 rounded-full pointer-events-none"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset--8 border border-white/5 rounded-full pointer-events-none"
        />
      </motion.div>

      <div className="space-y-3 relative z-10">
        <h3 className="text-xl font-display font-medium text-white uppercase tracking-[0.2em]">{message}</h3>
        <p className="text-zinc-500 text-sm font-medium max-w-sm mx-auto leading-relaxed px-4">
          {description}
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        className="mt-12 text-[10px] font-bold text-zinc-600 uppercase tracking-widest"
      >
         Hệ thống tối ưu
      </motion.div>
    </div>
  );
}

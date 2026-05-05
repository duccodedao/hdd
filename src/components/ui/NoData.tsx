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
    <div className="flex flex-col items-center justify-center p-12 text-center py-32 rounded-[2.5rem] bg-[#0c0c12]/50 border border-white/5 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/5 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-10"
      >
        <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <Icon className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors duration-500" />
        </div>
        {/* Decorative orbits */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset--4 border border-dashed border-white/5 rounded-full pointer-events-none"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset--8 border border-white/[0.02] rounded-full pointer-events-none"
        />
      </motion.div>

      <div className="space-y-3 relative z-10">
        <h3 className="text-xl font-display font-medium text-white uppercase tracking-[0.2em]">{message}</h3>
        <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto leading-relaxed px-4">
          {description}
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        className="mt-12 text-[10px] font-bold text-slate-700 uppercase tracking-widest"
      >
         Hệ thống tối ưu
      </motion.div>
    </div>
  );
}

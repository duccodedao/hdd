import React from 'react';
import { motion } from 'motion/react';
import { Lock, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface GuestViewProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  hideContent?: boolean;
}

export default function GuestView({ 
  children, 
  title = "Nội dung giới hạn", 
  description = "Vui lòng đăng nhập để xem nội dung này và sử dụng đầy đủ các tính năng của hệ sinh thái.",
  hideContent = false
}: GuestViewProps) {
  const { user } = useAuthStore();

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {/* Blurred Content */}
      <div className={hideContent ? "opacity-0 invisible h-0" : "filter blur-md pointer-events-none select-none opacity-40 transition-all"}>
        {children}
      </div>

      {/* Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-x-0 top-0 bottom-0 flex items-start justify-center z-10 px-6 pt-24"
      >
        <div className="glass-card bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-8 md:p-12 text-center max-w-lg shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Lock className="w-10 h-10 text-blue-600 animate-pulse" />
          </div>

          <h3 className="text-2xl font-medium text-slate-900 dark:text-white  tracking-tight mb-4">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
            {description}
          </p>

          <Link 
            to="/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/20"
          >
            <LogIn className="w-5 h-5" />
            Đăng nhập ngay
          </Link>
          
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-1 w-1 bg-blue-600 rounded-full" />
            <div className="h-1 w-1 bg-blue-600 rounded-full" />
            <div className="h-1 w-1 bg-blue-600 rounded-full" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

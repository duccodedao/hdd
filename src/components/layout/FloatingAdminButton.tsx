import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../lib/utils';

export default function FloatingAdminButton() {
  const { isSuperAdmin, isAdmin, userData } = useAuthStore();
  const { hasUnapprovedSessions } = useAppStore();
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin');

  if (!isSuperAdmin && !isAdmin && userData?.role !== 'review') return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[1000]"
    >
      <NavLink
        to={isAdminPage ? "/" : "/admin"}
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300",
          isAdminPage 
            ? "bg-slate-900/90 text-white border-white/10 shadow-black/40"
            : hasUnapprovedSessions
              ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-rose-500/40"
              : "bg-amber-500/90 hover:bg-amber-500 text-white border-amber-400 shadow-amber-500/30"
        )}
      >
        {isAdminPage ? (
          <ArrowLeft className="w-5 h-5" />
        ) : (
          <Shield className={cn("w-5 h-5", hasUnapprovedSessions && "animate-bounce")} />
        )}
        <span className="text-xs font-bold uppercase tracking-wider">
          {isAdminPage ? "Quay lại" : "Admin Center"}
        </span>
        
        {!isAdminPage && hasUnapprovedSessions && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        )}
      </NavLink>
    </motion.div>
  );
}

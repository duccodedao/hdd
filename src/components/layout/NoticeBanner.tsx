import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Info, AlertTriangle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

export default function NoticeBanner() {
  const [notice, setNotice] = useState<{
    text: string;
    type: 'info' | 'warning' | 'error';
    active: boolean;
    id: string;
  } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'notice'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.active) {
          setNotice({
            text: data.text || '',
            type: data.type || 'info',
            active: data.active,
            id: data.id || 'default'
          });
          
          // Check if hidden in localStorage
          const hideUntil = localStorage.getItem(`hide_notice_${data.id}`);
          if (!hideUntil || Date.now() > parseInt(hideUntil)) {
            setVisible(true);
          }
        } else {
          setNotice(null);
          setVisible(false);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    // Hide for 4 hours by default if user dismisses
    const hideTime = Date.now() + (4 * 60 * 60 * 1000);
    if (notice) {
      localStorage.setItem(`hide_notice_${notice.id}`, hideTime.toString());
    }
  };

  if (!notice || !visible) return null;

  const Icons = {
    info: Info,
    warning: AlertTriangle,
    error: Bell
  };

  const Icon = Icons[notice.type];

  return (
    <AnimatePresence>
      {notice && visible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl"
        >
          <div className="relative group overflow-hidden bg-white/[0.03] backdrop-blur-3xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 md:p-6">
            {/* Ambient Background Glow */}
            <div className={cn(
              "absolute inset-0 opacity-10 pointer-events-none",
              notice.type === 'info' ? "bg-blue-500" : notice.type === 'warning' ? "bg-amber-500" : "bg-rose-500"
            )} />
            
            <div className="relative flex items-center gap-5">
              {/* Type Indicator Icon */}
              <div className={cn(
                "hidden sm:flex shrink-0 w-14 h-14 rounded-2xl items-center justify-center shadow-lg",
                notice.type === 'info' ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : notice.type === 'warning' ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" : "bg-rose-600/20 text-rose-400 border border-rose-500/20"
              )}>
                <Icon className="w-7 h-7" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    notice.type === 'info' ? "text-blue-400" : notice.type === 'warning' ? "text-amber-400" : "text-rose-400"
                  )}>
                    {notice.type === 'info' ? 'Thông báo hệ thống' : notice.type === 'warning' ? 'Cảnh báo' : 'Thông tin quan trọng'}
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <p className="text-sm md:text-base font-medium text-white/90 leading-relaxed italic">
                  {notice.text}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button 
                  onClick={handleDismiss}
                  className="p-2 sm:p-3 hover:bg-white/10 rounded-xl transition-all group/close"
                  aria-label="Đóng thông báo"
                >
                  <X className="w-5 h-5 text-white/50 group-hover/close:text-white transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

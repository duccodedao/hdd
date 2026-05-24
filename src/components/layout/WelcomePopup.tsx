import React, { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X, Check } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export default function WelcomePopup() {
  const [config, setConfig] = useState({
    popupActive: false,
    popupTitle: '',
    popupMessage: ''
  });

  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // 1. Listen to the system config real-time
    const unsub = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists() && snap.data().notificationConfig) {
        const nc = snap.data().notificationConfig;
        const currentTitle = nc.popupTitle || 'Thông báo hệ thống';
        const currentMessage = nc.popupMessage || '';

        setConfig({
          popupActive: !!nc.popupActive,
          popupTitle: currentTitle,
          popupMessage: currentMessage
        });

        // 2. Open popup if popup is active, message has content, and this specific config hasn't been dismissed yet
        const fingerprint = `${currentTitle}:::${currentMessage}`;
        const dismissedFingerprint = localStorage.getItem('dismissed_welcome_popup');

        if (nc.popupActive && currentMessage && dismissedFingerprint !== fingerprint && !(window as any).__welcomePopupDismissed) {
          setIsOpen(true);
        }
      }
    }, (err) => {
      console.error("WelcomePopup real-time listener error:", err);
      if (err?.message?.includes('quota') || (err as any)?.code === 'resource-exhausted') {
        useAppStore.getState().setQuotaExceeded(true);
      }
    });

    return () => unsub();
  }, []);

  const handleClose = (forceDismissPermanently: boolean = false) => {
    setIsOpen(false);
    (window as any).__welcomePopupDismissed = true;
    
    // Store in localStorage only if checked "dontShowAgain" or explicitly forced
    if (dontShowAgain || forceDismissPermanently) {
      const fingerprint = `${config.popupTitle}:::${config.popupMessage}`;
      localStorage.setItem('dismissed_welcome_popup', fingerprint);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && config.popupActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Glass backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleClose(false)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl overflow-hidden z-10 flex flex-col gap-6"
          >
            {/* Ambient glows behind the welcome banner */}
            <div className="absolute top-0 left-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[40px] pointer-events-none" />

            {/* Header with Icon and Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Megaphone className="w-6 h-6 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="font-extrabold text-[#111] dark:text-white text-base leading-snug tracking-tight">
                  {config.popupTitle}
                </h4>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Thông Báo Mở Đầu Trang</p>
              </div>
              <button
                onClick={() => handleClose(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popup Scrollable Content */}
            <div className="max-h-[30vh] overflow-y-auto pr-1 no-scrollbar col-span-2">
              <p className="text-slate-600 dark:text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-text">
                {config.popupMessage}
              </p>
            </div>

            {/* Footer with elegant dismiss button & checkbox */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
              {/* Checkbox option */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors py-1">
                <input 
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-transparent outline-none cursor-pointer"
                />
                <span className="text-[11px] font-bold uppercase tracking-wider">Không hiển thị lại</span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ring-2 ring-indigo-500/20"
                >
                  <Check className="w-4.5 h-4.5" /> Đồng ý
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

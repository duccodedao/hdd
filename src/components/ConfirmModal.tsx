import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'info'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10"
          >
            <div className="p-8">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                type === 'danger' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500" :
                type === 'warning' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500" :
                "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
              )}>
                <AlertCircle size={28} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight italic">
                {title}
              </h3>
              <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 leading-relaxed mb-8">
                {message}
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "flex-1 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95",
                    type === 'danger' ? "bg-rose-600 shadow-rose-500/20 hover:bg-rose-700" :
                    type === 'warning' ? "bg-amber-600 shadow-amber-500/20 hover:bg-amber-700" :
                    "bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

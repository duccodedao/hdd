import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNotificationStore, Notification } from '../../store/notificationStore';

interface NotificationModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationModal({ notification, isOpen, onClose }: NotificationModalProps) {
  const { readNotificationIds, markAsRead, markAsUnread } = useNotificationStore();

  if (!notification) return null;

  const isRead = readNotificationIds.includes(notification.id);

  const handleToggleRead = async () => {
    if (isRead) {
      await markAsUnread(notification.id);
    } else {
      await markAsRead(notification.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-zinc-950/60 backdrop-blur-sm">
          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-150 dark:border-white/5 flex items-start justify-between bg-gradient-to-r from-indigo-50/20 to-transparent dark:from-indigo-500/5">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2 py-0.5 rounded">
                  Hệ thống thông báo
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                  {notification.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata bar */}
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-zinc-950/20 border-b border-slate-150 dark:border-white/5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-zinc-500 font-medium">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Người gửi: {notification.senderName || 'Hệ thống'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[350px] text-slate-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {notification.message}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 border-t border-slate-150 dark:border-white/5 flex items-center justify-between">
              <button
                onClick={handleToggleRead}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                {isRead ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-450" />
                    Đánh dấu chưa đọc
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    Đánh dấu đã đọc
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Đóng lại
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export { NotificationModal };

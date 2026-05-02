import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toSafeDate } from '../lib/utils';
import { vi } from 'date-fns/locale';
import { useAuthStore } from '../store/authStore';

interface NotificationData {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  readBy: string[]; // array of UIDs
  iconType?: string;
}

import NoData from '../components/ui/NoData';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [activeItem, setActiveItem] = useState<NotificationData | null>(null);

  useEffect(() => {
    // In actual production, add pagination via query config.
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: NotificationData[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as NotificationData);
      });
      setNotifications(msgs);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string, readBy: string[]) => {
    if (!user || readBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, 'notifications', id), {
        readBy: [...(readBy || []), user.uid]
      });
    } catch (e) {
      console.error('Failed to mark read', e);
    }
  };

  const handleOpenDetail = (item: NotificationData) => {
    setActiveItem(item);
    if (!item.readBy?.includes(user?.uid || '')) {
      markAsRead(item.id, item.readBy || []);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    let count = 0;
    notifications.forEach(n => {
      if (!n.readBy?.includes(user.uid)) {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { readBy: [...(n.readBy || []), user.uid] });
        count++;
      }
    });
    if (count > 0) await batch.commit();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 pb-20 pt-4">
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveItem(null)}
              className="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                  <Bell className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                {activeItem.title}
              </h2>
              <div className="text-xs text-slate-500 mb-6">
                {activeItem.createdAt ? format(toSafeDate(activeItem.createdAt), 'dd MMMM yyyy, HH:mm', { locale: vi }) : ''}
              </div>
              
              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {activeItem.content}
              </div>

              <div className="mt-8 text-right">
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-5 py-2.5 rounded-xl font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Thông báo</h1>
          <p className="text-slate-500 text-lg">Cật nhật những thông tin mới nhất từ hệ thống.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 bg-blue-500/5 px-4 py-2 rounded-xl transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          Đọc tất cả
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <NoData 
              message="Chưa có thông báo" 
              description="Hiện tại không có thông báo nào dành cho bạn. Hãy quay lại sau!"
              icon={Bell}
            />
          ) : (
            notifications.map((item, idx) => {
              const isRead = item.readBy?.includes(user?.uid || '');
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl relative overflow-hidden transition-all ${isRead ? 'opacity-70 grayscale-[0.3]' : 'shadow-md border-l-4 border-l-blue-500'}`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${isRead ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-blue-500/20 text-blue-500'}`}>
                      <Bell className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-base font-bold truncate pr-4 ${isRead ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                          {item.title}
                        </h3>
                        <span className="text-xs text-slate-400 whitespace-nowrap pt-1">
                          {item.createdAt ? format(toSafeDate(item.createdAt), 'dd/MM, HH:mm') : ''}
                        </span>
                      </div>
                      <p className={`text-sm mb-3 line-clamp-2 ${isRead ? 'text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.content}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        {!isRead && (
                          <button 
                            onClick={() => markAsRead(item.id, item.readBy || [])}
                            className="text-xs font-semibold text-blue-500 hover:text-blue-700 uppercase tracking-wider"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenDetail(item)}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 group"
                        >
                          Xem chi tiết <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

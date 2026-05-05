import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, where, or } from 'firebase/firestore';
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
  targetUserId?: string | null;
}

import NoData from '../components/ui/NoData';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [activeItem, setActiveItem] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Query for global notifications (targetUserId null or 'all') and personal ones
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: NotificationData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as NotificationData;
        // Client-side filtering as 'or' with different fields + orderBy is complex in Firestore
        if (!data.targetUserId || data.targetUserId === 'all' || data.targetUserId === user.uid) {
          msgs.push({ id: doc.id, ...data });
        }
      });
      setNotifications(msgs);
    });

    return () => unsubscribe();
  }, [user]);

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
    <div className="max-w-3xl mx-auto px-4 lg:px-8 pb-20 pt-4 relative">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none mix-blend-screen opacity-40">
        <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-purple-600/20 blur-[150px] rounded-full" />
      </div>

      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/[0.05] border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 backdrop-blur-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <Bell className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-2 -mr-2 -mt-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-white mb-2 leading-snug drop-shadow-md">
                {activeItem.title}
              </h2>
              <div className="text-xs text-white/40 mb-6 font-medium uppercase tracking-wider">
                {activeItem.createdAt ? format(toSafeDate(activeItem.createdAt), 'dd MMMM yyyy, HH:mm', { locale: vi }) : ''}
              </div>
              
              <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                {activeItem.content}
              </div>

              <div className="mt-8 text-right">
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-12 relative z-10">
        <div>
          <h1 className="text-5xl md:text-[6rem] font-display font-medium text-white tracking-tighter uppercase leading-[0.9] mb-4 drop-shadow-2xl">
            Trung tâm <br/>
            <span className="text-stroke text-transparent" style={{ WebkitTextStroke: '1px currentColor' }}>Thông báo</span>
          </h1>
          <p className="text-white/60 text-lg font-medium max-w-lg drop-shadow-md">Cập nhật tin tức quan trọng và biến động hệ thống thao tác thời gian thực.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3.5 rounded-2xl transition-all h-fit backdrop-blur-md shadow-xl"
        >
          <CheckCircle2 className="w-4 h-4" />
          Đọc tất cả
        </button>
      </div>

      <div className="space-y-4 relative z-10">
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
                  className={`bg-white/[0.03] backdrop-blur-xl border p-5 rounded-3xl relative overflow-hidden transition-all duration-300 hover:bg-white/[0.05] ${isRead ? 'opacity-70 border-white/5 grayscale-[0.2]' : 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-white/10 border-l-4 border-l-blue-500 hover:shadow-[0_15px_40px_rgba(59,130,246,0.1)]'}`}
                >
                  <div className="flex gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-inner ${isRead ? 'bg-white/5 text-white/30 border-white/5' : 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
                      <Bell className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`text-base font-bold truncate pr-4 ${isRead ? 'text-white/50' : 'text-white drop-shadow-sm'}`}>
                          {item.title}
                        </h3>
                        <span className="text-[10px] font-bold tracking-wider text-white/40 whitespace-nowrap pt-1 uppercase">
                          {item.createdAt ? format(toSafeDate(item.createdAt), 'dd/MM, HH:mm') : ''}
                        </span>
                      </div>
                      <p className={`text-sm mb-4 line-clamp-2 ${isRead ? 'text-white/40' : 'text-white/70'}`}>
                        {item.content}
                      </p>
                      
                      <div className="flex items-center gap-6">
                        {!isRead && (
                          <button 
                            onClick={() => markAsRead(item.id, item.readBy || [])}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Đánh dấu đã đọc
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenDetail(item)}
                          className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest flex items-center gap-1 group transition-colors"
                        >
                          Xem chi tiết <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell, CheckCircle2, ChevronRight, X, Shield, Info, MapPin, Zap, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toSafeDate, cn } from '../lib/utils';
import { vi } from 'date-fns/locale';
import { useAuthStore } from '../store/authStore';
import NoData from '../components/ui/NoData';
import toast from 'react-hot-toast';

interface NotificationData {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  readBy: string[];
  type: 'system' | 'security' | 'location';
  priority?: 'low' | 'medium' | 'high';
  targetUserId?: string | null;
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'security' | 'location'>('all');
  const [activeItem, setActiveItem] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: NotificationData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as NotificationData;
        if (!data.targetUserId || data.targetUserId === 'all' || data.targetUserId === user.uid) {
          msgs.push({ id: doc.id, ...data });
        }
      });
      setNotifications(msgs);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  const markAsRead = async (id: string, readBy: string[]) => {
    if (!user || readBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, 'notifications', id), {
        readBy: [...(readBy || []), user.uid]
      });
    } catch (e) {
      console.error(e);
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
    if (count > 0) {
      await batch.commit();
      toast.success(`Đã đánh dấu ${count} thông báo là đã đọc`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-5 h-5" />;
      case 'location': return <MapPin className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'security': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'location': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 lg:py-16 relative min-h-screen">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] left-[5%] w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-16">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-display font-medium tracking-tighter uppercase italic leading-[0.85] text-white"
            >
              Thông báo.
            </motion.h1>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.2em]">Cập nhật trạng thái hệ thống thời gian thực</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900/50 rounded-2xl border border-white/10">
             {([
               { id: 'all', label: 'Tất cả' },
               { id: 'system', label: 'Hệ thống' },
               { id: 'security', label: 'Bảo mật' }
             ] as const).map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={cn(
                   "px-5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all",
                   activeTab === tab.id ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-white"
                 )}
               >
                 {tab.label}
               </button>
             ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-4">
           {notifications.length > 0 && (
              <div className="flex justify-end mb-4">
                 <button 
                   onClick={markAllRead}
                   className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-2"
                 >
                   <CheckCircle2 className="w-3.5 h-3.5" /> Đánh dấu tất cả đã đọc
                 </button>
              </div>
           )}

           <AnimatePresence mode="popLayout">
              {filteredNotifications.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <NoData 
                    message="Không có thông báo" 
                    description="Thời điểm hiện tại chưa có thông báo nào dành cho bạn trong mục này."
                  />
                </motion.div>
              ) : (
                filteredNotifications.map((n, idx) => {
                  const isRead = n.readBy?.includes(user?.uid || '');
                  return (
                    <motion.div
                      layout
                      key={n.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setActiveItem(n);
                        markAsRead(n.id, n.readBy || []);
                      }}
                      className={cn(
                        "group p-6 md:p-8 rounded-[2.5rem] bg-zinc-900 border transition-all duration-500 cursor-pointer flex gap-6 md:gap-8 items-center",
                        isRead 
                          ? "opacity-60 border-white/5 grayscale-[0.2]" 
                          : "border-white/10 hover:border-indigo-500/30 hover:bg-zinc-800 hover:shadow-2xl hover:shadow-black/50"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 md:w-20 md:h-20 rounded-[2rem] flex items-center justify-center border transition-all duration-500 flex-shrink-0",
                        getColor(n.type),
                        !isRead && "shadow-inner"
                      )}>
                        {getIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                           <h3 className={cn(
                             "text-lg md:text-xl font-medium truncate italic uppercase tracking-tight",
                             isRead ? "text-zinc-500" : "text-white"
                           )}>{n.title}</h3>
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                             {n.createdAt && format(toSafeDate(n.createdAt), 'dd.MM - HH:mm')}
                           </span>
                        </div>
                        <p className={cn(
                          "text-sm line-clamp-2 md:line-clamp-1 font-medium leading-relaxed",
                          isRead ? "text-zinc-600" : "text-zinc-400"
                        )}>
                          {n.content}
                        </p>
                      </div>

                      <div className="hidden md:flex items-center">
                         <ChevronRight className={cn(
                           "w-6 h-6 transition-all duration-500",
                           isRead ? "text-zinc-700" : "text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-2"
                         )} />
                      </div>
                    </motion.div>
                  );
                })
              )}
           </AnimatePresence>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                 <button onClick={() => setActiveItem(null)} className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                   <X className="w-5 h-5 text-zinc-400" />
                 </button>
              </div>

              <div className="space-y-8">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center border",
                  getColor(activeItem.type)
                )}>
                  {getIcon(activeItem.type)}
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
                    {activeItem.type} Notification
                  </div>
                  <h2 className="text-3xl md:text-5xl font-display font-medium text-white italic tracking-tighter leading-none">
                    {activeItem.title}
                  </h2>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {activeItem.createdAt && format(toSafeDate(activeItem.createdAt), 'dd MMMM yyyy, HH:mm', { locale: vi })}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="text-lg text-zinc-400 leading-relaxed font-serif whitespace-pre-wrap">
                  {activeItem.content}
                </div>

                <div className="pt-8 flex justify-end">
                   <button 
                     onClick={() => setActiveItem(null)}
                     className="px-10 py-5 bg-white text-black rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 active:scale-95"
                   >
                     Đóng cửa sổ
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

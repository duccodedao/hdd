import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, AlertCircle, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { createPortal } from 'react-dom';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  importance: 'low' | 'medium' | 'high';
  description?: string;
  createdAt: number;
}

export default function CalendarPage() {
  const { userData, isSuperAdmin, isAdmin } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    importance: 'medium' as 'low' | 'medium' | 'high'
  });

  const canEdit = isSuperAdmin || isAdmin;

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'calendar_events'), orderBy('createdAt', 'desc')), (snapshot) => {
      const items: CalendarEvent[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      setEvents(items);
      setLoading(false);
    }, (err) => {
      console.error("Calendar fetch error:", err);
      toast.error('Không thể tải dữ liệu lịch');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleOpenModal = (date: Date, ev?: CalendarEvent) => {
    if (!canEdit) return;
    setSelectedDateStr(format(date, 'yyyy-MM-dd'));
    if (ev) {
      setEditingEvent(ev);
      setEventForm({
        title: ev.title,
        description: ev.description || '',
        importance: ev.importance
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        importance: 'medium'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return tooltipError('Vui lòng nhập tiêu đề');
    
    try {
      if (editingEvent) {
        await setDoc(doc(db, 'calendar_events', editingEvent.id), {
          title: eventForm.title,
          description: eventForm.description,
          importance: eventForm.importance,
          date: selectedDateStr
        }, { merge: true });
        toast.success('Đã cập nhật công việc');
      } else {
        await addDoc(collection(db, 'calendar_events'), {
          title: eventForm.title,
          description: eventForm.description,
          importance: eventForm.importance,
          date: selectedDateStr,
          createdAt: Date.now()
        });
        toast.success('Đã thêm công việc mới');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi lưu');
    }
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      setEventToDelete(editingEvent.id);
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventToDelete));
      toast.success('Đã xóa công việc');
      setIsModalOpen(false);
      setEventToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi khi xóa');
    }
  };

  const tooltipError = (msg: string) => toast.error(msg);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr);
  };

  const getImportanceColor = (imp: string) => {
    switch (imp) {
      case 'high': return 'bg-rose-500 text-white border-rose-600';
      case 'medium': return 'bg-amber-500 text-white border-amber-600';
      case 'low': return 'bg-indigo-500 text-white border-indigo-600';
      default: return 'bg-slate-500 text-white border-slate-600';
    }
  };

  const getImportanceBgColor = (eventsForDay: CalendarEvent[]) => {
    if (eventsForDay.some(e => e.importance === 'high')) return 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30';
    if (eventsForDay.some(e => e.importance === 'medium')) return 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30';
    if (eventsForDay.length > 0) return 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30';
    return 'bg-white dark:bg-transparent border-slate-100 dark:border-white/5';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-black/20 overflow-y-auto no-scrollbar relative min-h-screen">
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
               <div className="p-2 border-2 border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                 <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
               </div>
               Lịch Làm Việc
             </h1>
             <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-2xl">
               Theo dõi và quản lý các công việc quan trọng trong tháng.
             </p>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm dark:text-white">
               Hôm nay
             </button>
             <div className="flex items-center rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm">
               <button onClick={prevMonth} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-r border-slate-200 dark:border-white/10">
                 <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
               </button>
               <span className="px-4 py-2 text-sm font-bold text-slate-900 dark:text-white min-w-[140px] text-center capitalize">
                 {format(currentDate, 'MMMM yyyy', { locale: vi })}
               </span>
               <button onClick={nextMonth} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-l border-slate-200 dark:border-white/10">
                 <ChevronRight className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
               </button>
             </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          {/* Days of week */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-950/50">
            {weekDays.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((day, dayIdx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "min-h-[100px] p-2 border-r border-b border-slate-100 dark:border-white/5 relative group transition-colors cursor-pointer",
                    !isCurrentMonth ? "bg-slate-50/50 dark:bg-zinc-950/30 text-slate-400 dark:text-zinc-600" : "text-slate-900 dark:text-zinc-200",
                    isTodayDate ? "bg-blue-50/30 dark:bg-indigo-500/5" : "bg-white dark:bg-transparent",
                    isSameDay(day, selectedDay) && "ring-2 ring-inset ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-500/10",
                    "hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-1 ml-1",
                      isTodayDate && "bg-indigo-600 text-white shadow-md",
                      !isTodayDate && !isCurrentMonth && "opacity-50"
                    )}>
                      {format(day, dateFormat)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1 px-1">
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-sm",
                          ev.importance === 'high' ? 'bg-rose-500' : ev.importance === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                        )}
                        title={ev.title}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events List */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 flex flex-col min-h-[250px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Công việc ngày {format(selectedDay, 'dd/MM/yyyy')}
            </h3>
            {canEdit && (
              <button 
                onClick={() => handleOpenModal(selectedDay)}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
              >
                <Plus className="w-4 h-4" /> Thêm mới
              </button>
            )}
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
            {getEventsForDay(selectedDay).length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500 dark:text-zinc-500 text-sm">Không có công việc nào trong ngày này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getEventsForDay(selectedDay).map(ev => (
                  <div 
                    key={ev.id}
                    onClick={() => canEdit && handleOpenModal(selectedDay, ev)}
                    className={cn(
                      "p-4 rounded-xl border shadow-sm transition-all flex flex-col gap-2",
                      getImportanceColor(ev.importance),
                      canEdit && "cursor-pointer hover:scale-[1.02] hover:opacity-95"
                    )}
                  >
                     <h4 className="font-bold text-sm leading-tight">{ev.title}</h4>
                     {ev.description && <p className="text-xs opacity-90 line-clamp-3 mt-1 leading-relaxed">{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 justify-center pb-8 pt-4">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500" /> Quan trọng</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" /> Trung bình</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" /> Thấp</div>
        </div>

      </div>

      {/* Modal Edit/Add */}
      <AnimatePresence>
        {isModalOpen && canEdit && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/50">
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <Clock className="w-5 h-5 text-indigo-500" />
                   {editingEvent ? 'Chỉnh sửa Công việc' : 'Thêm Công việc Mới'}
                 </h2>
                 <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 dark:bg-white/10 px-3 py-1 rounded-full">
                   {format(parseISO(selectedDateStr), 'dd/MM/yyyy')}
                 </span>
              </div>
              
              <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tiêu đề</label>
                  <input 
                    type="text" 
                    value={eventForm.title}
                    onChange={e => setEventForm({...eventForm, title: e.target.value})}
                    placeholder="Nhập tiêu đề công việc..."
                    autoFocus
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Độ quan trọng</label>
                  <select 
                    value={eventForm.importance}
                    onChange={e => setEventForm({...eventForm, importance: e.target.value as any})}
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                  >
                    <option value="high">Quan trọng cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mô tả (tùy chọn)</label>
                  <textarea 
                    value={eventForm.description}
                    onChange={e => setEventForm({...eventForm, description: e.target.value})}
                    placeholder="Ghi chú chi tiết..."
                    rows={3}
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white resize-none"
                  />
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Hủy
                  </button>
                  {editingEvent && (
                    <button 
                      type="button"
                      onClick={handleDeleteEvent}
                      className="py-3 px-4 rounded-xl font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center justify-center"
                      title="Xóa công việc này"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={!eventForm.title.trim()}
                    className="flex-[2] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Lưu Công Việc
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eventToDelete && createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEventToDelete(null)}
          >
             <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col"
              onClick={e => e.stopPropagation()}
             >
               <div className="p-6 pb-2">
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                   <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Xóa Công Việc</h2>
                 <p className="text-slate-500 dark:text-zinc-400 text-sm text-center mt-2">
                   Bạn có chắc chắn muốn xóa công việc này không? Hành động này không thể hoàn tác.
                 </p>
               </div>
               <div className="p-6 flex gap-3">
                 <button 
                   onClick={() => setEventToDelete(null)}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                 >
                   Hủy Bỏ
                 </button>
                 <button 
                   onClick={confirmDelete}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md"
                 >
                   Xác Nhận Xóa
                 </button>
               </div>
             </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}

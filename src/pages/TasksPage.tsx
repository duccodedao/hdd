import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  CheckCircle2, Clock, AlertCircle, Calendar, 
  Search, CheckSquare, Bell
} from 'lucide-react';
import { format, isBefore, isToday, startOfDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  title: string;
  deadline: string;
  note: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  remind: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = collection(db, 'tasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      allTasks.sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dbT = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - dbT;
      });
      setTasks(allTasks);
      setLoading(false);
    }, (err) => {
      console.error("TasksPage listener error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getStatusInfo = (task: Task) => {
    if (task.status === 'completed') return { label: 'Xong', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 };
    
    const deadlineDate = startOfDay(parseISO(task.deadline));
    const today = startOfDay(new Date());

    if (isBefore(deadlineDate, today)) {
      return { label: 'Trễ hạn', color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', icon: AlertCircle };
    }
    if (isToday(deadlineDate)) {
      return { label: 'Hôm nay', color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', icon: Clock };
    }
    return { label: 'Đang chờ', color: 'text-slate-500 bg-slate-50 dark:bg-white/5', icon: Clock };
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 bg-transparent min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
            Hệ thống quản trị
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
            Danh sách công việc
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 font-medium max-w-lg">Theo dõi các đầu việc và thời hạn hoàn thành từ ban quản trị.</p>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm công việc..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(n => (
            <div key={n} className="h-48 bg-slate-100 dark:bg-white/5 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, idx) => {
              const status = getStatusInfo(task);
              return (
                <motion.div
                  layout
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-7 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all flex flex-col h-full relative overflow-hidden"
                >
                  {/* Priority indicator */}
                  <div className={cn(
                    "absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-[0.03] dark:opacity-[0.07]",
                    task.priority === 'high' ? "bg-rose-500" :
                    task.priority === 'medium' ? "bg-amber-500" :
                    "bg-blue-500"
                  )} />

                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", status.color, "border-current/10")}>
                      {status.label}
                    </div>
                    {task.remind && <Bell className="w-4 h-4 text-indigo-500 animate-pulse" />}
                  </div>

                  <h3 className={cn(
                    "text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight transition-all",
                    task.status === 'completed' && "opacity-50"
                  )}>
                    {task.title}
                  </h3>

                  {task.note && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-3 mb-6 font-medium leading-relaxed">
                      {task.note}
                    </p>
                  )}

                  <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Thời hạn</span>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                         <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                         <span className="text-xs font-bold">{format(parseISO(task.deadline), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>

                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                      task.status === 'completed' 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-zinc-600"
                    )}>
                      {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-24 text-center">
           <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <CheckSquare className="w-8 h-8 text-slate-200 dark:text-white/10" />
           </div>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest">Tuyệt vời!</h3>
           <p className="text-slate-500 text-xs mt-1">Không có công việc nào cần xử lý lúc này.</p>
        </div>
      )}
    </div>
  );
}

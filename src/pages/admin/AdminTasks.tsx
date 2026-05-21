import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Plus, Trash2, Edit, X, CheckCircle2, Clock, AlertCircle, 
  Calendar, StickyNote, Bell, BellOff, Search, MoreVertical
} from 'lucide-react';
import { format, isAfter, isBefore, isToday, startOfDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';

interface Task {
  id: string;
  title: string;
  deadline: string;
  note: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  remind: boolean;
  createdAt: any;
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    deadline: format(new Date(), 'yyyy-MM-dd'),
    note: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    remind: false
  });

  const { openConfirm } = useConfirmStore();

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
    }, (err) => {
      console.error("AdminTasks listener error:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.deadline) return toast.error('Vui lòng nhập tiêu đề và thời hạn');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'tasks', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Đã cập nhật công việc');
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...formData,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        toast.success('Đã thêm công việc mới');
      }
      resetForm();
    } catch (e) {
      toast.error('Lỗi khi lưu công việc');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      deadline: format(new Date(), 'yyyy-MM-dd'),
      note: '',
      priority: 'medium',
      remind: false
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const startEdit = (task: Task) => {
    setFormData({
      title: task.title,
      deadline: task.deadline,
      note: task.note,
      priority: task.priority,
      remind: task.remind
    });
    setEditingId(task.id);
    setIsFormOpen(true);
  };

  const toggleStatus = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status: task.status === 'completed' ? 'pending' : 'completed'
      });
    } catch (e) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa công việc',
      message: 'Bạn có chắc chắn muốn xóa công việc này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tasks', id));
          toast.success('Đã xóa');
        } catch (e) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const getStatusInfo = (task: Task) => {
    if (task.status === 'completed') return { label: 'Đã hoàn thành', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 };
    
    const deadlineDate = startOfDay(parseISO(task.deadline));
    const today = startOfDay(new Date());

    if (isBefore(deadlineDate, today)) {
      return { label: 'Quá hạn', color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', icon: AlertCircle };
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Quản Lý Công Việc</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Thiết lập và theo dõi tiến độ công việc hệ thống.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Thêm công việc
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List */}
        <div className={cn("space-y-4", isFormOpen ? "lg:col-span-8" : "lg:col-span-12")}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm công việc..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white shadow-sm"
            />
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Công việc</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Thời hạn</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Trạng thái</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Mức độ</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-40">
                          <CheckSquare className="w-10 h-10 text-slate-400" />
                          <p className="text-xs font-bold uppercase tracking-widest">Không có công việc nào</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => {
                      const status = getStatusInfo(task);
                      return (
                        <tr key={task.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => toggleStatus(task)}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                  task.status === 'completed' 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-slate-300 dark:border-zinc-700 hover:border-indigo-500"
                                )}
                              >
                                {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                              <div>
                                <h4 className={cn("font-bold text-slate-900 dark:text-white transition-all", task.status === 'completed' && "opacity-50 line-through")}>
                                  {task.title}
                                </h4>
                                {task.note && <p className="text-[10px] text-slate-500 line-clamp-1">{task.note}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">
                                {format(parseISO(task.deadline), 'dd/MM/yyyy', { locale: vi })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", status.color)}>
                              <status.icon className="w-3 h-3" />
                              {status.label}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest",
                              task.priority === 'high' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" :
                              task.priority === 'medium' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                              "text-blue-500 border-blue-500/20 bg-blue-500/5"
                            )}>
                              {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1">
                                {task.remind && <Bell className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />}
                                <button onClick={() => startEdit(task)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(task.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Form */}
        {isFormOpen && (
          <div className="lg:col-span-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-xl sticky top-6">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                   {editingId ? <Edit size={18} /> : <Plus size={18} />}
                   {editingId ? 'Sửa công việc' : 'Công việc mới'}
                 </h3>
                 <button onClick={resetForm} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X size={16} className="text-slate-400" />
                 </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 underline underline-offset-4 decoration-indigo-500/30">Tiêu đề công việc</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ví dụ: Cập nhật server"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 underline underline-offset-4 decoration-indigo-500/30">Hạn chót</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="date"
                      required
                      value={formData.deadline}
                      onChange={e => setFormData({...formData, deadline: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 underline underline-offset-4 decoration-indigo-500/30">Mức độ ưu tiên</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({...formData, priority: p as any})}
                        className={cn(
                          "py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                          formData.priority === p 
                            ? (p === 'high' ? "bg-rose-500 text-white border-rose-500" : p === 'medium' ? "bg-amber-500 text-white border-amber-500" : "bg-blue-500 text-white border-blue-500")
                            : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500"
                        )}
                      >
                        {p === 'high' ? 'Cao' : p === 'medium' ? 'Vừa' : 'Thấp'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 underline underline-offset-4 decoration-indigo-500/30">Ghi chú</label>
                  <textarea 
                    placeholder="Chi tiết công việc..."
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white min-h-[100px] resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.remind} 
                      onChange={(e) => setFormData({...formData, remind: e.target.checked})} 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <div className="flex items-center gap-2">
                    <Bell className={cn("w-4 h-4", formData.remind ? "text-indigo-500" : "text-slate-400")} />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Bật nhắc nhở</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-xl"
                >
                  {editingId ? 'Cập nhật ngay' : 'Thêm công việc'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

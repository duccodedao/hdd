import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, where, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, Circle, Clock, CheckSquare, Plus, Trash2, Edit, X, Users, MessageSquare, AlertCircle, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isPast, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuthStore } from '../store/authStore';
import { useConfirmStore } from '../store/confirmStore';
import toast from 'react-hot-toast';

import NoData from '../components/ui/NoData';

interface TaskData {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  assigneeId: string | null;
  dueDate: number | null;
  status: 'pending' | 'completed';
  createdAt: number;
}

export default function TasksPage() {
  const { user, userData } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [users, setUsers] = useState<{ id: string, name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to tasks where user is either the owner or the assignee
    const q1 = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const q2 = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid));
    
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const msgs: TaskData[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as TaskData));
      updateTasksList(msgs, 'owner');
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const msgs: TaskData[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as TaskData));
      updateTasksList(msgs, 'assignee');
    });
    
    const updateTasksList = (newTasks: TaskData[], source: string) => {
       setTasks(prev => {
         const combined = [...prev.filter(p => source === 'owner' ? p.ownerId !== user.uid : p.assigneeId !== user.uid), ...newTasks];
         // Deduplicate
         const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
         return unique.sort((a,b) => b.createdAt - a.createdAt);
       });
    };

    // Fetch users for assignment (could be limited to team members, but here all users)
    const fetchUsers = async () => {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ 
          id: d.id, 
          name: d.data().displayName || 'Unknown User'
        })));
      } catch (e) {
        console.error(e);
      }
    };
    fetchUsers();

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setAssigneeId('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Bạn cần đăng nhập');
    if (!title.trim()) return toast.error('Vui lòng nhập tên công việc');

    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate).getTime();
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'tasks', editingId), { 
          title, 
          description, 
          dueDate: parsedDueDate,
          assigneeId: assigneeId || null
        });
        toast.success('Đã cập nhật công việc');
      } else {
        await addDoc(collection(db, 'tasks'), {
          title, 
          description, 
          ownerId: user.uid,
          assigneeId: assigneeId || null,
          dueDate: parsedDueDate,
          status: 'pending',
          createdAt: Date.now()
        });
        toast.success('Đã thêm công việc mới');
      }
      resetForm();
    } catch(e) {
      toast.error('Lỗi khi lưu công việc');
    }
  };

  const toggleTaskStatus = async (task: TaskData) => {
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
      toast.success(newStatus === 'completed' ? 'Đã hoàn thành công việc!' : 'Đã đánh dấu chưa hoàn thành');
    } catch (e) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa Công Việc',
      message: 'Bạn có chắc chắn muốn xóa công việc này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tasks', id));
          toast.success('Đã xóa công việc');
        } catch(e) {
          toast.error('Lỗi khi xóa!');
        }
      }
    });
  };

  const startEdit = (task: TaskData) => {
    setTitle(task.title);
    setDescription(task.description || '');
    if (task.dueDate) {
       // local datetime format YYYY-MM-DDTHH:mm
       const dt = new Date(task.dueDate);
       const dStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,16);
       setDueDate(dStr);
    } else {
       setDueDate('');
    }
    setAssigneeId(task.assigneeId || '');
    setEditingId(task.id);
    setIsModalOpen(true);
  };

  const getUserName = (uid: string) => {
    if (uid === user?.uid) return 'Bạn';
    return users.find(u => u.id === uid)?.name || 'Người dùng ẩn';
  };

  const formatDueDate = (ts: number | null) => {
    if (!ts) return null;
    const d = new Date(ts);
    if (isToday(d)) return `Hôm nay, ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Ngày mai, ${format(d, 'HH:mm')}`;
    return format(d, 'dd/MM/yyyy HH:mm');
  };

  const filteredTasks = tasks.filter(t => {
    let matchStatus = true;
    if (filterMode === 'pending') matchStatus = t.status === 'pending';
    if (filterMode === 'completed') matchStatus = t.status === 'completed';

    let matchSearch = true;
    if (searchQuery) matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    t.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchStatus && matchSearch;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 pb-20 pt-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl md:text-8xl font-display font-medium text-slate-900 dark:text-white tracking-tight italic leading-none mb-4">
            Công Việc
          </h1>
          <p className="text-slate-500 font-medium text-lg">Quản lý nhiệm vụ cá nhân và nhóm của bạn một cách trực quan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-medium  tracking-normal text-[11px] transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tạo Task
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl w-full sm:w-auto">
          <button 
            onClick={() => setFilterMode('all')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs  tracking-normal transition-all ${filterMode === 'all' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setFilterMode('pending')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs  tracking-normal transition-all ${filterMode === 'pending' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Chờ xử lý <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-md ml-1">{pendingCount}</span>
          </button>
          <button 
            onClick={() => setFilterMode('completed')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs  tracking-normal transition-all ${filterMode === 'completed' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Đã hoàn thành
          </button>
        </div>
        
        <div className="relative flex-1 w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Tìm kiếm công việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 font-semibold text-sm focus:border-blue-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <NoData 
                 message="Chưa có công việc nào" 
                 description={searchQuery ? "Không tìm thấy công việc phù hợp với từ khóa." : "Bạn đang rảnh rỗi. Hãy tạo một công việc mới để bắt đầu!"} 
                 icon={CheckSquare}
               />
            </motion.div>
          ) : (
            filteredTasks.map(task => {
              const isOwner = task.ownerId === user?.uid;
              const isAssigned = task.assigneeId === user?.uid;
              const isOverdue = task.dueDate && task.status === 'pending' && isPast(new Date(task.dueDate));
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={task.id}
                  className={`bg-white dark:bg-black border ${task.status === 'completed' ? 'border-slate-200/50 dark:border-white/5 opacity-60' : isOverdue ? 'border-rose-200 dark:border-rose-500/30 shadow-lg shadow-rose-500/5' : 'border-slate-200 dark:border-white/10 shadow-sm'} rounded-2xl p-6 flex flex-col sm:flex-row gap-5 transition-all group`}
                >
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className="flex-shrink-0 mt-1 focus:outline-none"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 hover:text-emerald-600 transition-colors" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isOverdue ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}>
                         {isOverdue && <AlertCircle className="w-4 h-4" />}
                      </div>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className={`text-lg font-medium tracking-tight ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </h3>
                      <div className="flex gap-2">
                        {isOverdue && <span className="bg-rose-500/10 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-medium  tracking-normal">Qúa hạn</span>}
                        {task.status === 'completed' && <span className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-medium  tracking-normal">Đã xong</span>}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className={`text-sm mb-4 line-clamp-2 ${task.status === 'completed' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                      {task.dueDate && (
                         <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600' : ''}`}>
                           <Clock className="w-4 h-4" />
                           {formatDueDate(task.dueDate)}
                         </div>
                      )}
                      {(task.ownerId || task.assigneeId) && (
                         <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                           <Users className="w-3.5 h-3.5" />
                           {getUserName(task.ownerId)} 
                           {task.assigneeId ? ` → ${getUserName(task.assigneeId)}` : ' (Cá nhân)'}
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-4 sm:pt-0 mt-2 sm:mt-0">
                     {(isOwner || isAssigned) && (
                       <>
                        <button onClick={() => startEdit(task)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                       </>
                     )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-display font-medium text-slate-900 dark:text-white tracking-tight italic">
                  {editingId ? 'Cập Nhật Tác Vụ' : 'Tạo Tác Vụ Mới'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Tên công việc</label>
                  <input 
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Cập nhật giao diện trang chủ"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 font-semibold text-sm focus:border-blue-500 outline-none transition-all dark:text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Hạn chót</label>
                    <input 
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-semibold text-sm focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Người phụ trách</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 font-semibold text-sm focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                    >
                      <option value="">Cá nhân (Tôi)</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Mô tả chi tiết</label>
                  <textarea 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập ghi chú hoặc mô tả chi tiết công việc..."
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 font-medium text-sm focus:border-blue-500 outline-none transition-all dark:text-white resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium  tracking-normal text-xs transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingId ? 'Lưu thay đổi' : 'Tạo công việc'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

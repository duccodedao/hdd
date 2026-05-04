import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Bell, Edit, X, Users, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';
import { motion, AnimatePresence } from 'motion/react';
import EmptyState from '../../components/admin/EmptyState';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [users, setUsers] = useState<{ id: string, name: string, email: string }[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetUserId, setTargetUserId] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // Fetch users for targeting
    const fetchUsers = async () => {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ 
          id: d.id, 
          name: d.data().displayName || 'Unknown', 
          email: d.data().email || '' 
        })));
      } catch (e) {
        console.error(e);
      }
    };
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle(''); setContent(''); setTargetUserId('all'); setEditingId(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return toast.error('Vui lòng nhập đầy đủ');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'notifications', editingId), { title, content, targetUserId });
        toast.success('Đã cập nhật thông báo');
      } else {
        await addDoc(collection(db, 'notifications'), {
          title, content, targetUserId, readBy: [], createdAt: Date.now()
        });
        toast.success('Đã gửi thông báo mới');
      }
      resetForm();
    } catch(e) {
      toast.error('Lỗi thao tác');
    }
  };

  const startEdit = (n: any) => {
    setTitle(n.title || '');
    setContent(n.content || '');
    setTargetUserId(n.targetUserId || 'all');
    setEditingId(n.id);
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa thông báo',
      message: 'Bạn có chắc chắn muốn xóa thông báo này chứ?',
      confirmText: 'Xóa',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'notifications', id));
          toast.success('Đã xóa');
        } catch(e) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-medium text-slate-900 dark:text-white tracking-tight  italic">
                {editingId ? 'Cập Nhật Thông Báo' : 'Tạo Thông Báo'}
              </h2>
              <p className="text-xs font-bold text-slate-500  tracking-normal mt-1">Gửi thông báo hệ thống</p>
            </div>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl font-bold text-xs  tracking-normal text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              Hủy sửa
            </button>
          )}
        </div>
        
        <form onSubmit={handleCreateOrUpdate} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Tiêu đề</label>
              <input 
                value={title} 
                onChange={e=>setTitle(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 focus:border-blue-600 outline-none transition-all font-bold text-sm" 
                placeholder="Nhập tiêu đề thông báo..."
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Người Nhận</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={targetUserId} 
                  onChange={e => setTargetUserId(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-bold text-sm appearance-none"
                >
                  <option value="all">Tất cả người dùng (Toàn cầu)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Nội dung</label>
            <textarea 
              rows={4} 
              value={content} 
              onChange={e=>setContent(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:border-blue-600 outline-none transition-all font-medium text-sm leading-relaxed" 
              placeholder="Nhập chi tiết thông báo..."
              required 
            />
          </div>
          <button type="submit" className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20">
            {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Lưu thay đổi' : 'Gửi thông báo'}
          </button>
        </form>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-medium text-slate-900 dark:text-white  tracking-tight italic flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            Lịch sử thông báo
          </h2>
          <span className="text-[10px] font-medium  tracking-normal text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
            Tổng cộng: {notifications.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[10px]  tracking-normal font-medium text-slate-500">
              <tr>
                <th className="px-8 py-5">Nội dung chính</th>
                <th className="px-8 py-5">Đối tượng</th>
                <th className="px-8 py-5">Thống kê</th>
                <th className="px-8 py-5 text-right flex-shrink-0">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <EmptyState title="Thông báo" />
                  </td>
                </tr>
              ) : (
                notifications.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900 dark:text-white text-base mb-1">{n.title}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 max-w-md font-medium leading-relaxed">{n.content}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-medium  tracking-normal ${n.targetUserId === 'all' || !n.targetUserId ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {n.targetUserId === 'all' || !n.targetUserId ? 'Toàn cầu' : 'Trực tiếp'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-slate-500">
                           {n.readBy?.length || 0}
                         </div>
                         <span className="text-[10px] font-medium  tracking-normal text-slate-400">Đã đọc</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                        <button onClick={() => startEdit(n)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(n.id)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Bell, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';

import EmptyState from '../../components/admin/EmptyState';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle(''); setContent(''); setEditingId(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return toast.error('Vui lòng nhập đầy đủ');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'notifications', editingId), { title, content });
        toast.success('Đã cập nhật thông báo');
      } else {
        await addDoc(collection(db, 'notifications'), {
          title, content, readBy: [], createdAt: Date.now()
        });
        toast.success('Đã gửi thông báo mới');
      }
      resetForm();
    } catch(e) {
      toast.error('Lỗi thao tác');
    }
  };

  const startEdit = (n: any) => {
    setTitle(n.title);
    setContent(n.content);
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
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            {editingId ? 'Cập nhật thông báo hệ thống' : 'Tạo thông báo hệ thống'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="w-4 h-4" /> Hủy sửa
            </button>
          )}
        </div>
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tiêu đề</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Nội dung</label>
            <textarea rows={4} value={content} onChange={e=>setContent(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2">
            {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Lưu thay đổi' : 'Gửi thông báo'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lịch sử thông báo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
              <tr>
                <th className="px-6 py-4">Tiêu đề</th>
                <th className="px-6 py-4">Nội dung</th>
                <th className="px-6 py-4">Lượt xem (Đã đọc)</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <EmptyState title="Thông báo" />
                  </td>
                </tr>
              ) : (
                notifications.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4 font-medium">{n.title}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">{n.content}</td>
                    <td className="px-6 py-4 font-medium text-blue-500">{n.readBy?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEdit(n)} className="text-blue-500 hover:text-blue-600 p-2"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(n.id)} className="text-red-500 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

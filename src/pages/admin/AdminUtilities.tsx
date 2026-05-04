import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminUtilities() {
  const [utilities, setUtilities] = useState<any[]>([]);
  const [forbiddenSubdomains, setForbiddenSubdomains] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForbiddenSubdomain, setNewForbiddenSubdomain] = useState('');
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    // Utilities listener
    const qUtils = query(collection(db, 'utilities'), orderBy('createdAt', 'desc'));
    const unsubUtils = onSnapshot(qUtils, (snapshot) => {
      setUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Forbidden subdomains listener
    const qForbidden = query(collection(db, 'forbidden_subdomains'), orderBy('subdomain', 'asc'));
    const unsubForbidden = onSnapshot(qForbidden, (snapshot) => {
      setForbiddenSubdomains(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUtils();
      unsubForbidden();
    };
  }, []);

  const handleAddForbiddenSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newForbiddenSubdomain.trim().toLowerCase();
    if (!val) return;
    if (forbiddenSubdomains.some(s => s.subdomain === val)) return toast.error('Đã tồn tại!');
    try {
      await addDoc(collection(db, 'forbidden_subdomains'), {
        subdomain: val,
        createdAt: serverTimestamp()
      });
      setNewForbiddenSubdomain('');
      toast.success('Đã chặn subdomain');
    } catch (e) {
      toast.error('Lỗi khi thêm');
    }
  };

  const deleteForbiddenSubdomain = (id: string) => {
    openConfirm({
      title: 'Xóa chặn',
      message: 'Giải phóng subdomain này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'forbidden_subdomains', id));
          toast.success('Đã xóa');
        } catch (e) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setEmbedUrl(''); setEditingId(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !embedUrl || !description) return toast.error('Vui lòng nhập đầy đủ thông tin');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'utilities', editingId), { title, description, embedUrl });
        toast.success('Đã cập nhật tiện ích');
      } else {
        await addDoc(collection(db, 'utilities'), {
          title, description, embedUrl, type: 'embed', createdAt: Date.now()
        });
        toast.success('Đã thêm tiện ích');
      }
      resetForm();
    } catch(e) {
      toast.error('Lỗi khi thao tác');
    }
  };

  const startEdit = (u: any) => {
    setTitle(u.title);
    setDescription(u.description);
    setEmbedUrl(u.embedUrl);
    setEditingId(u.id);
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa tiện ích',
      message: 'Bạn có chắc chắn muốn xóa tiện ích/web nhúng này?',
      confirmText: 'Xóa',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'utilities', id));
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingId ? 'Cập nhật tiện ích' : 'Thêm tiện ích / web nhúng'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="w-4 h-4" /> Hủy sửa
            </button>
          )}
        </div>
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tên chuyên mục / tiện ích</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mô tả ngắn</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link Web/App để nhúng (Iframe)</label>
            <input value={embedUrl} onChange={e=>setEmbedUrl(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2">
            {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Lưu thay đổi' : 'Thêm'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Danh sách</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
              <tr>
                <th className="px-6 py-5 text-[10px] font-medium  tracking-normal">Tên</th>
                <th className="px-6 py-5 text-[10px] font-medium  tracking-normal">Mô tả</th>
                <th className="px-6 py-5 text-[10px] font-medium  tracking-normal">Link nhúng</th>
                <th className="px-6 py-5 text-[10px] font-medium  tracking-normal text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {utilities.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4 font-medium">{u.title}</td>
                  <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">{u.description}</td>
                  <td className="px-6 py-4 text-blue-500 truncate max-w-[200px]"><a href={u.embedUrl} target="_blank" rel="noreferrer">{u.embedUrl}</a></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(u)} className="text-blue-500 hover:text-blue-600 p-2"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Subdomain bị cấm (Banned Slugs)</h2>
        <form onSubmit={handleAddForbiddenSubdomain} className="flex gap-4 mb-6">
          <input 
            type="text" 
            value={newForbiddenSubdomain}
            onChange={(e) => setNewForbiddenSubdomain(e.target.value)}
            placeholder="Nhập subdomain/slug muốn cấm..."
            className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white"
          />
          <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Chặn ngay</button>
        </form>

        <div className="flex flex-wrap gap-2">
           {forbiddenSubdomains.length === 0 ? (
             <p className="text-xs font-bold text-slate-400 italic">Chưa có danh sách bị cấm.</p>
           ) : (
             forbiddenSubdomains.map(s => (
               <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg group">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{s.subdomain}</span>
                  <button onClick={() => deleteForbiddenSubdomain(s.id)} className="p-1 hover:text-red-700 text-slate-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
}

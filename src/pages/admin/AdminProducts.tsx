import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';
import EmptyState from '../../components/admin/EmptyState';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle(''); setEmbedUrl(''); setThumbnail(''); setEditingId(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !embedUrl) return toast.error('Vui lòng nhập tên và link');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), { title, embedUrl, thumbnail });
        toast.success('Đã cập nhật sản phẩm');
      } else {
        await addDoc(collection(db, 'products'), {
          title, embedUrl, thumbnail, createdAt: Date.now()
        });
        toast.success('Đã thêm sản phẩm');
      }
      resetForm();
    } catch(e) {
      toast.error('Lỗi thao tác');
    }
  };

  const startEdit = (p: any) => {
    setTitle(p.title);
    setEmbedUrl(p.embedUrl);
    setThumbnail(p.thumbnail || '');
    setEditingId(p.id);
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa sản phẩm',
      message: 'Bạn có chắc chắn muốn xóa sản phẩm này?',
      confirmText: 'Xóa',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
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
            {editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="w-4 h-4" /> Hủy sửa
            </button>
          )}
        </div>
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tên sản phẩm / Tiêu đề</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link Shopee/Tiktok</label>
            <input value={embedUrl} onChange={e=>setEmbedUrl(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link Ảnh Thumbnail (Tùy chọn)</label>
            <input value={thumbnail} onChange={e=>setThumbnail(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2">
            {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
            {editingId ? 'Lưu thay đổi' : 'Thêm'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Danh sách sản phẩm</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Sản phẩm</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Link dẫn</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-0">
                    <EmptyState title="Sản phẩm" />
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {p.thumbnail ? <img src={p.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-white/10" />}
                      <span className="font-medium">{p.title}</span>
                    </td>
                    <td className="px-6 py-4 text-blue-500 truncate max-w-[200px]"><a href={p.embedUrl} target="_blank" rel="noreferrer">{p.embedUrl}</a></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEdit(p)} className="text-blue-500 hover:text-blue-600 p-2"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
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

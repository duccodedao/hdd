import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LineChart, Plus, Trash2, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';
import EmptyState from '../../components/admin/EmptyState';

export default function AdminExchanges() {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { openConfirm } = useConfirmStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'exchanges'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExchanges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setTitle('');
    setDescription('');
    setBenefits('');
    setLogoUrl('');
    setAffiliateUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !affiliateUrl) return toast.error('Vui lòng nhập tên và link giới thiệu');
    
    setLoading(true);
    try {
      if (isEditing && editId) {
        await updateDoc(doc(db, 'exchanges', editId), {
          title, description, benefits, logoUrl, affiliateUrl,
        });
        toast.success('Cập nhật thành công');
      } else {
        await addDoc(collection(db, 'exchanges'), {
          title, description, benefits, logoUrl, affiliateUrl,
          createdAt: Date.now()
        });
        toast.success('Thêm thành công');
      }
      resetForm();
    } catch (e) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa sàn giao dịch',
      message: 'Bạn có chắc chắn muốn xóa mục này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'exchanges', id));
          toast.success('Đã xóa sàn');
        } catch (error) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const startEdit = (exchange: any) => {
    setIsEditing(true);
    setEditId(exchange.id);
    setTitle(exchange.title || '');
    setDescription(exchange.description || '');
    setBenefits(exchange.benefits || '');
    setLogoUrl(exchange.logoUrl || '');
    setAffiliateUrl(exchange.affiliateUrl || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form Server */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 sticky top-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-500" />
            {isEditing ? 'Sửa sàn giao dịch' : 'Thêm sàn giao dịch'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tên sàn *</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition text-slate-900 dark:text-white" placeholder="Ví dụ: Binance" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Quyền lợi / Ưu đãi</label>
              <input type="text" value={benefits} onChange={(e) => setBenefits(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition text-slate-900 dark:text-white" placeholder="Ví dụ: Giảm 20% phí giao dịch" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mô tả chi tiết</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition text-slate-900 dark:text-white" placeholder="Chi tiết ưu đãi..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link nhận hoa hồng (Affiliate URL) *</label>
              <input required type="url" value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition text-slate-900 dark:text-white" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link Logo (Tùy chọn)</label>
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition text-slate-900 dark:text-white" placeholder="https://..." />
            </div>
            {logoUrl && (
              <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-white/5 p-1">
                <img src={logoUrl} alt="Preview" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
              </div>
            )}
            
            <div className="pt-2 flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                {isEditing ? <><Edit className="w-4 h-4" /> Cập nhật</> : <><Plus className="w-4 h-4" /> Thêm mới</>}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg font-medium transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-3 space-y-4">
        {exchanges.length === 0 ? (
          <EmptyState title="Sàn giao dịch đối tác" />
        ) : (
          exchanges.map(exchange => (
            <div key={exchange.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:shadow-md transition">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                {exchange.logoUrl ? <img src={exchange.logoUrl} alt={exchange.title} className="w-full h-full object-contain" /> : <LineChart className="w-8 h-8 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{exchange.title}</h3>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(exchange)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(exchange.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-amber-500 font-medium mb-1">{exchange.benefits}</p>
                <p className="text-xs text-slate-500 truncate mb-2">{exchange.affiliateUrl}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{exchange.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Gift, Plus, Trash2, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';
import EmptyState from '../../components/admin/EmptyState';

export default function AdminAirdrop() {
  const [airdrops, setAirdrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { openConfirm } = useConfirmStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewards, setRewards] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [projectUrl, setProjectUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'airdrops'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAirdrops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setTitle('');
    setDescription('');
    setRewards('');
    setLogoUrl('');
    setProjectUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !projectUrl) return toast.error('Vui lòng nhập tên và link dự án');
    
    setLoading(true);
    try {
      if (isEditing && editId) {
        await updateDoc(doc(db, 'airdrops', editId), {
          title, description, rewards, logoUrl, projectUrl,
        });
        toast.success('Cập nhật thành công');
      } else {
        await addDoc(collection(db, 'airdrops'), {
          title, description, rewards, logoUrl, projectUrl,
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
      title: 'Xóa dự án Airdrop',
      message: 'Bạn có chắc chắn muốn xóa mục này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'airdrops', id));
          toast.success('Đã xóa dự án');
        } catch (error) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const startEdit = (airdrop: any) => {
    setIsEditing(true);
    setEditId(airdrop.id);
    setTitle(airdrop.title || '');
    setDescription(airdrop.description || '');
    setRewards(airdrop.rewards || '');
    setLogoUrl(airdrop.logoUrl || '');
    setProjectUrl(airdrop.projectUrl || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Setup */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 sticky top-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            {isEditing ? 'Sửa dự án Airdrop' : 'Thêm dự án Airdrop'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tên dự án *</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-900 dark:text-white" placeholder="Ví dụ: Arbitrum" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Phần thưởng (Rewards)</label>
              <input type="text" value={rewards} onChange={(e) => setRewards(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-900 dark:text-white" placeholder="Ví dụ: Token, NFT..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mô tả chi tiết</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-900 dark:text-white" placeholder="Chi tiết cách tham gia..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link dự án / Link tham gia *</label>
              <input required type="url" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-900 dark:text-white" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Link Logo (Tùy chọn)</label>
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition text-slate-900 dark:text-white" placeholder="https://..." />
            </div>
            {logoUrl && (
              <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-white/5 p-1">
                <img src={logoUrl} alt="Preview" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
              </div>
            )}
            
            <div className="pt-2 flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
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
      <div className="lg:col-span-2 space-y-4">
        {airdrops.length === 0 ? (
          <EmptyState title="Dự án Airdrop" />
        ) : (
          airdrops.map(airdrop => (
            <div key={airdrop.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:shadow-md transition">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                {airdrop.logoUrl ? <img src={airdrop.logoUrl} alt={airdrop.title} className="w-full h-full object-contain" /> : <Gift className="w-8 h-8 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{airdrop.title}</h3>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(airdrop)} className="p-2 text-slate-400 hover:text-pink-500 hover:bg-pink-500/10 rounded-lg transition"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(airdrop.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-pink-500 font-medium mb-1">{airdrop.rewards}</p>
                <p className="text-xs text-slate-500 truncate mb-2">{airdrop.projectUrl}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{airdrop.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


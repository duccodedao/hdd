import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Edit, X, Square, CheckSquare, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminUtilities() {
  const [utilities, setUtilities] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [internalOnly, setInternalOnly] = useState(false);
  const [systemTools, setSystemTools] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    // Utilities listener
    const qUtils = query(collection(db, 'utilities'), orderBy('createdAt', 'desc'));
    const unsubUtils = onSnapshot(qUtils, (snapshot) => {
      const dbUtils = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Merge with native tools if not exists to allow pricing native tools
      const nativeTools = [
        { id: 'avatar-frame', title: 'Khung Ảnh Đại Diện' },
        { id: 'file-manager', title: 'Quản Lý File Cá Nhân' },
        { id: 'kho-van-ban', title: 'Kho Văn Bản' },
        { id: 'ai-scanner', title: 'Quét Văn Bản AI' },
        { id: 'image-to-pdf', title: 'Ảnh sang PDF' },
        { id: 'pdf-to-word', title: 'PDF sang Word' },
        { id: 'pdf-merger', title: 'Ghép PDF' },
        { id: 'pdf-splitter', title: 'Tách PDF' }
      ];

      const finalUtils = [...dbUtils];
      nativeTools.forEach(nt => {
        if (!finalUtils.some(u => u.id === nt.id)) {
          finalUtils.push({ ...nt, native: true, description: 'Cấu hình mặc định hệ thống', embedUrl: '#', price: 0, salePrice: 0 } as any);
        }
      });

      setUtilities(finalUtils);
    }, (err) => {
      console.error("AdminUtilities: utilities listener error:", err?.message || String(err));
    });

    // System settings listener for tool permissions
    const unsubSettings = onSnapshot(doc(db, 'settings', 'tool_permissions'), (docSnap) => {
      if (docSnap.exists()) {
        setSystemTools(docSnap.data());
      }
    }, (err) => {
      console.error("AdminUtilities: settings listener error:", err?.message || String(err));
    });

    return () => {
      unsubUtils();
      unsubSettings();
    };
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === utilities.length && utilities.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(utilities.map(u => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: 'Xóa hàng loạt tiện ích?',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} tiện ích đã chọn không?`,
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          selectedIds.forEach(id => {
            batch.delete(doc(db, 'utilities', id));
          });
          await batch.commit();
          toast.success(`Đã xóa ${selectedIds.length} tiện ích`);
          setSelectedIds([]);
        } catch (error: any) {
          toast.error('Lỗi khi xóa hàng loạt: ' + (error.message || 'Unknown'));
        }
      }
    });
  };

  const toggleSystemTool = async (id: string) => {
    try {
      const current = systemTools[id] || { public: true, internal: false };
      const currentlyPublic = current.public !== false;
      const nextPublic = !currentlyPublic;
      const nextConfig = { public: nextPublic, internal: !nextPublic };

      await updateDoc(doc(db, 'settings', 'tool_permissions'), {
        [id]: nextConfig
      });
      toast.success('Đã cập nhật quyền hạn');
    } catch (e) {
      // Create if doesn't exist
      try {
        const current = systemTools[id] || { public: true, internal: false };
        const currentlyPublic = current.public !== false;
        const nextPublic = !currentlyPublic;
        const nextConfig = { public: nextPublic, internal: !nextPublic };

        await setDoc(doc(db, 'settings', 'tool_permissions'), {
          [id]: nextConfig
        }, { merge: true });
        toast.success('Đã cập nhật quyền hạn');
      } catch (err) {
        toast.error('Lỗi khi cập nhật');
      }
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setEmbedUrl(''); setEditingId(null); setInternalOnly(false); setPrice(0); setSalePrice(0);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return toast.error('Vui lòng nhập đầy đủ thông tin');
    try {
      const data = { title, description, embedUrl, internalOnly, price: Number(price), salePrice: Number(salePrice), updatedAt: Date.now() };
      
      if (editingId) {
        // If it's a native tool being edited for the first time, it might not exist in DB yet
        const isNative = utilities.find(u => u.id === editingId)?.native;
        if (isNative) {
           await setDoc(doc(db, 'utilities', editingId), { ...data, type: 'tool', createdAt: Date.now() }, { merge: true });
        } else {
           await updateDoc(doc(db, 'utilities', editingId), data);
        }
        toast.success('Đã cập nhật tiện ích');
      } else {
        await addDoc(collection(db, 'utilities'), {
          ...data, type: 'embed', createdAt: Date.now()
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
    setInternalOnly(u.internalOnly || false);
    setPrice(u.price || 0);
    setSalePrice(u.salePrice || 0);
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
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" />
            {editingId ? 'Cập nhật tiện ích' : 'Thêm tiện ích / web nhúng'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm font-bold flex items-center gap-1.5 text-slate-500 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl">
              <X className="w-4 h-4" /> Hủy sửa
            </button>
          )}
        </div>
        <form onSubmit={handleCreateOrUpdate} className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Tên chuyên mục / tiện ích</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" placeholder="Nhập tên tiện ích..." required />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Link Web/App để nhúng (Iframe)</label>
              <input value={embedUrl} onChange={e=>setEmbedUrl(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" placeholder="https://..." required />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Mô tả ngắn</label>
            <textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm resize-none" placeholder="Mô tả công dụng của tiện ích..." required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Giá gốc (VNĐ)</label>
               <input type="number" value={price} onChange={e=>setPrice(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" />
            </div>
            <div className="space-y-2">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Giá khuyến mãi (VNĐ)</label>
               <input type="number" value={salePrice} onChange={e=>setSalePrice(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 w-full">
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={internalOnly} 
                     onChange={(e) => setInternalOnly(e.target.checked)} 
                   />
                   <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                 </label>
                 <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Giới hạn nội bộ</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2">
              {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'Lưu thay đổi' : 'Thêm tiện ích mới'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Tiện ích đã chọn</span>
            </div>
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20"
            >
              <Trash size={14} /> Xóa vĩnh viễn
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Danh sách Tiện ích</h2>
          </div>
          <div className="overflow-x-auto no-scrollbar scroll-smooth">
            <table className="w-full text-left border-separate border-spacing-0 table-fixed min-w-[1000px]">
              <colgroup>
                <col className="w-12 text-center" />
                <col className="w-56" />
                <col className="w-72" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-64" />
                <col className="w-32 text-right" />
              </colgroup>
              <thead className="bg-slate-50/50 dark:bg-white/[0.02]">
                <tr className="text-slate-500">
                  <th className="p-4 border-b border-slate-100 dark:border-white/5">
                    <button 
                      onClick={toggleSelectAll} 
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      disabled={utilities.length === 0}
                    >
                      {selectedIds.length === utilities.length && utilities.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-white/5 whitespace-nowrap">Tên hiển thị</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-white/5 whitespace-nowrap">Mô tả giới thiệu</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-white/5 whitespace-nowrap">Giá gốc</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-white/5 whitespace-nowrap">Giá bán</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-white/5 whitespace-nowrap">Đường dẫn nguồn</th>
                  <th className="sticky right-0 bg-slate-50 dark:bg-zinc-950/90 backdrop-blur shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 dark:border-white/10 z-20 box-border p-4 text-[10px] font-bold uppercase tracking-widest text-right border-b border-slate-100 dark:border-white/5 whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {utilities.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="p-4 align-middle text-center">
                      <button onClick={() => toggleSelect(u.id)} className={selectedIds.includes(u.id) ? "text-indigo-600" : "text-slate-300"}>
                        {selectedIds.includes(u.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="p-4 align-middle font-bold text-sm text-slate-900 dark:text-stone-100 truncate">
                      <div className="flex flex-col gap-1">
                        <span>{u.title}</span>
                        {u.native && (
                          <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md self-start">Hệ thống</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">{u.description}</td>
                    <td className="p-4 align-middle font-mono text-xs text-slate-600 dark:text-slate-500">{u.price?.toLocaleString() || 0}</td>
                    <td className="p-4 align-middle font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{u.salePrice?.toLocaleString() || 0}</td>
                    <td className="p-4 align-middle text-blue-500 text-xs truncate max-w-xs">
                      <a href={u.embedUrl} target="_blank" rel="noreferrer" className="hover:underline">{u.embedUrl}</a>
                    </td>
                    <td className="whitespace-nowrap sticky right-0 bg-white dark:bg-zinc-950 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5 z-10 box-border p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all" title="Cập nhật"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all" title="Xóa vĩnh viễn"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

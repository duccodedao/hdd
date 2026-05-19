import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminUtilities() {
  const [utilities, setUtilities] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [internalOnly, setInternalOnly] = useState(false);
  const [systemTools, setSystemTools] = useState<any>({});
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    // Utilities listener
    const qUtils = query(collection(db, 'utilities'), orderBy('createdAt', 'desc'));
    const unsubUtils = onSnapshot(qUtils, (snapshot) => {
      setUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // System settings listener for tool permissions
    const unsubSettings = onSnapshot(doc(db, 'settings', 'tool_permissions'), (doc) => {
      if (doc.exists()) {
        setSystemTools(doc.data());
      }
    });

    return () => {
      unsubUtils();
      unsubSettings();
    };
  }, []);

  const toggleSystemTool = async (id: string, field: 'public' | 'internal') => {
    try {
      const current = systemTools[id] || { public: true, internal: false };
      await updateDoc(doc(db, 'settings', 'tool_permissions'), {
        [id]: { ...current, [field]: !current[field] }
      });
      toast.success('Đã cập nhật quyền hạn');
    } catch (e) {
      // Create if doesn't exist
      try {
        const current = systemTools[id] || { public: true, internal: false };
        await setDoc(doc(db, 'settings', 'tool_permissions'), {
          [id]: { ...current, [field]: !current[field] }
        }, { merge: true });
        toast.success('Đã cập nhật quyền hạn');
      } catch (err) {
        toast.error('Lỗi khi cập nhật');
      }
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setEmbedUrl(''); setEditingId(null); setInternalOnly(false);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !embedUrl || !description) return toast.error('Vui lòng nhập đầy đủ thông tin');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'utilities', editingId), { title, description, embedUrl, internalOnly });
        toast.success('Đã cập nhật tiện ích');
      } else {
        await addDoc(collection(db, 'utilities'), {
          title, description, embedUrl, type: 'embed', internalOnly, createdAt: Date.now()
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
          <div className="flex items-center gap-3">
             <label className="relative inline-flex items-center cursor-pointer">
               <input 
                 type="checkbox" 
                 className="sr-only peer" 
                 checked={internalOnly} 
                 onChange={(e) => setInternalOnly(e.target.checked)} 
               />
               <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
             </label>
             <span className="text-sm font-medium text-slate-600 dark:text-zinc-400">Giới hạn nội bộ (Cần mã code)</span>
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2">
            {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Lưu thay đổi' : 'Thêm'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Công cụ Hệ thống</h2>
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Internal Control</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
              <tr>
                <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-widest">Tên công cụ</th>
                <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-widest">Công khai</th>
                <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-widest">Nội bộ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {[
                { id: 'kho-van-ban', name: 'Kho Văn Bản' },
                { id: 'ai-scanner', name: 'Quét Văn Bản AI' },
                { id: 'image-to-pdf', name: 'Ảnh sang PDF' },
                { id: 'pdf-to-word', name: 'PDF sang Word' },
                { id: 'find-my-device', name: 'Định Vị Thiết Bị' }
              ].map(tool => {
                const config = systemTools[tool.id] || { public: true, internal: false };
                return (
                  <tr key={tool.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4 font-bold text-slate-600 dark:text-zinc-300">{tool.name}</td>
                    <td className="px-6 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={config.public !== false} 
                          onChange={() => toggleSystemTool(tool.id, 'public')} 
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={config.internal === true} 
                          onChange={() => toggleSystemTool(tool.id, 'internal')} 
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Danh sách</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[700px]">
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
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Sparkles, Plus, Edit2, Trash2, X, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirmStore } from '../../store/confirmStore';
import * as XLSX from 'xlsx';

export default function AdminAiTools() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { openConfirm } = useConfirmStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    logoUrl: '',
    name: '',
    description: '',
    url: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ai_tools'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in-memory instead of firestore query ordering
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setTools(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching AI tools:", err);
      toast.error("Không thể tải danh sách AI Tools");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error("Tên và đường dẫn không được để trống");
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'ai_tools', editingId), {
          ...formData,
        });
        toast.success("Cập nhật thành công");
      } else {
        await addDoc(collection(db, 'ai_tools'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success("Thêm thành công");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra");
    }
  };

  const resetForm = () => {
    setFormData({ logoUrl: '', name: '', description: '', url: '' });
    setEditingId(null);
  };

  const handleEdit = (tool: any) => {
    setFormData({
      logoUrl: tool.logoUrl || '',
      name: tool.name || '',
      description: tool.description || '',
      url: tool.url || ''
    });
    setEditingId(tool.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa AI Tool',
      message: 'Bạn có chắc chắn muốn xóa công cụ này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'ai_tools', id));
          toast.success("Đã xóa");
        } catch (err) {
          console.error(err);
          toast.error("Lỗi khi xóa");
        }
      }
    });
  };

  const downloadTemplate = () => {
    const data = [
      {
        logoUrl: "https://example.com/logo.png",
        name: "ChatGPT",
        description: "Mô tả ngắn gọn ...",
        url: "https://chatgpt.com/"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AI_Tools");
    XLSX.writeFile(workbook, "mau_import_ai_tools.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    openConfirm({
      title: 'Xác nhận import',
      message: 'Bạn sắp import danh sách AI Tools từ file Excel. Tiếp tục?',
      confirmText: 'Import',
      cancelText: 'Hủy',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const workbook = XLSX.read(bstr, { type: 'binary' });
            const wsname = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(worksheet) as any[];

            let successCount = 0;
            for (const row of data) {
              const name = String(row.name || '').trim();
              const url = String(row.url || '').trim();
              if (name && url) {
                await addDoc(collection(db, 'ai_tools'), {
                  logoUrl: String(row.logoUrl || '').trim(),
                  name,
                  description: String(row.description || '').trim(),
                  url,
                  createdAt: serverTimestamp()
                });
                successCount++;
              }
            }
            toast.success(`Đã import ${successCount} công cụ`);
            if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (error) {
            console.error(error);
            toast.error('Lỗi khi đọc file Excel');
          }
        };
        reader.readAsBinaryString(file);
      }
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Quản Lý Hệ Sinh Thái AI
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition">
            <Download className="w-4 h-4" /> Import Template
          </button>
          
          <input 
             type="file" 
             accept=".xlsx, .xls" 
             className="hidden" 
             ref={fileInputRef}
             onChange={handleImport}
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition">
            <Upload className="w-4 h-4" /> Thêm nhanh (Excel)
          </button>
          
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" /> Thêm thủ công
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Logo AI</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên AI</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mô tả</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liên kết</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {tools.map((tool) => (
              <tr key={tool.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td className="p-4">
                  {tool.logoUrl ? (
                    <img src={tool.logoUrl} alt={tool.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </td>
                <td className="p-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{tool.name}</td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs">{tool.description}</td>
                <td className="p-4 text-sm whitespace-nowrap"><a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{tool.url}</a></td>
                <td className="p-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(tool)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(tool.id!)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tools.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">Bạn chưa thêm công cụ AI nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editingId ? 'Cập nhật AI Tool' : 'Thêm AI Tool'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
               <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo URL</label>
                <input value={formData.logoUrl} onChange={e => setFormData({...formData, logoUrl: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên AI (*)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm" placeholder="Ví dụ: ChatGPT" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mô tả</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm resize-none" placeholder="Mô tả công dụng..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Đường dẫn (*)</label>
                <input required value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl font-medium text-sm">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

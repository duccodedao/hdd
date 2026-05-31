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
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [currentConflictIdx, setCurrentConflictIdx] = useState<number>(0);

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

  const handleExportExcel = () => {
    try {
      if (tools.length === 0) {
        toast.error("Không có dữ liệu để xuất");
        return;
      }
      
      const exportData = tools.map(tool => ({
        "Logo URL": tool.logoUrl || '',
        "Tên AI": tool.name || '',
        "Mô tả": tool.description || '',
        "Đường dẫn": tool.url || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "AI_Tools");
      XLSX.writeFile(workbook, `danh_sach_ai_tools_${new Date().getTime()}.xlsx`);
      toast.success("Xuất file Excel thành công!");
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi xuất file Excel");
    }
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

            const detectedConflicts: any[] = [];
            const nonConflicts: any[] = [];

            for (const row of data) {
              const name = String(row.name || '').trim();
              const url = String(row.url || '').trim();
              if (name && url) {
                // Find duplicate by name or URL (case insensitive)
                const existing = tools.find(t => 
                  t.name.toLowerCase() === name.toLowerCase() || 
                  t.url.toLowerCase() === url.toLowerCase()
                );
                const itemData = {
                  logoUrl: String(row.logoUrl || '').trim(),
                  name,
                  description: String(row.description || '').trim(),
                  url
                };
                if (existing) {
                  detectedConflicts.push({
                    existing,
                    imported: itemData
                  });
                } else {
                  nonConflicts.push(itemData);
                }
              }
            }

            let successCount = 0;
            for (const item of nonConflicts) {
              await addDoc(collection(db, 'ai_tools'), {
                ...item,
                createdAt: serverTimestamp()
              });
              successCount++;
            }

            if (detectedConflicts.length > 0) {
              setConflicts(detectedConflicts);
              setCurrentConflictIdx(0);
              toast.success(`Đã import thành công ${successCount} công cụ mới. Phát hiện ${detectedConflicts.length} công cụ bị trùng lặp cần xử lý.`);
            } else {
              toast.success(`Đã import thành công ${successCount} công cụ.`);
            }

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
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm">
            <Download className="w-4 h-4" /> Xuất Excel
          </button>

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

      {conflicts.length > 0 && currentConflictIdx < conflicts.length && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-rose-100 dark:border-rose-500/10 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">Cảnh báo trùng lặp AI Tool</h3>
                <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold text-left">Tên hoặc đường dẫn đã tồn tại trên Hệ thống.</p>
              </div>
              <div className="ml-auto bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400">
                {currentConflictIdx + 1} / {conflicts.length}
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 text-sm text-left">
              Bạn có muốn ghi đè công cụ hiện tại bằng dữ liệu mới từ file Excel không? Hãy so sánh và lựa chọn phiên bản giữ lại:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dữ liệu hiện tại */}
              <div className="border border-slate-200 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col justify-between text-left">
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md mb-3">DỮ LIỆU HIỆN CÓ</span>
                  <div className="flex items-center gap-3 mb-3">
                    {conflicts[currentConflictIdx].existing.logoUrl ? (
                      <img src={conflicts[currentConflictIdx].existing.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{conflicts[currentConflictIdx].existing.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={conflicts[currentConflictIdx].existing.url}>{conflicts[currentConflictIdx].existing.url}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {conflicts[currentConflictIdx].existing.description || <em className="text-slate-400">(Không có mô tả)</em>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast.success(`Đã giữ lại dữ liệu hiện có cho "${conflicts[currentConflictIdx].existing.name}"`);
                    if (currentConflictIdx + 1 >= conflicts.length) {
                      setConflicts([]);
                    } else {
                      setCurrentConflictIdx(prev => prev + 1);
                    }
                  }}
                  className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-white/10"
                >
                  Giữ dữ liệu hiện tại (Bỏ qua)
                </button>
              </div>

              {/* Dữ liệu import mới */}
              <div className="border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 bg-indigo-50/10 dark:bg-indigo-500/5 flex flex-col justify-between shadow-sm text-left">
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md mb-3">DỮ LIỆU NHẬP MỚI</span>
                  <div className="flex items-center gap-3 mb-3">
                    {conflicts[currentConflictIdx].imported.logoUrl ? (
                      <img src={conflicts[currentConflictIdx].imported.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{conflicts[currentConflictIdx].imported.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={conflicts[currentConflictIdx].imported.url}>{conflicts[currentConflictIdx].imported.url}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {conflicts[currentConflictIdx].imported.description || <em className="text-slate-400">(Không có mô tả)</em>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const conflict = conflicts[currentConflictIdx];
                      await updateDoc(doc(db, 'ai_tools', conflict.existing.id), {
                        logoUrl: conflict.imported.logoUrl,
                        name: conflict.imported.name,
                        description: conflict.imported.description,
                        url: conflict.imported.url,
                      });
                      toast.success(`Đã ghi đè công cụ "${conflict.imported.name}" thành công!`);
                      if (currentConflictIdx + 1 >= conflicts.length) {
                        setConflicts([]);
                      } else {
                        setCurrentConflictIdx(prev => prev + 1);
                      }
                    } catch (error) {
                      console.error(error);
                      toast.error('Có lỗi xảy ra khi ghi đè dữ liệu.');
                    }
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Ghi đè bằng dữ liệu mới
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setConflicts([]);
                  toast.success('Đã hủy phần còn lại của danh sách nhập!');
                }}
                className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all"
              >
                Hủy bỏ phần còn lại
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Đã giữ dữ liệu hiện tại cho tất cả phần còn lại.');
                    setConflicts([]);
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-medium transition"
                >
                  Giữ tất cả còn lại
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const remaining = conflicts.slice(currentConflictIdx);
                      for (const conflict of remaining) {
                        await updateDoc(doc(db, 'ai_tools', conflict.existing.id), {
                          logoUrl: conflict.imported.logoUrl,
                          name: conflict.imported.name,
                          description: conflict.imported.description,
                          url: conflict.imported.url
                        });
                      }
                      toast.success(`Đã ghi đè thành công tất cả ${remaining.length} công cụ!`);
                      setConflicts([]);
                    } catch (err) {
                      console.error(err);
                      toast.error('Có lỗi xảy ra khi ghi đè hàng loạt.');
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition"
                >
                  Ghi đè tất cả còn lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

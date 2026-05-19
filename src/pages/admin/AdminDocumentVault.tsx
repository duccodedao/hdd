import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, where, getDocs } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../lib/firebase';
import { GitHubConfig } from '../../types';
import { githubService } from '../../services/githubService';
import { Upload, X, Settings, LayoutGrid, Check, FolderOpen, Save, Trash2, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface UploadItem {
  id: string;
  file: File;
  originalName: string;
  name: string;
  categoryId: string;
  note: string;
}

export default function AdminDocumentVault() {
  const [activeTab, setActiveTab] = useState<'upload' | 'category' | 'files' | 'trash'>('upload');
  
  // GH Config State
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);
  
  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  
  // Files State
  const [documents, setDocuments] = useState<AdminDocument[]>([]);

  const updateDocCategory = async (docId: string, newCategoryId: string) => {
    const category = categories.find(c => c.id === newCategoryId);
    await updateDoc(doc(db, 'documents', docId), {
      categoryId: newCategoryId,
      categoryName: category?.name || 'Chưa phân loại'
    });
    toast.success('Đã cập nhật danh mục cho tài liệu');
  };
  
  // Upload State
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Config listener
    const unsubConfig = onSnapshot(doc(db, 'settings', 'github_integration'), (docSn) => {
      if (docSn.exists()) {
        const data = docSn.data() as GitHubConfig;
        setGhConfig(data);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/github_integration');
    });

    // Category listener
    const unsubCat = onSnapshot(collection(db, 'document_categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'document_categories');
    });
    
    // Documents listener
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminDocument)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'documents');
    });

    return () => { unsubConfig(); unsubCat(); unsubDocs(); };
  }, []);

  const normalizeFileName = (name: string) => {
    return name
      .normalize('NFD') // Separate base characters and diacritics
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[đĐ]/g, 'd') // Specifically handle 'đ'
      .replace(/[^a-zA-Z0-9.\-_]/g, '-') // Replace non-alphanumeric (except . - _) with -
      .replace(/-+/g, '-') // Replace multiple hyphens with one
      .toLowerCase();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await addDoc(collection(db, 'document_categories'), {
        name: newCatName,
        description: newCatDesc,
        createdAt: serverTimestamp()
      });
      toast.success('Đã thêm danh mục mới');
      setNewCatName('');
      setNewCatDesc('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'document_categories');
      toast.error('Lỗi khi thêm danh mục');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    const q = query(collection(db, 'documents'), where('categoryId', '==', id));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      if (!window.confirm(`Danh mục "${name}" đang chứa ${snap.size} tài liệu. Việc xóa danh mục sẽ khiến các tài liệu này không còn thuộc phân loại nào. Bạn vẫn muốn tiếp tục?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Xoá danh mục "${name}"?`)) return;
    }

    const toastId = toast.loading('Đang xóa danh mục...');
    try {
      // Step 1: Update all documents in this category to have no category
      if (!snap.empty) {
        const batchPromises = snap.docs.map(docSnap => 
          updateDoc(doc(db, 'documents', docSnap.id), {
            categoryId: '',
            categoryName: 'Chưa phân loại'
          })
        );
        await Promise.all(batchPromises);
      }

      // Step 2: Delete the category
      await deleteDoc(doc(db, 'document_categories', id));
      toast.success('Đã xoá danh mục thành công', { id: toastId });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `document_categories/${id}`);
      toast.error('Lỗi khi xoá danh mục: ' + err.message, { id: toastId });
    }
  };

  const handleToggleHidden = async (docObj: AdminDocument) => {
    const action = docObj.hidden ? "Hiện" : "Ẩn";
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài liệu "${docObj.name}"?`)) return;
    
    try {
      await updateDoc(doc(db, 'documents', docObj.id), { hidden: !docObj.hidden });
      toast.success(`Đã ${action.toLowerCase()} tài liệu`);
    } catch (err) {
      toast.error(`Lỗi khi ${action.toLowerCase()} tài liệu`);
    }
  };

  const handleDeleteFile = async (docObj: AdminDocument) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${docObj.name}"?`)) return;
    
    try {
      await updateDoc(doc(db, 'documents', docObj.id), { 
        isDeleted: true,
        deletedAt: serverTimestamp()
      });
      toast.success('Đã chuyển tài liệu vào thùng rác');
    } catch (err) {
      toast.error('Lỗi khi xóa tài liệu');
    }
  };

  const handleRestoreFile = async (docObj: AdminDocument) => {
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục tài liệu "${docObj.name}"?`)) return;
    try {
      await updateDoc(doc(db, 'documents', docObj.id), { 
        isDeleted: false,
        deletedAt: null
      });
      toast.success('Đã khôi phục tài liệu');
    } catch (err) {
      toast.error('Lỗi khi khôi phục tài liệu');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: UploadItem[] = Array.from(e.target.files).map(file => {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        return {
          id: Math.random().toString(36).substring(7),
          file,
          originalName: file.name,
          name: nameWithoutExt,
          categoryId: '',
          note: ''
        };
      });
      setUploadItems(prev => [...prev, ...newItems]);
    }
    e.target.value = '';
  };

  const updateUploadItem = (id: string, field: keyof UploadItem, value: string) => {
    setUploadItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeUploadItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một tệp');
      return;
    }
    
    if (uploadItems.some(item => !item.categoryId || !item.name)) {
      toast.error('Vui lòng điền tên và chọn danh mục cho tất cả các tệp');
      return;
    }

    if (!ghConfig) {
      toast.error('Vui lòng kiểm tra cấu hình GitHub');
      return;
    }

    setUploading(true);
    let successCount = 0;

    try {
      for (const item of uploadItems) {
        const category = categories.find(c => c.id === item.categoryId);
        const folderName = category ? normalizeFileName(category.name) : 'general';
        const normalizedName = normalizeFileName(item.file.name);
        const fileName = `${Date.now()}-${normalizedName}`;
        const path = `documents/${folderName}/${fileName}`;
        
        const githubData = await githubService.uploadFile(ghConfig, item.file, path);
        
        await addDoc(collection(db, 'documents'), {
          name: item.name || item.file.name,
          categoryId: item.categoryId,
          categoryName: category?.name || 'Khác',
          note: item.note,
          githubUrl: githubData.url,
          githubSha: githubData.sha,
          githubPath: githubData.path,
          hidden: false,
          views: 0,
          downloads: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        successCount++;
      }

      toast.success(`Đã tải lên thành công ${successCount} văn bản!`);
      setUploadItems([]);
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra trong quá trình tải lên');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('upload')} 
          className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}
        >
          <Upload className="w-4 h-4 inline-block mr-2" /> Tải lên Hàng Loạt
        </button>
        <button 
          onClick={() => setActiveTab('files')} 
          className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}
        >
          <FileText className="w-4 h-4 inline-block mr-2" /> Quản lý File
        </button>
        <button 
          onClick={() => setActiveTab('trash')} 
          className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'trash' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}
        >
          <Trash2 className="w-4 h-4 inline-block mr-2" /> Thùng Rác
        </button>
        <button 
          onClick={() => setActiveTab('category')} 
          className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'category' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}
        >
          <LayoutGrid className="w-4 h-4 inline-block mr-2" /> Danh Mục
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold mb-4">Danh sách tài liệu ({documents.filter(d => !d.isDeleted).length})</h3>
           <div className="space-y-3">
             {documents.filter(d => !d.isDeleted).map(docItem => (
               <div key={docItem.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] bg-slate-200 dark:bg-zinc-800 px-2 py-1 rounded uppercase tracking-widest">{docItem.githubPath.split('.').pop()}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">{docItem.name}</span>
                      <select 
                        className="text-xs bg-transparent border-none p-0 text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer focus:ring-0"
                        value={docItem.categoryId} 
                        onChange={(e) => updateDocCategory(docItem.id, e.target.value)}
                      >
                        <option value="">Chưa phân loại</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={() => handleToggleHidden(docItem)}
                        className={cn("p-2 rounded-lg transition-colors", docItem.hidden ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "text-slate-400 hover:text-slate-600")}
                        title={docItem.hidden ? "Hiện file" : "Ẩn file"}
                     >
                        <Settings className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={() => handleDeleteFile(docItem)}
                        className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Xóa tài liệu"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'trash' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold mb-4 text-rose-500">Thùng rác ({documents.filter(d => d.isDeleted).length})</h3>
           <div className="space-y-3">
             {documents.filter(d => d.isDeleted).map(docItem => (
               <div key={docItem.id} className="flex items-center justify-between p-4 bg-rose-50 dark:bg-white/5 rounded-xl border border-rose-100 dark:border-white/5">
                  <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">{docItem.name}</span>
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={() => handleRestoreFile(docItem)}
                        className="text-emerald-500 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Khôi phục"
                     >
                        <RefreshCw className="w-4 h-4" />
                     </button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'upload' && (
         <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
           <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-3">
                 <label className="text-xs font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Tài liệu (Chọn hoặc kéo thả nhiều file)</label>
                 <label className={cn(
                   "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-3xl cursor-pointer transition-all",
                   "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-white/20"
                 )}>
                    <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                       <Upload className="w-8 h-8 mb-3 text-slate-400 dark:text-zinc-500" />
                       <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Nhấn để chọn tệp</p>
                       <p className="text-xs text-slate-400 dark:text-zinc-600 mt-2">Kích thước tối đa 25MB / file.</p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={handleFileChange} />
                 </label>
              </div>

              {uploadItems.length > 0 && (
                <div className="space-y-4">
                  <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 dark:bg-zinc-900/80 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-500">
                     <div className="col-span-3">Tên file gốc</div>
                     <div className="col-span-3">Tên hiển thị</div>
                     <div className="col-span-3">Danh mục lưu trữ</div>
                     <div className="col-span-2">Ghi chú bổ sung</div>
                     <div className="col-span-1 text-center">Xóa</div>
                  </div>
                  
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {uploadItems.map(item => (
                      <div key={item.id} className="relative flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 p-4 lg:p-0 bg-slate-50 dark:bg-zinc-925 lg:bg-transparent lg:dark:bg-transparent border lg:border-0 border-slate-200 dark:border-white/5 rounded-2xl lg:rounded-none">
                         <div className="lg:col-span-3 flex flex-col justify-center">
                            <label className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tên file gốc</label>
                            <div className="flex items-center gap-2 overflow-hidden px-1">
                               <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                               <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={item.originalName}>{item.originalName}</span>
                            </div>
                         </div>
                         
                         <div className="lg:col-span-3 flex flex-col justify-center">
                            <label className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tên hiển thị</label>
                            <input 
                              type="text" 
                              placeholder="Tên hiển thị"
                              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-900 dark:text-white transition-all font-medium"
                              value={item.name}
                              onChange={(e) => updateUploadItem(item.id, 'name', e.target.value)}
                              required
                            />
                         </div>

                         <div className="lg:col-span-3 flex flex-col justify-center relative">
                            <label className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Danh mục</label>
                            <select 
                              className="w-full pl-4 pr-8 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs appearance-none text-slate-900 dark:text-white font-medium transition-all"
                              value={item.categoryId}
                              onChange={(e) => updateUploadItem(item.id, 'categoryId', e.target.value)}
                              required
                            >
                              <option value="">Chọn danh mục...</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                            <ChevronRight className="absolute right-3 top-[34px] lg:top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
                         </div>

                         <div className="lg:col-span-2 flex flex-col justify-center">
                            <label className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ghi chú</label>
                            <input 
                              type="text"
                              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-900 dark:text-white transition-all font-medium"
                              placeholder="Ghi chú thêm..."
                              value={item.note}
                              onChange={(e) => updateUploadItem(item.id, 'note', e.target.value)}
                            />
                         </div>

                         <div className="absolute top-3 right-3 lg:static lg:col-span-1 flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => removeUploadItem(item.id)}
                              className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-all"
                              title="Xóa khỏi danh sách"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!ghConfig && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3">
                   Vui lòng cấu hình GitHub API trước khi tải lên.
                </div>
              )}

              <button 
                disabled={uploading || !ghConfig || uploadItems.length === 0}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý {uploadItems.length} tệp...
                  </>
                ) : `Xác nhận tải lên ${uploadItems.length > 0 ? uploadItems.length + ' tệp' : ''}`}
              </button>
           </form>
         </div>
      )}

      {activeTab === 'category' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
           <form onSubmit={handleCreateCategory} className="mb-8 space-y-4 max-w-xl">
              <h3 className="text-lg font-bold">Thêm Danh Mục Mới</h3>
              <input 
                type="text" 
                placeholder="Tên danh mục..." 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm" 
                required 
              />
              <textarea 
                placeholder="Mô tả..." 
                value={newCatDesc} 
                onChange={e => setNewCatDesc(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm">
                Thêm danh mục
              </button>
           </form>
           
           <div>
              <h3 className="text-lg font-bold mb-4">Danh sách phân loại ({categories.length})</h3>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                     <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{cat.name}</h4>
                        {cat.description && <p className="text-xs text-slate-500 mt-1">{cat.description}</p>}
                     </div>
                     <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-rose-500 mt-2 sm:mt-0 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-slate-500 text-sm">Chưa có danh mục nào.</p>}
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

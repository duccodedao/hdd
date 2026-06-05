import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { 
  Download, 
  Upload, 
  AlertCircle, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Database, 
  RefreshCw, 
  FileJson, 
  Info,
  CheckCircle,
  FileSpreadsheet,
  FolderOpen
} from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';
import { safeJsonStringify } from '../../lib/utils';

interface CollectionStatus {
  name: string;
  count: number | null;
  loading: boolean;
  selected: boolean;
}

export default function AdminSystem() {
  const [loading, setLoading] = useState(false);
  const [customCollectionName, setCustomCollectionName] = useState('');
  const { openConfirm } = useConfirmStore();
  
  // Default comprehensive list of all system & utility collections
  const [collections, setCollections] = useState<CollectionStatus[]>([
    { name: 'device_logins', count: null, loading: false, selected: true },
    { name: 'blockedIps', count: null, loading: false, selected: true },
    { name: 'users', count: null, loading: false, selected: true },
    { name: 'contact_requests', count: null, loading: false, selected: true },
    { name: 'utilities', count: null, loading: false, selected: true },
    { name: 'utility_stats', count: null, loading: false, selected: true },
    { name: 'site_visitation_stats', count: null, loading: false, selected: true },
    { name: 'activities', count: null, loading: false, selected: true },
    { name: 'user_ai_keys', count: null, loading: false, selected: true },
    { name: 'forms', count: null, loading: false, selected: true },
    { name: 'form_responses', count: null, loading: false, selected: true },
    { name: 'document_categories', count: null, loading: false, selected: true },
    { name: 'documents', count: null, loading: false, selected: true },
    { name: 'calendar_events', count: null, loading: false, selected: true },
    { name: 'recurring_events', count: null, loading: false, selected: true },
    { name: 'hrm_employees', count: null, loading: false, selected: true },
    { name: 'hrm_collaborators', count: null, loading: false, selected: true },
    { name: 'avatar_frames', count: null, loading: false, selected: true },
    { name: 'apps', count: null, loading: false, selected: true },
    { name: 'app_categories', count: null, loading: false, selected: true },
    { name: 'settings', count: null, loading: false, selected: true },
    { name: 'tasks', count: null, loading: false, selected: true },
    { name: 'files', count: null, loading: false, selected: true }
  ]);

  // Import preview holding state
  const [importFile, setImportFile] = useState<any | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewCollections, setImportPreviewCollections] = useState<{ name: string; count: number }[]>([]);

  // Toggle all selections
  const toggleAll = (select: boolean) => {
    setCollections(prev => prev.map(c => ({ ...c, selected: select })));
  };

  // Batch query to load document count for each collection
  const loadCollectionCounts = async () => {
    setCollections(prev => prev.map(c => ({ ...c, loading: true })));
    
    for (let i = 0; i < collections.length; i++) {
      const colName = collections[i].name;
      try {
        const snap = await getDocs(collection(db, colName));
        setCollections(prev => prev.map(c => c.name === colName ? { ...c, count: snap.docs.length, loading: false } : c));
      } catch (err) {
        console.warn(`Could not count document for collection: ${colName}`, err);
        setCollections(prev => prev.map(c => c.name === colName ? { ...c, count: 0, loading: false } : c));
      }
    }
  };

  useEffect(() => {
    loadCollectionCounts();
  }, []);

  // Quick select actions
  const handleSelectAll = (select: boolean) => {
    setCollections(prev => prev.map(c => ({ ...c, selected: select })));
  };

  const handleToggleSelect = (name: string) => {
    setCollections(prev => prev.map(c => c.name === name ? { ...c, selected: !c.selected } : c));
  };

  // Add customized collection name on the fly
  const handleAddCustomCollection = async () => {
    const trimmed = customCollectionName.trim();
    if (!trimmed) return;
    
    if (collections.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Bộ sưu tập này đã tồn tại trong danh sách!');
      return;
    }

    const newCol: CollectionStatus = {
      name: trimmed,
      count: null,
      loading: true,
      selected: true
    };

    setCollections(prev => [...prev, newCol]);
    setCustomCollectionName('');
    toast.success(`Đã thêm bộ sưu tập: ${trimmed}`);

    // Try to scan count
    try {
      const snap = await getDocs(collection(db, trimmed));
      setCollections(prev => prev.map(c => c.name === trimmed ? { ...c, count: snap.docs.length, loading: false } : c));
    } catch (err) {
      setCollections(prev => prev.map(c => c.name === trimmed ? { ...c, count: 0, loading: false } : c));
    }
  };

  // Remove a collection from the active list
  const handleRemoveCollection = (name: string) => {
    setCollections(prev => prev.filter(c => c.name !== name));
    toast.success(`Đã bỏ bộ sưu tập ${name} khỏi danh sách cấu trúc`);
  };

  // Enhanced Export Routine (Selected ONLY)
  const handleExport = async () => {
    const selectedCollections = collections.filter(c => c.selected);
    if (selectedCollections.length === 0) {
      toast.error('Vui lòng chọn ít nhất một bộ dữ liệu (collection) để tiến hành sao lưu!');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Đang khởi tạo kết xuất cấu trúc hệ thống...', { id: 'backup_run' });
    
    try {
      const backupData: Record<string, any[]> = {};
      let grandTotalDocuments = 0;

      for (const col of selectedCollections) {
        toast.loading(`Đang đọc gói dữ liệu: ${col.name}...`, { id: 'backup_run' });
        const snap = await getDocs(collection(db, col.name));
        
        backupData[col.name] = snap.docs.map(doc => {
          const docData = doc.data();
          const sanitized: any = { _backup_id: doc.id };
          
          for (const key in docData) {
            if (docData[key] instanceof Timestamp) {
              sanitized[key] = { _t: 'timestamp', val: docData[key].toDate().toISOString() };
            } else {
              sanitized[key] = docData[key];
            }
          }
          return sanitized;
        });

        grandTotalDocuments += snap.docs.length;
      }

      const backupEnvelope = {
        system: "BMass Admin Pro Ecosystem",
        version: "4.0",
        exportedAt: new Date().toISOString(),
        totalCollections: selectedCollections.length,
        totalDocumentsCount: grandTotalDocuments,
        data: backupData
      };

      const blob = new Blob([safeJsonStringify(backupEnvelope, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.href = url;
      link.download = `bmass_ecosystem_backup_${nowStr}.json`;
      link.click();
      
      toast.success(`Kết xuất thành công! Tải về tệp sao lưu chứa ${grandTotalDocuments} bản ghi.`, { id: 'backup_run' });
      
      // Update local counts in view
      loadCollectionCounts();
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi kết xuất dữ liệu: ${e.message || e}`, { id: 'backup_run' });
    } finally {
      setLoading(false);
    }
  };

  // Inspect upload file to show dry-run preview before executing import
  const handleUploadFileForPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        let rawData: any = null;
        if (parsed.system === "BMass Admin Pro Ecosystem" && parsed.data) {
          rawData = parsed.data;
        } else if (typeof parsed === 'object') {
          // Backward compatibility check for flat data structure
          rawData = parsed;
        }

        if (!rawData) {
          toast.error('Tệp JSON tải lên không hợp lệ, không tìm thấy cấu trúc dữ liệu!');
          return;
        }

        const previewList = Object.keys(rawData).map(key => ({
          name: key,
          count: Array.isArray(rawData[key]) ? rawData[key].length : 0
        }));

        setImportFile(rawData);
        setImportPreviewCollections(previewList);
        toast.success(`Đã phân tích tệp sao lưu. Sẵn sàng phục hồi ${previewList.length} collections!`);
      } catch (err: any) {
        toast.error(`Lỗi phân tích cú pháp tệp JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Comprehensive and dynamically inclusive schema restoration
  const executeImport = async () => {
    if (!importFile) return;

    openConfirm({
      title: 'Xác nhận khôi phục dữ liệu',
      message: `Phương pháp này sẽ tiến hành hòa trộn và ghi đè dữ liệu đối với các tài liệu trùng ID trên toàn bộ hệ thống Firebase.\nBạn có chắc chắn muốn tiến hành khôi phục từ tệp "${importFileName}" không?`,
      confirmText: 'Khôi phục',
      cancelText: 'Hủy',
      onConfirm: async () => {
        setLoading(true);
        const toastId = toast.loading('Đang chuẩn bị luồng ghi đè dữ liệu...', { id: 'import_run' });

        try {
          let batch = writeBatch(db);
          let opCount = 0;
          const BATCH_SIZE = 400; // Safe threshold for Firestore limits
          let importedCollectionCount = 0;
          let importedDocsCount = 0;

      // EXTREMELY ROBUST: Iterate dynamically through EVERY key inside the JSON's data.
      // This guarantees that any new features/new collections are flawlessly imported on dynamic models!
      const collectionsInBackup = Object.keys(importFile);

      for (const col of collectionsInBackup) {
        const items = importFile[col];
        if (items && Array.isArray(items)) {
          toast.loading(`Đang khôi phục bảng [${col}] (${items.length} bản ghi)...`, { id: 'import_run' });
          
          for (const item of items) {
            const docId = item._backup_id || item.id;
            if (!docId) continue;

            const { _backup_id, id, ...docData } = item;
            
            // Process saved timestamps safely
            for (const key in docData) {
              if (docData[key] && docData[key]._t === 'timestamp') {
                docData[key] = Timestamp.fromDate(new Date(docData[key].val));
              }
            }

            const docRef = doc(db, col, docId);
            batch.set(docRef, docData, { merge: true });
            opCount++;
            importedDocsCount++;

            if (opCount >= BATCH_SIZE) {
              await batch.commit();
              batch = writeBatch(db);
              opCount = 0;
            }
          }
          importedCollectionCount++;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      toast.success(
        `Đã hoàn thành khôi phục dữ liệu!\nKhôi phục thành công: ${importedCollectionCount} bộ cài đặt, sản sinh/cập nhật: ${importedDocsCount} bản ghi tài liệu.`, 
        { id: 'import_run', duration: 5000 }
      );
      
      // Clean preview states
      setImportFile(null);
      setImportFileName('');
      setImportPreviewCollections([]);
      
      // Refresh database count states
      loadCollectionCounts();
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi nghiêm trọng trong quá trình khôi phục: ${err.message}`, { id: 'import_run' });
    } finally {
      setLoading(false);
    }
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dynamic Collection Overview Card */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-950 dark:text-white">
                <Database className="w-5.5 h-5.5 text-blue-500" />
                Quản lý Cơ cấu Dữ liệu Hệ thống System Data
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Khai báo cấu trúc, kiểm toán số lượng tài liệu hiện có và sao lưu/phục hồi toàn diện Firebase Firestore.
              </p>
            </div>
            
            <button
              onClick={loadCollectionCounts}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 align-self-start sm:align-self-auto"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-500' : ''} />
              Quét Số lượng Tài liệu
            </button>
          </div>
        </div>

        {/* Custom Collection Inline Form (For continuous feature support) */}
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Thêm bộ sưu tập tùy chỉnh (Nếu hệ thống có thêm tính năng hoặc tiện ích mới)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono placeholder-slate-400"
              placeholder="Ví dụ: custom_messages, admin_logs, chat_rooms..."
              value={customCollectionName}
              onChange={(e) => setCustomCollectionName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCollection()}
            />
            <button
              type="button"
              onClick={handleAddCustomCollection}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10"
            >
              <Plus size={14} /> Thêm Bộ sưu tập
            </button>
          </div>
        </div>

        {/* Export select list of collections */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Danh sách Collections của hệ thống ({collections.length})
            </span>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => handleSelectAll(true)} 
                className="text-[10px] uppercase font-bold text-blue-600 hover:underline hover:text-blue-700"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button 
                type="button" 
                onClick={() => handleSelectAll(false)} 
                className="text-[10px] uppercase font-bold text-slate-500 hover:underline hover:text-slate-700"
              >
                Bỏ chọn hết
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((col) => {
              const countBadge = col.loading ? (
                <span className="text-[10px] text-blue-500 animate-pulse">đang quét...</span>
              ) : col.count !== null ? (
                <span className="text-[10px] tracking-normal font-mono font-bold px-2 py-0.5 roundedbg-slate-100 dark:bg-white/10 bg-slate-100 dark:bg-zinc-805 text-slate-600 dark:text-zinc-300">
                  {col.count.toLocaleString()} tài liệu
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">-</span>
              );

              return (
                <div 
                  key={col.name} 
                  className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all hover:bg-slate-50/50 dark:hover:bg-white/5 ${col.selected ? 'border-blue-500/30 bg-blue-500/2 bg-blue-500/5 dark:bg-blue-500/5' : 'border-slate-200 dark:border-white/5'}`}
                >
                  <button 
                    type="button"
                    onClick={() => handleToggleSelect(col.name)}
                    className="flex items-center gap-2.5 text-left shrink"
                  >
                    {col.selected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-700 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold font-mono text-slate-900 dark:text-zinc-100 truncate">
                        {col.name}
                      </p>
                      <div className="mt-0.5">
                        {countBadge}
                      </div>
                    </div>
                  </button>

                  {/* Redundant safety drop item option */}
                  <button 
                    type="button"
                    onClick={() => handleRemoveCollection(col.name)}
                    className="p-1 px-1.5 text-slate-300 hover:text-red-500 dark:text-zinc-700 hover:dark:text-red-400 rounded-lg hover:bg-red-500/5 transition-colors shrink-0"
                    title="Bỏ khỏi danh sách kiểm soát"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* EXPORT ACTION PANEL */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs">
            <Info size={14} className="text-blue-500 shrink-0" />
            <span>Chỉ tiến hành export và nén tệp các Collections được đánh dấu chọn hiển thị ở dạng xanh.</span>
          </div>

          <button
            disabled={loading}
            onClick={handleExport}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/15 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={15} />
            {loading ? 'Đang đóng gói dữ liệu...' : 'Xuất Toàn bộ JSON Chọn lọc'}
          </button>
        </div>
      </div>

      {/* DYNAMIC IMPORT AND MIGRATION RESTORATION CARD */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-950 dark:text-white animate-fade-in">
            <Upload className="w-5.5 h-5.5 text-emerald-500" />
            Nhập & Di cư Dữ liệu Toàn Hệ thống (Database Migration Tool)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Nhập file JSON đã sao lưu để ghi đè và phục hồi cấu trúc dữ liệu. Điểm vượt trội: Tự động phát hiện và khôi phục toàn bộ các collection động, các utility mới mà không cần cập nhật code.
          </p>
        </div>

        {/* Status Summary & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <FolderOpen size={16} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cấu trúc Bộ Dữ liệu</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{collections.length} Collections</div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Đã đăng ký trong hệ thống rà soát</p>
           </div>
           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Database size={16} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Số lượng chọn sao lưu</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {collections.filter(c => c.selected).length} / {collections.length}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Tương ứng {((collections.filter(c => c.selected).length / collections.length) * 100).toFixed(0)}% hạ tầng</p>
           </div>
           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm flex flex-col justify-center gap-2">
              <button 
                onClick={() => toggleAll(true)}
                className="w-full py-2 bg-slate-900 dark:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
              >
                Chọn Tất Cả Bộ Dữ Liệu
              </button>
              <button 
                onClick={() => toggleAll(false)}
                className="w-full py-2 bg-slate-100 dark:bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-colors"
              >
                Bỏ Chọn Tất Cả
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* File Picker Area */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors relative bg-slate-50/50 dark:bg-black/10">
              <input 
                type="file" 
                accept=".json"
                onChange={handleUploadFileForPreview}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center justify-center p-2">
                <FileJson size={36} className="text-slate-400 dark:text-zinc-650 mb-2" />
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                  {importFileName ? importFileName : 'Nhấp chọn hoặc kéo thả file backup (.json)'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Tập tin kết xuất đúng cấu trúc bmass_backup</span>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 rounded-xl leading-relaxed flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>CẢNH BÁO MIGRATION:</strong> Khôi phục dữ liệu sẽ hòa trộn tài liệu dựa trên Mã ID tài liệu. Khuyên dùng sao lưu toàn bộ cơ sở dữ liệu gốc cũ trước khi nạp tệp vào vị trí mới tránh mất mát dữ liệu.
              </div>
            </div>
          </div>

          {/* Import Preview Output / Active Actions */}
          <div className="lg:col-span-7 space-y-4">
            {importFile ? (
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 bg-slate-50/20">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Tệp Backup Hợp lệ</span>
                    <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{importFileName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={executeImport}
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/15 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={14} /> {loading ? 'Đang khôi phục...' : 'Bắt đầu Khôi Phục'}
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cơ cấu tệp tin chứa ({importPreviewCollections.length} collections):
                  </span>
                  <div className="max-h-[180px] overflow-y-auto pr-1 space-y-1.5 no-scrollbar">
                    {importPreviewCollections.map(p => (
                      <div key={p.name} className="flex justify-between items-center py-1.5 px-3 bg-white dark:bg-black/25 rounded-lg border border-slate-100 dark:border-white/5 font-mono text-xs">
                        <span className="font-bold text-slate-700 dark:text-zinc-300">
                          📁 {p.name}
                        </span>
                        <span className="font-bold text-slate-500 text-[11px]">
                          {p.count.toLocaleString()} rows
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center text-slate-400 space-y-2 min-h-[220px]">
                <FileSpreadsheet size={32} className="text-slate-300 dark:text-zinc-700" />
                <p className="text-xs font-medium">Chưa có tệp nạp được chọn</p>
                <p className="text-[10px] text-slate-400 max-w-[280px]">Vui lòng chọn hệ tệp backup kết xuất .json ở bên trái để hiển thị cấu trúc xem trước trước khi phục hồi.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

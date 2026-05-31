
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Search, Filter, Download, Share2, Eye, 
  Trash2, Edit2, Plus, X, Upload, Check, AlertCircle,
  FolderOpen, FileArchive, Settings, ChevronRight, Save,
  MoreVertical, FileIcon, FileSpreadsheet, FileQuestion, 
  BookOpen, LayoutGrid, List as ListIcon, Shield, ExternalLink,
  ArrowLeft, RefreshCw, Zap, Monitor, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, setDoc, serverTimestamp, increment,
  where, getDocs, getDoc, limit, startAfter, type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../../lib/firebase';
import { githubService } from '../../services/githubService';
import { GitHubConfig, Category, AdminDocument } from '../../types';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import AppLogo from '../../components/ui/AppLogo';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuthStore } from '../../store/authStore';
import { useConfirmStore } from '../../store/confirmStore';
import ConfirmModal from '../../components/ConfirmModal';

const DOCS_PER_PAGE = 50;

interface DocumentVaultProps {
  onBack: () => void;
}

interface UploadItem {
  id: string;
  file: File;
  originalName: string;
  name: string;
  categoryId: string;
  note: string;
}

export default function DocumentVault({ onBack }: DocumentVaultProps) {
  const { user, isAdmin } = useAuthStore();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'explorer'>('list');
  const [explorerCategory, setExplorerCategory] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AdminDocument | null>(null);
  const [editForm, setEditForm] = useState({ name: '', categoryId: '', note: '', hidden: false });

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmState({ isOpen: true, title, message, onConfirm, type });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch Documents with Pagination
    const qDocs = query(
      collection(db, 'documents'), 
      orderBy('createdAt', 'desc'),
      limit(DOCS_PER_PAGE)
    );
    
    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminDocument));
      setDocuments(docs);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] as QueryDocumentSnapshot || null);
      setHasMore(snapshot.docs.length === DOCS_PER_PAGE);
      setLoading(false);
    }, (err: any) => {
      setLoading(false);
      console.error("DocumentVault documents error:", err?.message || String(err));
    });

    // Fetch Categories
    const qCats = query(collection(db, 'document_categories'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const fetchedCats = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      fetchedCats.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }));
      setCategories(fetchedCats);
    }, (err: any) => {
      console.error("DocumentVault categories error:", err?.message || String(err));
    });

    return () => {
      unsubDocs();
      unsubCats();
    };
  }, [isAdmin]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'documents'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(DOCS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminDocument));
      if (newDocs.length > 0) {
        setDocuments(prev => [...prev, ...newDocs]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] as QueryDocumentSnapshot || null);
        setHasMore(snapshot.docs.length === DOCS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more error:", err?.message || String(err));
      if (err instanceof Error && !err.message.includes('permission-denied')) {
        toast.error("Không thể tải thêm văn bản");
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Deep Link Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
      setHighlightId(viewId);
      // Optional: auto-show only highlighted if came from a share link
      // setShowOnlyHighlighted(true); 
    }
  }, []);

  useEffect(() => {
    if (highlightId && documents.length > 0) {
      const docToView = documents.find(d => d.id === highlightId);
      if (docToView) {
        // Auto preview if desired, or just stay highlighted
        // setPreviewDoc(docToView); 
        
        // Scroll to it
        const element = document.getElementById(`doc-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [documents, highlightId]);

  const handleDelete = async (docObj: AdminDocument) => {
    openConfirm("Xóa văn bản", `Bạn có chắc chắn muốn xóa văn bản "${docObj.name}"?`, async () => {
      const toastId = toast.loading('Đang xử lý yêu cầu xóa...');
      try {
        const configDoc = await getDoc(doc(db, 'settings', 'github_integration'));
        if (configDoc.exists()) {
          const resultData = configDoc.data();
          const config = {
            ...resultData,
            owner: resultData.owner || resultData.username || ''
          } as import('../../types').GitHubConfig;
          try {
            await githubService.deleteFile(config, docObj.githubPath, docObj.githubSha);
          } catch (githubErr: any) {
            console.warn("GitHub deletion failed (file might be already gone):", githubErr);
          }
        }
        await deleteDoc(doc(db, 'documents', docObj.id));
        toast.success('Đã xóa văn bản khỏi hệ thống', { id: toastId });
      } catch (error: any) {
        toast.error('Lỗi khi xóa tài liệu: ' + error.message, { id: toastId });
      }
    }, 'danger');
  };

  const handlePreview = async (docObj: AdminDocument) => {
    const ext = docObj.githubPath.split('.').pop()?.toLowerCase() || '';
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
    const url = isOffice 
      ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(docObj.githubUrl)}`
      : docObj.githubUrl;
    
    window.open(url, '_blank');
    
    await updateDoc(doc(db, 'documents', docObj.id), {
      views: increment(1)
    });
  };

  const handleDownload = async (docObj: AdminDocument) => {
    window.open(docObj.githubUrl, '_blank');
    await updateDoc(doc(db, 'documents', docObj.id), {
      downloads: increment(1)
    });
  };

  const exportToExcel = () => {
    const data = filteredDocs.map(d => ({
      'Tên văn bản': d.name,
      'Danh mục': d.categoryName,
      'Ghi chú': d.note,
      'Ngày tạo': new Date(d.createdAt?.seconds * 1000).toLocaleString(),
      'Lượt xem': d.views,
      'Lượt tải': d.downloads,
      'Link GitHub': d.githubUrl
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documents");
    XLSX.writeFile(wb, `Document_List_${new Date().toLocaleDateString()}.xlsx`);
  };

  const downloadAllZip = async () => {
    if (documents.length === 0) return;
    
    const toastId = toast.loading('Đang chuẩn bị kho file...');
    try {
      const zip = new JSZip();
      const documentFolder = zip.folder("Document_Vault");

      const fetchPromises = documents.map(async (doc) => {
        try {
          const response = await fetch(doc.githubUrl);
          const blob = await response.blob();
          documentFolder?.file(doc.githubPath.split('/').pop() || doc.name, blob);
        } catch (err) {
          console.error(`Failed to fetch ${doc.name}`, err?.message || String(err));
        }
      });

      await Promise.all(fetchPromises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Full_Document_Vault.zip");
      toast.success('Tải xuống ZIP hoàn tất!', { id: toastId });
    } catch (error) {
      toast.error('Lỗi khi nén file', { id: toastId });
    }
  };

  const shareLink = (docId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?view=${docId}${window.location.hash}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép liên kết trực tiếp!');
  };

  const filteredDocs = documents.filter(doc => {
    // Sync with admin side: filter deleted
    if (doc.isDeleted) return false;

    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.note.toLowerCase().includes(searchTerm.toLowerCase());
    const khacCat = categories.find(c => c.name === 'Khác');
    const matchesCategory = selectedCategory === 'all' || 
                            doc.categoryId === selectedCategory ||
                            (selectedCategory === khacCat?.id && (doc.categoryId === '' || !doc.categoryId));
    const matchesHighlight = showOnlyHighlighted ? doc.id === highlightId : true;
    
    // Non-admin can't see hidden files
    if (!isAdmin && doc.hidden) return false;
    
    return matchesSearch && matchesCategory && matchesHighlight;
  });

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['doc', 'docx'].includes(ext!)) return <FileText className="text-blue-500" />;
    if (['xls', 'xlsx'].includes(ext!)) return <FileSpreadsheet className="text-emerald-500" />;
    if (ext === 'pdf') return <FileIcon className="text-rose-500" />;
    if (['png', 'jpg', 'jpeg'].includes(ext!)) return <FileIcon className="text-purple-500" />;
    return <FileQuestion className="text-slate-400 dark:text-zinc-500" />;
  };

  const getFormatBadgeColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'text-rose-600 bg-rose-100 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20';
    if (['doc', 'docx'].includes(ext!)) return 'text-blue-600 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20';
    if (['xls', 'xlsx'].includes(ext!)) return 'text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20';
    if (['png', 'jpg', 'jpeg'].includes(ext!)) return 'text-purple-600 bg-purple-100 border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20';
    return 'text-slate-600 bg-slate-200 border-slate-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-white/10';
  };

  const handleEditInit = (docItem: AdminDocument) => {
    setEditingDoc(docItem);
    setEditForm({ name: docItem.name, categoryId: docItem.categoryId || '', note: docItem.note || '', hidden: docItem.hidden || false });
  };

  const handleUpdateDocument = async () => {
    if (!editingDoc) return;
    try {
      const cat = categories.find(c => c.id === editForm.categoryId);
      await updateDoc(doc(db, 'documents', editingDoc.id), {
        name: editForm.name,
        categoryId: editForm.categoryId,
        categoryName: cat ? cat.name : '',
        note: editForm.note,
        hidden: editForm.hidden
      });
      toast.success('Đã cập nhật văn bản');
      setEditingDoc(null);
    } catch (e) {
      toast.error('Lỗi khi cập nhật!');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-transparent">
        <AppLogo className="w-16 h-16 mb-4" isLoading={true} />
        <p className="text-slate-500 dark:text-zinc-400 font-medium tracking-wide">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-6 lg:px-12 py-8 lg:py-12 relative min-h-screen">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5 mb-10 group w-fit"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay Lại
      </button>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        {/* Header Section */}
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full">
            <FolderOpen className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Nucleus File Storage</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-medium text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
            Kho <span className="text-indigo-600 dark:text-indigo-400">Văn Bản.</span>
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 text-sm md:text-base font-medium leading-relaxed">
            Hệ thống quản lý tài liệu, biểu mẫu, và văn bản chia sẻ nội bộ bằng Github Storage Repository.
          </p>
        </div>

        {/* Global Actions Removed */}
      </div>

      {/* Filter and Search Bar */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
      />
      <div 
        className={cn(
          "sticky top-0 z-50 transition-all duration-500",
          isScrolled 
            ? "py-2 -mx-6 lg:-mx-12 px-6 lg:px-12 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 shadow-2xl shadow-indigo-500/5 mt-0" 
            : "py-2 lg:py-0 bg-transparent mt-0 lg:-mt-4 mb-4"
        )}
      >
        <div 
          className={cn(
            "transition-all duration-500",
            isScrolled ? "max-w-2xl mx-auto" : "max-w-2xl mx-auto"
          )}
        >
          <div className={cn(
            "premium-card transition-all duration-500 flex flex-col md:flex-row items-center gap-2",
            isScrolled 
              ? "p-2 bg-white/40 dark:bg-white/[0.02] border-none shadow-none rounded-2xl" 
              : "p-2 bg-slate-50/50 dark:bg-zinc-900/20 rounded-2xl border border-slate-200/50 dark:border-white/5"
          )}>
            <div className="relative flex-1 w-full group">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                isScrolled ? "text-indigo-500" : "text-slate-400 dark:text-zinc-500"
              )} />
              <input 
                type="text" 
                placeholder="Tìm kiếm văn bản, biểu mẫu..."
                className={cn(
                  "w-full pl-9 pr-4 transition-all duration-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white",
                  isScrolled 
                    ? "py-2 bg-transparent border-none" 
                    : "py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className={cn(
              "flex items-center gap-2 w-full md:w-auto transition-all duration-500",
              isScrolled ? "opacity-90" : "opacity-100"
            )}>
              <div className="relative flex-1 md:w-40 group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-500 transition-colors" />
                <select 
                  className={cn(
                    "w-full pl-9 pr-8 transition-all duration-500 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-300 font-bold uppercase tracking-wider",
                    isScrolled 
                      ? "py-2 bg-transparent border-none" 
                      : "py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl"
                  )}
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    if (viewMode === 'explorer') setExplorerCategory(null);
                  }}
                >
                  <option value="all">Tất cả</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  {!categories.some(c => c.name === 'Khác') && (
                    <option value="">Chưa phân loại</option>
                  )}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none opacity-50" />
              </div>

              <div className={cn(
                "hidden md:flex p-1 rounded-xl shrink-0 transition-all duration-500 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-white/10",
                isScrolled ? "scale-90" : ""
              )}>
                 <div className="p-2 text-indigo-400">
                   <FolderOpen size={16} />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {highlightId && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-[2rem] bg-indigo-950/5 dark:bg-indigo-500/5 border border-indigo-200/50 dark:border-indigo-500/20 shadow-xl shadow-indigo-100/50 dark:shadow-none backdrop-blur-md relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Share2 size={24} />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Xem văn bản qua liên kết</h4>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-300 font-medium tracking-tight">Bạn đang truy cập tài liệu qua một đường dẫn chia sẻ cụ thể.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowOnlyHighlighted(!showOnlyHighlighted)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  showOnlyHighlighted 
                    ? "bg-indigo-600 text-white border-indigo-600" 
                    : "bg-white/50 dark:bg-zinc-900/50 text-slate-700 dark:text-zinc-300 border-indigo-200/50 dark:border-indigo-500/20"
                )}
              >
                {showOnlyHighlighted ? "Hiện tất cả" : "Chỉ hiện này"}
              </button>
              <button 
                onClick={() => {
                  setHighlightId(null);
                  setShowOnlyHighlighted(false);
                  const newUrl = window.location.pathname + window.location.hash;
                  window.history.replaceState({ path: newUrl }, '', newUrl);
                }}
                className="p-3 bg-white/50 dark:bg-zinc-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid / List Content */}
      {viewMode === 'explorer' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb with Back Button */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setExplorerCategory(null)}>
                  <Monitor size={12} /> This PC
                </span>
                <ChevronRight size={10} className="opacity-50" />
                <span className="text-slate-900 dark:text-zinc-300">
                   {explorerCategory ? categories.find(c => c.id === explorerCategory)?.name : "Categories"}
                </span>
              </div>
              
              {explorerCategory && (
                <div className="flex items-center gap-3">
                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />
                  <button 
                    onClick={() => setExplorerCategory(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-all group"
                  >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Quay Lại
                  </button>
                </div>
              )}
          </div>

          <AnimatePresence mode="wait">
            {!explorerCategory ? (
              <motion.div 
                key="cat-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setExplorerCategory(cat.id)}
                    className="group flex flex-col p-6 bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-3xl hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-all text-left shadow-sm h-full"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-indigo-100 dark:border-indigo-500/20 mb-6">
                       <FolderOpen size={32} />
                    </div>
                    <div className="flex-1 w-full flex flex-col justify-between">
                       <div>
                         <h4 className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-tight text-lg mb-2 truncate w-full">{cat.name}</h4>
                         <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium mb-6 line-clamp-2">Hệ thống lưu trữ tài liệu phân loại cho {cat.name}.</p>
                       </div>
                       <div className="space-y-2">
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(90, (documents.filter(d => {
                                 if (d.categoryId === cat.id) return true;
                                 if (cat.name === 'Khác' && (d.categoryId === '' || !d.categoryId)) return true;
                                 return false;
                               }).length / Math.max(1, documents.length)) * 100)}%` }}
                               className="h-full bg-indigo-500"
                             />
                          </div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex justify-between items-center">
                             <span>Storage</span>
                             <span className="text-indigo-500">{documents.filter(d => {
                               if (d.categoryId === cat.id) return true;
                               if (cat.name === 'Khác' && (d.categoryId === '' || !d.categoryId)) return true;
                               return false;
                             }).length} items</span>
                          </p>
                       </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="doc-list"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {documents.filter(d => {
                  const khacCat = categories.find(c => c.name === 'Khác');
                  return d.categoryId === explorerCategory || (explorerCategory === khacCat?.id && (d.categoryId === '' || !d.categoryId));
                }).map((docItem, idx) => (
                  <DocumentCard 
                    key={docItem.id} 
                    docItem={docItem} 
                    idx={idx}
                    onPreview={handlePreview} 
                    onDownload={handleDownload} 
                    onShare={shareLink} 
                    onDelete={handleDelete}
                    onEdit={handleEditInit}
                    isAdmin={isAdmin} 
                    getFileIcon={getFileIcon}
                    getFormatBadgeColor={getFormatBadgeColor}
                    isHighlighted={docItem.id === highlightId}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in premium-card border-dashed bg-transparent">
           <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-6">
              <FileQuestion size={32} />
           </div>
           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Không tìm thấy tài liệu</h3>
           <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc phân loại.</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="overflow-x-auto">
             <table className="min-w-[850px] lg:min-w-0 w-full text-left table-auto">
               <thead>
                 <tr className="border-b border-slate-100 dark:border-white/5">
                   <th className="px-2 md:px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 md:w-24 text-left">Định dạng</th>
                   <th className="px-2 md:px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Tên hiển thị</th>
                   <th className="px-2 md:px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left w-40 md:w-44">Danh mục</th>
                   <th className="hidden lg:table-cell px-2 md:px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-48">Ngày tạo</th>
                   <th className="px-2 md:px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36 md:w-44">Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                 {filteredDocs.map((docItem) => (
                   <tr key={docItem.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                     <td className="px-2 md:px-4 py-4 text-left w-20 md:w-24">
                       <span className={cn("font-mono text-[9px] md:text-[10px] px-1.5 md:px-2 py-1 rounded uppercase tracking-wider border", getFormatBadgeColor(docItem.githubPath))}>
                         {docItem.githubPath.split('.').pop()?.toUpperCase()}
                       </span>
                     </td>
                     <td className="px-2 md:px-4 py-4 font-bold text-[13px] md:text-sm text-slate-800 dark:text-zinc-200 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg" onClick={() => handlePreview(docItem)} title={docItem.name}>
                       {docItem.name}
                     </td>
                     <td className="px-2 md:px-4 py-4 text-[11px] md:text-sm text-slate-500 text-left w-40 md:w-44 truncate" title={docItem.categoryName || 'Chưa phân loại'}>
                       {docItem.categoryName || 'Chưa phân loại'}
                     </td>
                     <td className="hidden lg:table-cell px-2 md:px-4 py-4 text-[10px] md:text-xs text-slate-400 text-right w-48 whitespace-nowrap">
                        {docItem.createdAt ? new Date(docItem.createdAt?.seconds * 1000).toLocaleString() : 'N/A'}
                     </td>
                     <td className="px-2 md:px-4 py-4 text-right w-36 md:w-44 whitespace-nowrap">
                       <div className="flex justify-end gap-1 md:gap-2">
                         <button onClick={() => handlePreview(docItem)} className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Xem trước"><Eye size={16} /></button>
                         <button onClick={() => handleDownload(docItem)} className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Tải xuống"><Download size={16} /></button>
                         <button onClick={() => shareLink(docItem.id)} className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Chia sẻ"><Share2 size={16} /></button>
                         {isAdmin && (
                           <>
                             <button onClick={() => handleEditInit(docItem)} className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Chỉnh sửa"><Edit2 size={16} /></button>
                             <button onClick={() => handleDelete(docItem)} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 transition-colors" title="Xóa"><Trash2 size={16} /></button>
                           </>
                         )}
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

          {hasMore && documents.length < 100 && (
            <div className="flex justify-center pt-8">
              <button 
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/10 transition-all flex items-center gap-3 disabled:opacity-50 shadow-sm"
              >
                {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Tải Thêm"}
              </button>
            </div>
          )}
        </div>
      )}
      {editingDoc && (
        <Modal isOpen={!!editingDoc} onClose={() => setEditingDoc(null)} title="Chỉnh sửa văn bản">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tên văn bản</label>
              <input 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Phân loại</label>
              <select 
                value={editForm.categoryId} 
                onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white appearance-none"
              >
                <option value="">Không phân loại</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Ghi chú / Mật khẩu</label>
              <input 
                value={editForm.note} 
                onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                placeholder="Ghi chú thêm... (mật khẩu giải nén v.v...)"
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white" 
              />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input 
                type="checkbox" 
                id="hidden" 
                checked={editForm.hidden}
                onChange={e => setEditForm({ ...editForm, hidden: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
              />
              <label htmlFor="hidden" className="text-sm font-medium text-slate-700 dark:text-zinc-300">Ẩn văn bản này với thành viên</label>
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={handleUpdateDocument}
                className="flex-1 py-4 rounded-2xl bg-indigo-600 dark:bg-white text-white dark:text-slate-950 font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Cập Nhật
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// Minimal Components

const DocumentCard = ({ docItem, idx = 0, onPreview, onDownload, onShare, onDelete, onEdit, isAdmin, getFileIcon, getFormatBadgeColor, isHighlighted }: any) => {
  return (
    <motion.div
      id={`doc-${docItem.id}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isHighlighted ? 1.02 : 1,
        borderColor: isHighlighted ? 'var(--color-indigo-500)' : undefined,
        boxShadow: isHighlighted ? '0 0 30px rgba(99, 102, 241, 0.15)' : undefined
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: (idx % 12) * 0.05 }}
      className={cn(
        "premium-card group relative flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-white/5 rounded-3xl transition-all h-full min-h-[360px]",
        isHighlighted && "ring-2 ring-indigo-500 ring-offset-4 dark:ring-offset-zinc-950 z-10"
      )}
    >
      {/* File Type Visual Header */}
      <div className="h-32 bg-slate-50 dark:bg-black/20 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/5 transition-colors duration-500 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 dark:to-white/[0.02] pointer-events-none" />
          <div className="relative transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
             {getFileIcon(docItem.githubPath)}
          </div>
          {isHighlighted && (
            <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
              <Zap size={10} fill="currentColor" className="animate-pulse" /> Focus
            </div>
          )}
      </div>

      <div className="p-6 flex flex-col flex-1 min-w-0">
        <div className="flex-1 space-y-3 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20 max-w-full truncate">
              {docItem.categoryName}
            </span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border", getFormatBadgeColor(docItem.githubPath))}>
               {docItem.githubPath.split('.').pop()?.toUpperCase()} Document
            </span>
          </div>
          
          <h4 className="font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 text-lg group-hover:text-indigo-600 transition-colors break-words w-full" title={docItem.name}>
            {docItem.name}
          </h4>
          
          <p className="text-xs text-slate-500 dark:text-zinc-500 italic line-clamp-2 leading-relaxed break-words">
            {docItem.note || "Không có nội dung mô tả đính kèm."}
          </p>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Views</span>
                 <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{docItem.views || 0}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Saves</span>
                 <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{docItem.downloads || 0}</span>
               </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => onPreview(docItem)}
                  className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all"
                  title="Xem trước"
                >
                  <Eye size={16} />
                </button>
                <button 
                  onClick={() => onDownload(docItem)}
                  className="p-2.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all"
                  title="Tải xuống"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={() => onShare(docItem.id)}
                  className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all"
                  title="Chia sẻ"
                >
                  <Share2 size={16} />
                </button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => onEdit(docItem)}
                      className="p-2.5 text-slate-300 hover:text-indigo-500 dark:text-zinc-700 dark:hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                      title="Chỉnh sửa (Admin)"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(docItem)}
                      className="p-2.5 text-slate-300 hover:text-rose-500 dark:text-zinc-700 dark:hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Xóa tài liệu"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AdminActionItem = ({ icon: Icon, title, desc, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 flex items-center gap-4 group hover:border-indigo-500/30 hover:shadow-xl transition-all text-left"
  >
     <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-zinc-950 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all border border-slate-100 dark:border-white/5">
        <Icon size={20} />
     </div>
     <div className="flex-1 min-w-0 pr-2">
        <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 truncate">{title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium leading-snug line-clamp-2">{desc}</p>
     </div>
     <ChevronRight size={16} className="text-slate-300 dark:text-zinc-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
  </button>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "md:max-w-xl" }: any) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn("fixed left-4 right-4 top-[10%] md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 z-[130] w-auto md:w-full max-h-[80vh] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden", maxWidth)}
        >
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0">
             <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{title}</h2>
             <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                <X size={18} className="text-slate-500 dark:text-zinc-400" />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const CategoryManagerModal = ({ isOpen, onClose, categories }: any) => {
  const { openConfirm } = useConfirmStore();
  const [newCat, setNewCat] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    try {
      await addDoc(collection(db, 'document_categories'), { name: newCat.trim() });
      setNewCat('');
      toast.success('Đã thêm danh mục mới');
    } catch (e) { toast.error('Lỗi khi thêm danh mục'); }
  };

  const handleUpdateCat = async (id: string) => {
    if (!editValue.trim()) return;
    try {
      await updateDoc(doc(db, 'document_categories', id), { name: editValue.trim() });
      
      const q = query(collection(db, 'documents'), where('categoryId', '==', id));
      const snap = await getDocs(q);
      const batchPromises = snap.docs.map(d => updateDoc(doc(db, 'documents', d.id), { categoryName: editValue.trim() }));
      await Promise.all(batchPromises);

      setEditingCatId(null);
      toast.success('Đã cập nhật danh mục thành công');
    } catch (e) { toast.error('Lỗi khi cập nhật danh mục'); }
  };

  const handleDeleteCat = (id: string) => {
    openConfirm({
      title: 'Xóa phân loại tài liệu',
      message: 'Xóa danh mục sẽ khiến các văn bản trong danh mục chuyển sang trạng thái tự do. Tiếp tục?',
      confirmText: 'Đồng ý xóa',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'document_categories', id));
          toast.success('Đã xóa bỏ danh mục');
        } catch (e) { toast.error('Lỗi khi xóa'); }
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản Lý Phân Loại">
       <div className="space-y-6">
          <div className="flex items-center gap-3">
             <input 
               type="text" 
               className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-all" 
               placeholder="Nhập tên phân loại mới..."
               value={newCat}
               onChange={(e) => setNewCat(e.target.value)}
             />
             <button onClick={handleAddCat} className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 shrink-0">
               <Plus size={24} />
             </button>
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto no-scrollbar">
             {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 transition-all">
                   {editingCatId === cat.id ? (
                      <div className="flex items-center w-full gap-3">
                         <input 
                           autoFocus
                           className="flex-1 bg-white dark:bg-black px-4 py-2 rounded-lg border border-indigo-500/50 outline-none text-sm text-slate-900 dark:text-white font-medium"
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                         />
                         <button onClick={() => handleUpdateCat(cat.id)} className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg"><Save size={18} /></button>
                         <button onClick={() => setEditingCatId(null)} className="p-2 bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400 rounded-lg"><X size={18} /></button>
                      </div>
                   ) : (
                      <>
                        <span className="font-bold text-sm text-slate-700 dark:text-zinc-200">{cat.name}</span>
                        <div className="flex items-center gap-1">
                           <button onClick={() => { setEditingCatId(cat.id); setEditValue(cat.name); }} className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm border border-slate-200 dark:border-white/5"><Edit2 size={16} /></button>
                           <button onClick={() => handleDeleteCat(cat.id)} className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-500 transition-colors shadow-sm border border-slate-200 dark:border-white/5"><Trash2 size={16} /></button>
                        </div>
                      </>
                   )}
                </div>
             ))}
             {categories.length === 0 && (
               <div className="text-center py-6">
                  <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">Chưa có danh mục nào. Hãy thiết lập danh mục mới!</p>
               </div>
             )}
          </div>
       </div>
    </Modal>
  );
};

const ConfigModal = ({ isOpen, onClose, current }: any) => {
  const [token, setToken] = useState(current?.token || '');
  const [owner, setOwner] = useState(current?.owner || '');
  const [repo, setRepo] = useState(current?.repo || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) {
      setToken(current.token);
      setOwner(current.owner);
      setRepo(current.repo);
    }
  }, [current]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'github_integration'), {
        token, owner, repo
      });
      toast.success('Đã lưu cấu hình Github Repository');
      onClose();
    } catch (e) {
      toast.error('Có lỗi xảy ra khi lưu trữ thông tin');
    } finally {
       setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cấu hình hệ thống lưu trữ">
       <form onSubmit={handleSave} className="space-y-6">
          <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-6">
             <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 leading-relaxed text-justify">
                   Chú ý: Bạn cần tạo <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="underline underline-offset-2">Github Personal Access Token (PAT)</a> với quyền điều khiển `<code className="bg-indigo-100 dark:bg-indigo-500/30 px-1 rounded">repo</code>` để cho phép hệ thống tải tệp trực tiếp lên Github Account. Toàn bộ thiết lập được lưu trữ bảo mật trên môi trường Database riêng tư.
                </p>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Personal Access Token</label>
             <input 
               type="password" 
               className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
               placeholder="ghp_xxxxxxxxxxxxxxxxx"
               value={token}
               onChange={(e) => setToken(e.target.value)}
               required
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Username (Owner)</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                  placeholder="github-username"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  required
                />
             </div>
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Repo Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                  placeholder="my-vault-repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  required
                />
             </div>
          </div>

          <button 
            disabled={saving}
            className="w-full py-4 mt-4 rounded-2xl bg-indigo-600 dark:bg-white text-white dark:text-slate-950 font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Hệ thống đang cấu hình...' : 'Lưu Thay Đổi Thông Số'}
          </button>
       </form>
    </Modal>
  );
};

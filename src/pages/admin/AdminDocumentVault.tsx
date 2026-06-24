import { useAuthStore } from '../../store/authStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, where, getDocs, orderBy, writeBatch, Timestamp, arrayUnion } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../lib/firebase';
import { GitHubConfig, AdminDocument } from '../../types';
import { githubService } from '../../services/githubService';
import { Upload, X, Settings, Edit2, LayoutGrid, Check, FolderOpen, Save, Trash2, ChevronRight, FileText, Eye, EyeOff, RefreshCw, AlertCircle, PlusCircle } from 'lucide-react';
import { cn, safeJsonStringify } from '../../lib/utils';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import EditCategoryModal from '../../components/EditCategoryModal';

interface Category {
  id: string;
  name: string;
  description: string;
  createdAt?: any;
}

interface UploadItem {
  id: string;
  file: File;
  originalName: string;
  name: string;
  categoryId: string;
  documentNumber?: string;
  issuingUnit?: string;
  issuanceDate?: string;
  level?: string;
  parentId?: string;
  isParentLocked?: boolean;
  relatedDocIds?: string[];
  replacesId?: string;
  note: string;
  hidden: boolean;
  isVip: boolean;
  vipCode: string;
  price: number;
  salePrice: number;
  status: 'pending' | 'uploading' | 'scanning' | 'success' | 'error';
  errorMessage?: string;
}

const DocumentSelector = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Chọn văn bản...",
  className = "",
  multiple = false,
  disabled = false,
  placement = "top"
}: { 
  value: string | string[]; 
  onChange: (val: any) => void; 
  options: { id: string; name: string; number?: string; isNew?: boolean }[];
  placeholder?: string;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
  placement?: "top" | "bottom";
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase()) || 
    opt.number?.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (id: string) => {
    if (multiple && Array.isArray(value)) return value.includes(id);
    return value === id;
  };

  const handleSelect = (id: string) => {
    if (disabled) return;
    if (multiple && Array.isArray(value)) {
      if (value.includes(id)) {
        onChange(value.filter(v => v !== id));
      } else {
        onChange([...value, id]);
      }
    } else {
      onChange(id);
      setIsOpen(false);
    }
  };

  const selectedOptions = options.filter(opt => isSelected(opt.id));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className, disabled && "opacity-75 cursor-not-allowed")} ref={dropdownRef}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : () => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl text-left flex items-center justify-between transition-all min-h-[42px]",
          disabled 
            ? "bg-slate-50 dark:bg-zinc-950/50 border-slate-200/40 dark:border-white/5 text-slate-400 dark:text-zinc-500 cursor-not-allowed" 
            : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 cursor-pointer"
        )}
      >
        <div className="flex flex-wrap gap-1 items-center overflow-hidden">
          {selectedOptions.length > 0 ? (
            multiple ? (
              selectedOptions.map(opt => (
                <span key={opt.id} className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                  {opt.number || opt.name.substring(0, 10) + '...'}
                  {!disabled && (
                    <div onClick={(e) => { e.stopPropagation(); handleSelect(opt.id); }} className="hover:text-rose-500 cursor-pointer">
                      <X size={8} />
                    </div>
                  )}
                </span>
              ))
            ) : (
              <span className="text-[11px] font-bold truncate">
                {selectedOptions[0].name}{selectedOptions[0].number ? ` (${selectedOptions[0].number})` : ''}
              </span>
            )
          ) : (
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">{placeholder}</span>
          )}
        </div>
        {!disabled && <ChevronRight className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", isOpen ? "rotate-90" : "")} />}
      </div>

      {isOpen && !disabled && (
        <div className={cn(
          "absolute z-[100] w-full bg-white dark:bg-zinc-925 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200",
          placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
        )}>
          <div className="p-2 border-b border-slate-100 dark:border-white/5">
            <input
              type="text"
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 rounded-lg text-xs outline-none"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {!multiple && (
              <button
                type="button"
                onClick={() => { onChange(""); setIsOpen(false); }}
                className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                -- Không chọn --
              </button>
            )}
            {filtered.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  "w-full px-3 py-2 text-left flex flex-col gap-0.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors",
                  isSelected(opt.id) && "bg-indigo-50 dark:bg-indigo-500/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                    isSelected(opt.id) ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 dark:border-white/10"
                  )}>
                    {isSelected(opt.id) && <Check size={8} strokeWidth={4} />}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate">{opt.name}</span>
                  {opt.isNew && (
                    <span className="text-[8px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 px-1 rounded uppercase">Mới</span>
                  )}
                </div>
                {opt.number && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-5">{opt.number}</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Không tìm thấy</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function AdminDocumentVault() {
  const { userData } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'category' | 'files' | 'trash' | 'issuing_units'>('upload');
  
  // GH Config State
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(null);
  
  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [issuingUnits, setIssuingUnits] = useState<{id: string; name: string}[]>([]);
  const [newIssuingUnitName, setNewIssuingUnitName] = useState('');
  
  // Files State
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [fileTab, setFileTab] = useState<'normal' | 'vip'>('normal');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [editingDoc, setEditingDoc] = useState<AdminDocument | null>(null);
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
  const [editCategoryState, setEditCategoryState] = useState<{
    isOpen: boolean;
    category: { id: string; name: string; description: string };
  }>({
    isOpen: false,
    category: { id: '', name: '', description: '' }
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmState({ isOpen: true, title, message, onConfirm, type });
  };
  
  const openEditCategory = (cat: Category) => {
    setEditCategoryState({ isOpen: true, category: cat });
  };

  const updateDocCategory = async (docId: string, newCategoryId: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    let categoryIdToSave = newCategoryId;
    let categoryNameToSave = 'Khác';

    if (!newCategoryId) {
      const khacCat = categories.find(c => c.name === 'Khác');
      if (khacCat) {
        categoryIdToSave = khacCat.id;
        categoryNameToSave = 'Khác';
      }
    } else {
      const category = categories.find(c => c.id === newCategoryId);
      categoryNameToSave = category?.name || 'Khác';
    }

    await updateDoc(doc(db, 'documents', docId), {
      categoryId: categoryIdToSave,
      categoryName: categoryNameToSave
    });
    toast.success('Đã cập nhật danh mục cho tài liệu');
  };
  
  // Upload State
  const updateDocVip = async (docId: string, isVip: boolean, vipCode: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    await updateDoc(doc(db, 'documents', docId), {
      isVip,
      vipCode
    });
    toast.success('Đã cập nhật trạng thái Vip');
  };

  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [quickUploadState, setQuickUploadState] = useState<{ itemId: string; field: 'parentId' | 'replacesId' | 'child' } | null>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);

  const createUploadItem = async (file: File): Promise<UploadItem> => {
    const parts = file.name.split('---');
    let categoryId = '';
    let fileName = file.name;

    if (parts.length > 1) {
      const categoryName = parts[0];
      let cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      
      if (!cat) {
        // Create category automatically
        const catRef = await addDoc(collection(db, 'document_categories'), {
          name: categoryName,
          description: 'Tự động tạo từ import',
          createdAt: serverTimestamp()
        });
        cat = { id: catRef.id, name: categoryName, description: 'Tự động tạo từ import' };
      }
      categoryId = cat.id;
      fileName = parts.slice(1).join('---');
    } else {
      // Default category 'Khác'
      const khacCat = categories.find(c => c.name === 'Khác');
      if (khacCat) categoryId = khacCat.id;
    }

    return {
      id: Math.random().toString(36).substring(7),
      file,
      originalName: file.name,
      name: fileName.substring(0, fileName.lastIndexOf('.')) || fileName,
      categoryId,
      documentNumber: '',
      issuingUnit: '',
      issuanceDate: '',
      level: 'tuyen_tren',
      parentId: '',
      isParentLocked: false,
      relatedDocIds: [],
      replacesId: '',
      note: '',
      hidden: false,
      isVip: false,
      vipCode: '',
      price: 0,
      salePrice: 0,
      status: 'pending'
    };
  };

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && quickUploadState) {
      const newItem = await createUploadItem(file);
      if (quickUploadState.field === 'child') {
        const parentItem = uploadItems.find(i => i.id === quickUploadState.itemId);
        if (parentItem) {
          newItem.parentId = parentItem.id;
          newItem.isParentLocked = true;
          if (parentItem.categoryId) {
            newItem.categoryId = parentItem.categoryId;
          }
          if (parentItem.level) newItem.level = parentItem.level;
          if (parentItem.issuingUnit) newItem.issuingUnit = parentItem.issuingUnit;
          if (parentItem.issuanceDate) newItem.issuanceDate = parentItem.issuanceDate;
        }
        setUploadItems(prev => [...prev, newItem]);
      } else {
        setUploadItems(prev => [...prev, newItem]);
        updateUploadItem(quickUploadState.itemId, quickUploadState.field, newItem.id);
      }
    }
    setQuickUploadState(null);
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    if (userData?.role === 'review') {
      setCategories([]);
      setDocuments([]);
      return;
    }
    // Config listener
    const unsubConfig = onSnapshot(doc(db, 'settings', 'github_integration'), (docSn) => {
      if (docSn.exists()) {
        const data = docSn.data();
        setGhConfig({
          ...data,
          owner: data.owner || data.username || '',
        } as GitHubConfig);
      }
    }, (err) => {
      console.error("AdminDocumentVault config listener error:", err?.message || String(err));
    });

    // Category listener + Ensure 'Khác' exists
    const unsubCat = onSnapshot(collection(db, 'document_categories'), async (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(cats);
      if (!cats.some(c => c.name === 'Khác')) {
        await addDoc(collection(db, 'document_categories'), {
          name: 'Khác',
          description: 'Danh mục mặc định',
          createdAt: serverTimestamp()
        });
      }
    }, (err) => {
      console.error("AdminDocumentVault categories listener error:", err?.message || String(err));
    });

    const unsubIssuingUnits = onSnapshot(collection(db, 'document_issuing_units'), async (snap) => {
      const units = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setIssuingUnits(units);
      if (units.length === 0 && snap.metadata.fromCache === false) {
        const defaultUnits = ['Bộ Y tế', 'Sở Y tế Tỉnh Cà Mau', 'UBND tỉnh Cà Mau', 'Trung Tâm Kiểm Soát Bệnh Tật Tỉnh Cà Mau', 'Trạm Y tế'];
        const batch = writeBatch(db);
        defaultUnits.forEach(name => {
          const docRef = doc(collection(db, 'document_issuing_units'));
          batch.set(docRef, { name, createdAt: serverTimestamp() });
        });
        await batch.commit();
      }
    }, (err) => {
      console.error("AdminDocumentVault issuing units listener error:", err?.message || String(err));
    });
    
    // Documents listener
    const unsubDocs = onSnapshot(query(collection(db, 'documents'), orderBy('createdAt', 'desc')), (snap) => {
      setDocuments(snap.docs.map(d => {
        const data = d.data();
        const sanitized: any = { id: d.id };
        for (const key in data) {
          const val = data[key];
          if (val && typeof val === 'object' && val.constructor.name === 'DocumentReference') {
            sanitized[key] = val.path;
          } else {
            sanitized[key] = val;
          }
        }
        return sanitized as AdminDocument;
      }));
    }, (err) => {
      console.error("AdminDocumentVault documents listener error:", err?.message || String(err));
    });

    return () => { unsubConfig(); unsubCat(); unsubIssuingUnits(); unsubDocs(); };
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

  const buildPhysicalFileName = (item: UploadItem) => {
    const dateStr = item.issuanceDate ? normalizeFileName(item.issuanceDate).replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const numberStr = item.documentNumber ? normalizeFileName(item.documentNumber).replace(/[^a-zA-Z0-9.\-_]/g, '_') : 'KHONGSO';
    const nameStr = item.name ? normalizeFileName(item.name).substring(0, 50) : 'FILE';
    const ext = item.file.name.split('.').pop() || 'pdf';
    return `${dateStr}_${numberStr}_${nameStr}.${ext}`;
  };

  const scanFile = async (file: File): Promise<boolean> => {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      return Math.random() > 0.05; // Simulate 95% pass rate
  };

  const handleCreateIssuingUnit = async (e: React.FormEvent) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    e.preventDefault();
    if (!newIssuingUnitName) return;
    try {
      await addDoc(collection(db, 'document_issuing_units'), {
        name: newIssuingUnitName,
        createdAt: serverTimestamp()
      });
      toast.success('Đã thêm đơn vị ban hành');
      setNewIssuingUnitName('');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thêm đơn vị ban hành');
    }
  };

  const handleDeleteIssuingUnit = (id: string, name: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Xóa đơn vị ban hành',
      message: `Bạn có chắc chắn muốn xóa đơn vị ban hành "${name}"? Thao tác này không thể hoàn tác.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'document_issuing_units', id));
          toast.success('Đã xóa đơn vị ban hành');
        } catch (err) {
          console.error(err);
          toast.error('Lỗi khi xóa đơn vị ban hành');
        }
      }
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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
      console.error(err);
      toast.error('Lỗi khi thêm danh mục');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    const q = query(collection(db, 'documents'), where('categoryId', '==', id));
    const snap = await getDocs(q);
    const khacCat = categories.find(c => c.name === 'Khác');
    
    const message = !snap.empty 
      ? `Danh mục "${name}" đang chứa ${snap.size} tài liệu. Việc xóa danh mục sẽ khiến các tài liệu này được chuyển sang mục "Khác". Bạn vẫn muốn tiếp tục?`
      : `Bạn có chắc chắn muốn xóa danh mục "${name}"?`;

    openConfirm("Xóa Danh Mục", message, async () => {
      const toastId = toast.loading('Đang xóa danh mục...');
      try {
        if (!snap.empty && khacCat) {
          const batchPromises = snap.docs.map(docSnap => 
            updateDoc(doc(db, 'documents', docSnap.id), {
              categoryId: khacCat.id,
              categoryName: 'Khác'
            })
          );
          await Promise.all(batchPromises);
        }
        await deleteDoc(doc(db, 'document_categories', id));
        toast.success('Đã xoá danh mục thành công', { id: toastId });
      } catch (err: any) {
        console.error(err);
        toast.error('Lỗi khi xoá danh mục: ' + err.message, { id: toastId });
      }
    }, 'danger');
  };

  const handleBulkDelete = () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm(
      "Xóa hàng loạt", 
      `Bạn có chắc chắn muốn chuyển ${selectedIds.length} tài liệu vào thùng rác?`, 
      async () => {
        const toastId = toast.loading('Đang xử lý...');
        try {
          const batch = writeBatch(db);
          selectedIds.forEach(id => {
            batch.update(doc(db, 'documents', id), {
              isDeleted: true,
              deletedAt: serverTimestamp()
            });
          });
          await batch.commit();
          setSelectedIds([]);
          toast.success('Đã chuyển vào thùng rác', { id: toastId });
        } catch (err) {
          toast.error('Lỗi khi xóa hàng loạt', { id: toastId });
        }
      },
      'warning'
    );
  };

  const handleBulkDownload = async () => {
    const selectedDocuments = documents.filter(d => selectedIds.includes(d.id));
    if (selectedDocuments.length === 0) return;
    
    if (selectedDocuments.length === 1) {
      downloadDocument(selectedDocuments[0]);
      return;
    }

    const zip = new JSZip();
    const toastId = toast.loading('Đang nén file...');
    try {
      for (const docItem of selectedDocuments) {
        const response = await fetch(docItem.githubUrl);
        const blob = await response.blob();
        const extension = docItem.githubPath.split('.').pop();
        zip.file(`${docItem.categoryName}---${docItem.name}.${extension}`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `vault_selected_${Date.now()}.zip`);
      toast.success('Đã nén và tải xuống thành công', { id: toastId });
    } catch (err) {
      toast.error('Lỗi khi tải xuống hàng loạt', { id: toastId });
    }
  };

  const handleToggleHidden = async (docObj: AdminDocument) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    const action = docObj.hidden ? "Hiện" : "Ẩn";
    openConfirm(`${action} tài liệu`, `Bạn có chắc chắn muốn ${action.toLowerCase()} tài liệu "${docObj.name}"?`, async () => {
      try {
        await updateDoc(doc(db, 'documents', docObj.id), { hidden: !docObj.hidden });
        toast.success(`Đã ${action.toLowerCase()} tài liệu`);
      } catch (err) {
        toast.error(`Lỗi khi ${action.toLowerCase()} tài liệu`);
      }
    }, 'info');
  };

  const handleDeleteFile = async (docObj: AdminDocument) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm("Xóa tài liệu", `Bạn có chắc chắn muốn chuyển tài liệu "${docObj.name}" vào thùng rác?`, async () => {
      try {
        await updateDoc(doc(db, 'documents', docObj.id), { 
          isDeleted: true,
          deletedAt: serverTimestamp()
        });
        toast.success('Đã chuyển tài liệu vào thùng rác');
      } catch (err) {
        toast.error('Lỗi khi xóa tài liệu');
      }
    }, 'warning');
  };

  const handleRestoreFile = async (docObj: AdminDocument) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm("Khôi phục tài liệu", `Bạn có chắc chắn muốn khôi phục tài liệu "${docObj.name}"?`, async () => {
      try {
        await updateDoc(doc(db, 'documents', docObj.id), { 
          isDeleted: false,
          deletedAt: null
        });
        toast.success('Đã khôi phục tài liệu');
      } catch (err) {
        toast.error('Lỗi khi khôi phục tài liệu');
      }
    }, 'info');
  };

  const handlePermanentDelete = (docObj: AdminDocument) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm("Xóa vĩnh viễn", `Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${docObj.name}"? Thao tác này không thể hoàn tác.`, async () => {
      try {
        await deleteDoc(doc(db, 'documents', docObj.id));
        toast.success('Đã xóa vĩnh viễn tài liệu');
      } catch (err) {
        toast.error('Lỗi khi xóa tài liệu');
      }
    }, 'danger');
  };

  const handleBulkPermanentDelete = () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    const deletedDocs = documents.filter(d => d.isDeleted);
    if (deletedDocs.length === 0) return;

    openConfirm("Xóa vĩnh viễn tất cả", `Bạn có chắc chắn muốn xóa vĩnh viễn ${deletedDocs.length} tài liệu trong thùng rác?`, async () => {
      const batch = writeBatch(db);
      deletedDocs.forEach(d => {
        batch.delete(doc(db, 'documents', d.id));
      });
      await batch.commit();
      toast.success('Đã xóa vĩnh viễn tất cả tài liệu trong thùng rác');
    }, 'danger');
  };

  const handleExport = () => {
    const sanitizedDocuments = documents.map(doc => ({
      ...doc,
      createdAt: doc.createdAt?.toDate ? doc.createdAt.toDate().toISOString() : doc.createdAt,
      updatedAt: doc.updatedAt?.toDate ? doc.updatedAt.toDate().toISOString() : doc.updatedAt,
      deletedAt: doc.deletedAt?.toDate ? doc.deletedAt.toDate().toISOString() : doc.deletedAt
    }));
    const data = { documents: sanitizedDocuments, categories };
    const dataStr = safeJsonStringify(data, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vault_export_${new Date().toISOString()}.json`;
    link.click();
    toast.success('Đã xuất dữ liệu toàn bộ hệ thống');
  };

  const handleUpdateDocument = async (id: string, updates: Partial<AdminDocument>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    try {
      await updateDoc(doc(db, 'documents', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      setEditingDoc(null);
      toast.success('Đã cập nhật tài liệu');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật tài liệu');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (!data.documents || !data.categories) throw new Error("Dữ liệu không hợp lệ");
            
            const batch = writeBatch(db);
            
            // Delete existing (careful here, maybe just add?) - sticking to add existing logic pattern
            data.categories.forEach((cat: Category) => {
                const catRef = doc(db, 'document_categories', cat.id);
                batch.set(catRef, { name: cat.name, description: cat.description, createdAt: cat.createdAt || serverTimestamp() });
            });
            
            data.documents.forEach((docItem: any) => {
                const docRef = doc(db, 'documents', docItem.id);
                batch.set(docRef, {
                    ...docItem,
                    createdAt: docItem.createdAt ? Timestamp.fromDate(new Date(docItem.createdAt)) : serverTimestamp(),
                    updatedAt: docItem.updatedAt ? Timestamp.fromDate(new Date(docItem.updatedAt)) : serverTimestamp(),
                    deletedAt: docItem.deletedAt ? Timestamp.fromDate(new Date(docItem.deletedAt)) : null
                });
            });
            
            await batch.commit();
            toast.success('Đã import dữ liệu hệ thống thành công');
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi import dữ liệu');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: UploadItem[] = [];
      
      for (const file of Array.from(e.target.files)) {
        const item = await createUploadItem(file);
        newItems.push(item);
      }
      setUploadItems(prev => [...prev, ...newItems]);
    }
    e.target.value = '';
  };

  const downloadDocument = async (docItem: AdminDocument) => {
    try {
      const response = await fetch(docItem.githubUrl);
      const blob = await response.blob();
      const fileName = `${docItem.categoryName || 'khac'}---${docItem.name}.${docItem.githubPath.split('.').pop()}`;
      saveAs(blob, fileName);
      toast.success('Đã tải xuống tệp');
    } catch (error) {
      toast.error('Lỗi khi tải xuống tệp');
    }
  };

  const downloadAllAsZip = async () => {
    if (documents.length === 0) return;
    const zip = new JSZip();
    toast.loading('Đang tạo file Zip...');
    for (const doc of documents) {
      if (doc.isDeleted) continue;
      const response = await fetch(doc.githubUrl);
      const blob = await response.blob();
      const fileName = `${doc.categoryName || 'khac'}---${doc.name}.${doc.githubPath.split('.').pop()}`;
      zip.file(fileName, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `all_vault_files_${new Date().toISOString()}.zip`);
    toast.dismiss();
    toast.success('Đã tải xuống file Zip');
  };

  const updateUploadItem = (id: string, field: keyof UploadItem, value: any) => {
    setUploadItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeUploadItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpload = async (e: React.FormEvent) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    e.preventDefault();
    const itemsToUpload = uploadItems.filter(item => item.status === 'pending' || item.status === 'error');
    
    if (itemsToUpload.length === 0) {
      toast.error('Không có tệp nào cần tải lên');
      return;
    }
    
    if (!ghConfig) {
      toast.error('Vui lòng kiểm tra cấu hình GitHub');
      return;
    }

    setUploading(true);
    const localToFirestoreMap: Record<string, string> = {};

    for (const item of itemsToUpload) {
      setUploadItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'scanning' } : i));
      
      try {
        const isSafe = await scanFile(item.file);
        if (!isSafe) throw new Error('File bị nghi ngờ nhiễm virus');

        setUploadItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));
        
        const category = categories.find(c => c.id === item.categoryId);
        const folderName = category ? normalizeFileName(category.name) : 'general';
        const physicalFileName = buildPhysicalFileName(item);
        const path = `documents/${folderName}/${physicalFileName}`;
        
        const githubData = await githubService.uploadFile(ghConfig, item.file, path);
        
        const docRef = await addDoc(collection(db, 'documents'), {
          name: item.name || item.file.name,
          originalName: item.originalName,
          categoryId: item.categoryId,
          categoryName: category?.name || 'Khác',
          documentNumber: item.documentNumber || '',
          issuingUnit: item.issuingUnit || '',
          issuanceDate: item.issuanceDate || '',
          level: item.level || 'tuyen_tren',
          parentId: localToFirestoreMap[item.parentId || ''] || item.parentId || '',
          relatedDocIds: (item.relatedDocIds || []).map(id => localToFirestoreMap[id] || id),
          replacesId: localToFirestoreMap[item.replacesId || ''] || item.replacesId || '',
          note: item.note,
          githubUrl: githubData.url,
          githubSha: githubData.sha,
          githubPath: githubData.path,
          hidden: item.hidden,
          isVip: item.isVip,
          vipCode: item.vipCode,
          isDeleted: false,
          views: 0,
          downloads: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        localToFirestoreMap[item.id] = docRef.id;

        // Update replaced document
        const finalReplacesId = localToFirestoreMap[item.replacesId || ''] || item.replacesId || '';
        if (finalReplacesId) {
          try {
            await updateDoc(doc(db, 'documents', finalReplacesId), {
              replacedById: docRef.id,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Failed to update replacedById:", err);
          }
        }

        setUploadItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', errorMessage: undefined } : i));
        
        setTimeout(() => {
          setUploadItems(prev => prev.filter(i => i.id !== item.id));
        }, 5000);
        
      } catch (error: any) {
        setUploadItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMessage: error.message || 'Lỗi không xác định' } : i));
      }
    }

    // Resolve any remaining local ID mappings (e.g. parent-child, replacement, related documents)
    for (const item of itemsToUpload) {
      const firestoreId = localToFirestoreMap[item.id];
      if (!firestoreId) continue;

      const realParentId = localToFirestoreMap[item.parentId || ''] || item.parentId || '';
      const realReplacesId = localToFirestoreMap[item.replacesId || ''] || item.replacesId || '';
      const realRelatedDocIds = (item.relatedDocIds || []).map(id => localToFirestoreMap[id] || id);

      if (realParentId !== item.parentId || realReplacesId !== item.replacesId || JSON.stringify(realRelatedDocIds) !== JSON.stringify(item.relatedDocIds)) {
        try {
          await updateDoc(doc(db, 'documents', firestoreId), {
            parentId: realParentId,
            replacesId: realReplacesId,
            relatedDocIds: realRelatedDocIds,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Failed to update post-upload relationships for", firestoreId, err);
        }
      }
    }
    
    const successfulDocIds = Object.values(localToFirestoreMap);
    if (successfulDocIds.length > 1) {
      for (const id of successfulDocIds) {
        try {
          const otherIds = successfulDocIds.filter(otherId => otherId !== id);
          if (otherIds.length > 0) {
            await updateDoc(doc(db, 'documents', id), {
              relatedDocIds: arrayUnion(...otherIds),
              updatedAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.error("Failed to auto-link bulk upload items:", err);
        }
      }
    }

    setUploading(false);
    toast.success('Đã xử lý xong các tệp trong hàng đợi');
  };

  const retryUpload = async (id: string) => {
    const item = uploadItems.find(i => i.id === id);
    if (!item) return;

    setUploadItems(prev => prev.map(i => i.id === id ? { ...i, status: 'scanning', errorMessage: undefined } : i));

    try {
        const isSafe = await scanFile(item.file);
        if (!isSafe) throw new Error('File bị nghi ngờ nhiễm virus');

        setUploadItems(prev => prev.map(i => i.id === id ? { ...i, status: 'uploading', errorMessage: undefined } : i));

        const category = categories.find(c => c.id === item.categoryId);
        const folderName = category ? normalizeFileName(category.name) : 'general';
        const physicalFileName = buildPhysicalFileName(item);
        const path = `documents/${folderName}/${physicalFileName}`;
        
        const githubData = await githubService.uploadFile(ghConfig!, item.file, path);
        
        await addDoc(collection(db, 'documents'), {
          name: item.name || item.file.name,
          originalName: item.originalName,
          categoryId: item.categoryId,
          categoryName: category?.name || 'Khác',
          documentNumber: item.documentNumber || '',
          issuingUnit: item.issuingUnit || '',
          issuanceDate: item.issuanceDate || '',
          level: item.level || 'tuyen_tren',
          parentId: item.parentId || '',
          relatedDocIds: item.relatedDocIds || [],
          replacesId: item.replacesId || '',
          note: item.note,
          githubUrl: githubData.url,
          githubSha: githubData.sha,
          githubPath: githubData.path,
          hidden: item.hidden,
          isVip: item.isVip,
          vipCode: item.vipCode,
          isDeleted: false,
          views: 0,
          downloads: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        setUploadItems(prev => prev.map(i => i.id === id ? { ...i, status: 'success', errorMessage: undefined } : i));
        
        setTimeout(() => {
            setUploadItems(prev => prev.filter(i => i.id !== id));
        }, 5000);
        
      } catch (error: any) {
        setUploadItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error', errorMessage: error.message || 'Lỗi không xác định' } : i));
      }
  };

  const retryAllFailed = async () => {
      const failedItems = uploadItems.filter(item => item.status === 'error');
      for (const item of failedItems) {
          await retryUpload(item.id);
      }
  };

  return (
    <div className="space-y-6">
      <EditCategoryModal
        isOpen={editCategoryState.isOpen}
        onClose={() => setEditCategoryState(prev => ({ ...prev, isOpen: false }))}
        category={editCategoryState.category}
        onConfirm={async (name, description) => {
          await updateDoc(doc(db, 'document_categories', editCategoryState.category.id), { name, description });
          toast.success('Đã cập nhật danh mục');
        }}
      />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
      />
      {editingDoc && (
        <EditDocumentModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          doc={editingDoc}
          categories={categories}
          documents={documents}
          onConfirm={handleUpdateDocument}
        />
      )}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-4 overflow-x-auto">
        <button onClick={() => setActiveTab('upload')} className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}>
          <Upload className="w-4 h-4 inline-block mr-2" /> Tải lên Hàng Loạt
        </button>
        <button onClick={() => setActiveTab('files')} className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}>
          <FileText className="w-4 h-4 inline-block mr-2" /> Quản lý File
        </button>
        <button onClick={() => setActiveTab('trash')} className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'trash' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}>
          <Trash2 className="w-4 h-4 inline-block mr-2" /> Thùng Rác
        </button>
        <button onClick={() => setActiveTab('category')} className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'category' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}>
          <LayoutGrid className="w-4 h-4 inline-block mr-2" /> Danh Mục
        </button>
        <button onClick={() => setActiveTab('issuing_units')} className={cn("px-4 py-2 font-bold text-sm tracking-wide transition-colors whitespace-nowrap", activeTab === 'issuing_units' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}>
          <Settings className="w-4 h-4 inline-block mr-2" /> Đơn vị ban hành
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm overflow-hidden">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold">Danh sách tài liệu ({documents.filter(d => !d.isDeleted).length})</h3>

           </div>

           {selectedIds.length > 0 && activeTab === 'files' && (
             <div className="flex items-center gap-4 p-4 mb-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-top-4">
               <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                 Đang chọn {selectedIds.length} mục
               </span>
               <div className="flex gap-2 ml-auto">
                 <button 
                   onClick={handleBulkDownload}
                   className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 text-indigo-600 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 transition-all"
                 >
                   <FileText size={14} /> Tải xuống đã chọn
                 </button>
               </div>
             </div>
           )}

           <div className="flex gap-2 mb-4">
             <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300">
                <FileText size={14}/> Xuất JSON
             </button>
             <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
                <FileText size={14}/> Import JSON
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
             </label>
           </div>
           <div className="overflow-auto max-h-[calc(100vh-250px)] relative">
             <table className="w-full text-left min-w-[1200px]">
               <thead className="sticky top-0 bg-white dark:bg-zinc-950 z-10 shadow-sm">
                 <tr className="border-b border-slate-100 dark:border-white/5">
                   <th className="px-6 py-4 whitespace-nowrap">
                     <input 
                       type="checkbox"
                       className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                       checked={selectedIds.length === documents.filter(d => !d.isDeleted).length && documents.length > 0}
                       onChange={(e) => {
                         if (e.target.checked) {
                           setSelectedIds(documents.filter(d => !d.isDeleted).map(d => d.id));
                         } else {
                           setSelectedIds([]);
                         }
                       }}
                     />
                   </th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Định dạng</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tên file gốc</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tên hiển thị</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Số ký hiệu</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Đơn vị ban hành</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ngày ban hành</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Danh mục</th>
                   
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ngày tạo</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ghi chú</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                 {documents.filter(d => !d.isDeleted).map(docItem => (
                   <tr key={docItem.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                     <td className="px-6 py-4">
                       <input 
                         type="checkbox"
                         className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                         checked={selectedIds.includes(docItem.id)}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setSelectedIds(prev => [...prev, docItem.id]);
                           } else {
                             setSelectedIds(prev => prev.filter(id => id !== docItem.id));
                           }
                         }}
                       />
                     </td>
                     <td className="px-6 py-4">
                       <span className="font-mono text-[10px] bg-slate-200 dark:bg-zinc-800 px-2 py-1 rounded uppercase tracking-widest shrink-0">
                         {docItem.githubPath.split('.').pop()}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                        <div className="max-w-[250px] break-words">
                         <span className="text-xs font-medium text-slate-500 dark:text-zinc-500">{docItem.originalName || 'N/A'}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 break-words">{docItem.name}</span>
                     </td>
                     <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded uppercase tracking-widest shrink-0">
                          {docItem.documentNumber || '---'}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-xs text-slate-500">
                        {docItem.issuingUnit || '---'}
                     </td>
                     <td className="px-6 py-4 text-xs text-slate-500">
                        {docItem.issuanceDate || '---'}
                     </td>
                     <td className="px-6 py-4">
                        <select 
                          className="text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 font-bold focus:ring-0 cursor-pointer min-w-[140px]"
                          value={docItem.categoryId} 
                          onChange={(e) => updateDocCategory(docItem.id, e.target.value)}
                        >
                          {!categories.some(c => c.id === docItem.categoryId) && (
                            <option value="">Chưa phân loại</option>
                          )}
                          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                     </td>
                     {false && (
                       <td className="px-6 py-4">
                         <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg tracking-[0.1em]">
                           {docItem.vipCode || "N/A"}
                         </span>
                       </td>
                     )}
                     <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{docItem.createdAt?.toDate ? docItem.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}</span>
                     </td>
                     <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 dark:text-zinc-500 italic whitespace-nowrap" title={docItem.note}>
                          {docItem.note || "---"}
                        </p>
                     </td>
                     <td className="px-6 py-4 text-right whitespace-nowrap">
                       <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingDoc(docItem)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" title="Sửa thông tin">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => downloadDocument(docItem)} className="p-2 text-slate-400 hover:text-emerald-600" title="Tải xuống"><FileText className="w-4 h-4" /></button>
                           <a href={`https://github.com/${ghConfig?.owner}/${ghConfig?.repo}/tree/main/${docItem.githubPath}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600" title="Xem file"><FolderOpen className="w-4 h-4" /></a>
                          <button 
                             onClick={() => handleToggleHidden(docItem)}
                             className={cn(
                               "p-2 rounded-lg transition-all", 
                               docItem.hidden ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                             )}
                             title={docItem.hidden ? "Hiện file" : "Ẩn file"}
                          >
                             {docItem.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button 
                             onClick={() => handleDeleteFile(docItem)}
                             className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                             title="Xóa tài liệu"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           {documents.filter(d => !d.isDeleted).length === 0 && (
             <div className="text-center py-12">
               <p className="text-slate-400 dark:text-zinc-500 text-sm font-medium italic">Không có tài liệu nào trong hệ thống.</p>
             </div>
           )}
        </div>
      )}

      {activeTab === 'trash' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm overflow-hidden">
           <h3 className="text-lg font-bold mb-4 text-rose-500 flex items-center justify-between gap-2">
             <div className="flex items-center gap-2">
                 <Trash2 className="w-5 h-5" /> Thùng rác ({documents.filter(d => d.isDeleted).length})
             </div>
             {documents.filter(d => d.isDeleted).length > 0 && (
                <button onClick={handleBulkPermanentDelete} className="text-xs px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-lg">Xóa vĩnh viễn tất cả</button>
             )}
           </h3>
           <div className="overflow-auto max-h-[calc(100vh-250px)] relative">
             <table className="w-full text-left min-w-[1000px]">
                <thead className="sticky top-0 bg-white dark:bg-zinc-950 z-10 shadow-sm">
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.length === documents.filter(d => d.isDeleted).length && documents.filter(d => d.isDeleted).length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(documents.filter(d => d.isDeleted).map(d => d.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tên tài liệu</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tên gốc</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Số ký hiệu</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Đơn vị ban hành</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ngày ban hành</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Danh mục</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ngày xóa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {documents.filter(d => d.isDeleted).map(docItem => (
                    <tr key={docItem.id} className="transition-colors group">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedIds.includes(docItem.id)}
                          onChange={(e) => {
                             if (e.target.checked) {
                               setSelectedIds(prev => [...prev, docItem.id]);
                             } else {
                               setSelectedIds(prev => prev.filter(id => id !== docItem.id));
                             }
                          }}
                        />
                      </td>
                       <td className="px-6 py-4">
                         <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 break-words">{docItem.name}</span>
                       </td>
                       <td className="px-6 py-4 text-xs text-slate-500 dark:text-zinc-500">
                         <div className="max-w-[250px] break-words">
                           {docItem.originalName}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded uppercase tracking-widest shrink-0">
                           {docItem.documentNumber || '---'}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-xs text-slate-500">
                          {docItem.issuingUnit || '---'}
                       </td>
                       <td className="px-6 py-4 text-xs text-slate-500">
                          {docItem.issuanceDate || '---'}
                       </td>
                       <td className="px-6 py-4 text-xs text-slate-500 dark:text-zinc-500 whitespace-nowrap">{docItem.categoryName}</td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-xs text-slate-400 dark:text-zinc-600">
                           {docItem.deletedAt ? new Date(docItem.deletedAt?.seconds * 1000).toLocaleString() : 'N/A'}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex gap-2 justify-end">
                            <button 
                               onClick={() => handleRestoreFile(docItem)}
                               className="text-emerald-500 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                               title="Khôi phục"
                            >
                               <RefreshCw className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => handlePermanentDelete(docItem)}
                               className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                               title="Xóa vĩnh viễn"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
           {documents.filter(d => d.isDeleted).length === 0 && (
             <div className="text-center py-12">
               <p className="text-slate-400 dark:text-zinc-500 text-sm font-medium italic">Thùng rác trống.</p>
             </div>
           )}
        </div>
      )}

      {activeTab === 'upload' && (
         <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
           <datalist id="issuing-units-list">
             {issuingUnits.map(unit => <option key={unit.id} value={unit.name} />)}
           </datalist>
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
                     <input type="file" className="hidden" ref={quickUploadRef} onChange={handleQuickFileChange} />
                 </label>
              </div>

              {uploadItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-slate-100 dark:bg-zinc-900 rounded-xl text-xs font-bold items-center">
                    <span className="text-slate-600 dark:text-zinc-400">Tổng: {uploadItems.length}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Thành công: {uploadItems.filter(i => i.status === 'success').length}</span>
                    <span className="text-rose-600 dark:text-rose-400">Thất bại: {uploadItems.filter(i => i.status === 'error').length}</span>
                    {uploadItems.some(i => i.status === 'error') && (
                        <button onClick={retryAllFailed} className="ml-auto px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700">Tải lại tất cả thất bại</button>
                    )}
                  </div>

                  
                  <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                    {uploadItems.map(item => (
                      <div key={item.id} className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-white/5 rounded-[2rem] p-5 md:p-6 hover:border-indigo-500/30 transition-all shadow-sm space-y-5">
                         <div className="flex flex-col justify-center overflow-hidden pb-4 border-b border-slate-100 dark:border-white/5 w-full">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 block">Tên file gốc</label>
                            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar scroll-smooth px-1">
                               <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                               <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate" title={item.originalName}>{item.originalName}</span>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Tên hiển thị <span className="text-rose-500">*</span></label>
                            <input 
                              type="text" 
                              placeholder="Tên hiển thị"
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-indigo-500/20 text-xs text-slate-900 dark:text-white transition-all font-medium"
                              value={item.name}
                              onChange={(e) => updateUploadItem(item.id, 'name', e.target.value)}
                              required
                            />
                         </div>

                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Số ký hiệu</label>
                            <input 
                              type="text" 
                              placeholder="Số ký hiệu"
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-indigo-500/20 text-[10px] text-slate-600 dark:text-zinc-400 font-bold"
                              value={item.documentNumber}
                              onChange={(e) => updateUploadItem(item.id, 'documentNumber', e.target.value)}
                            />
                         </div>

                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Đơn vị ban hành</label>
                            <input 
                              type="text" 
                              list="issuing-units-list"
                              placeholder="Đơn vị ban hành"
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-indigo-500/20 text-[10px] text-slate-900 dark:text-white"
                              value={item.issuingUnit}
                              onChange={(e) => updateUploadItem(item.id, 'issuingUnit', e.target.value)}
                            />
                         </div>

                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Danh mục <span className="text-rose-500">*</span></label>
                            <select 
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-[10px] appearance-none"
                              value={item.categoryId}
                              onChange={(e) => updateUploadItem(item.id, 'categoryId', e.target.value)}
                              required
                            >
                              <option value="">Chọn danh mục...</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                         </div>

                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Ngày ban hành</label>
                            <input 
                              type="date"
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-[10px]"
                              value={item.issuanceDate}
                              onChange={(e) => updateUploadItem(item.id, 'issuanceDate', e.target.value)}
                            />
                         </div>

                         <div className="flex flex-col gap-1 w-full md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Văn bản liên quan</label>
                            <DocumentSelector 
                                value={item.relatedDocIds || []}
                                onChange={(val) => updateUploadItem(item.id, 'relatedDocIds', val)}
                                placeholder="VB liên quan..."
                                className="w-full"
                                multiple={true}
                                options={[
                                  ...documents.map(d => ({ id: d.id, name: d.name, number: d.documentNumber })),
                                  ...uploadItems.filter(ui => ui.id !== item.id).map(ui => ({ id: ui.id, name: ui.name, number: ui.documentNumber, isNew: true }))
                                ]}
                            />
                         </div>

                         <div className="flex flex-col w-full">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Trạng thái</label>
                            <button 
                               type="button"
                               onClick={() => updateUploadItem(item.id, 'hidden', !item.hidden)}
                               className={cn(
                                 "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm w-fit", 
                                 item.hidden ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400" : "text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                               )}
                               title={item.hidden ? "Đang ẩn" : "Đang hiện"}
                            >
                               {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                               <span>{item.hidden ? "Ẩn" : "Công khai"}</span>
                            </button>
                         </div>

                         <div className="flex flex-col w-full">
                            <label className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Thao tác</label>
                            <div className="flex flex-wrap items-center gap-2">
                               <button 
                                 type="button"
                                 onClick={() => removeUploadItem(item.id)}
                                 className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 shadow-sm w-fit"
                                 title="Xóa khỏi danh sách"
                               >
                                 <Trash2 size={14} />
                                 <span>Xóa</span>
                               </button>
                               
                               {item.status === 'success' && (
                                 <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2 rounded-xl">
                                   <Check size={14} />
                                   <span>Thành công</span>
                                 </div>
                               )}
                               {item.status === 'error' && (
                                 <div className="relative group">
                                     <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 px-3 py-2 rounded-xl cursor-help">
                                         <AlertCircle size={14} />
                                         <span>Lỗi</span>
                                     </div>
                                     <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-slate-800 text-white text-[10px] rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 font-medium">
                                         {item.errorMessage}
                                     </div>
                                 </div>
                               )}
                               {item.status === 'uploading' && (
                                 <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-3 py-2 rounded-xl animate-pulse">
                                   <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                                   <span>Đang tải...</span>
                                 </div>
                               )}
                               {item.status === 'scanning' && (
                                 <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-3 py-2 rounded-xl animate-pulse">
                                   <RefreshCw size={14} className="animate-spin" />
                                   <span>Đang quét...</span>
                                 </div>
                               )}
                            </div>
                         </div>

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
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" 
                required 
              />
              <textarea 
                placeholder="Mô tả..." 
                value={newCatDesc} 
                onChange={e => setNewCatDesc(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/20">
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
                     <div className="flex gap-2 mt-2 sm:mt-0">
                       <button onClick={() => openEditCategory(cat)} className="text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all">
                             <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-slate-500 text-sm">Chưa có danh mục nào.</p>}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'issuing_units' && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
           <form onSubmit={handleCreateIssuingUnit} className="mb-8 space-y-4 max-w-xl">
              <h3 className="text-lg font-bold">Thêm Đơn Vị Ban Hành Mới</h3>
              <input 
                type="text" 
                placeholder="Tên đơn vị ban hành..." 
                value={newIssuingUnitName} 
                onChange={e => setNewIssuingUnitName(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white" 
                required 
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                Thêm đơn vị
              </button>
           </form>
           
           <div>
              <h3 className="text-lg font-bold mb-4">Danh sách Đơn vị ban hành ({issuingUnits.length})</h3>
              <div className="space-y-2">
                {issuingUnits.map(unit => (
                  <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                     <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{unit.name}</h4>
                     </div>
                     <div className="flex gap-2 mt-2 sm:mt-0">
                       <button onClick={() => handleDeleteIssuingUnit(unit.id, unit.name)} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                  </div>
                ))}
                {issuingUnits.length === 0 && <p className="text-slate-500 text-sm">Chưa có đơn vị ban hành nào.</p>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const TruncatedName = ({ name, maxLength = 30 }: { name: string; maxLength?: number }) => {
  const [showFull, setShowFull] = useState(false);
  const isTruncated = name.length > maxLength;
  const displayName = isTruncated && !showFull ? name.substring(0, maxLength) + '...' : name;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
        {displayName}
      </span>
      {isTruncated && (
        <button 
          onClick={() => setShowFull(!showFull)}
          className="text-[10px] text-indigo-500 hover:underline font-bold uppercase tracking-widest shrink-0"
        >
          {showFull ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
};

const EditDocumentModal = ({ isOpen, onClose, doc, categories, documents, onConfirm }: any) => {
  const [formData, setFormData] = useState({
    name: doc.name,
    categoryId: doc.categoryId,
    documentNumber: doc.documentNumber || '',
    issuingUnit: doc.issuingUnit || '',
    issuanceDate: doc.issuanceDate || '',
    level: doc.level || 'tuyen_tren',
    parentId: doc.parentId || '',
    replacesId: doc.replacesId || '',
    relatedDocIds: doc.relatedDocIds || [],
    note: doc.note || '',
    isVip: doc.isVip || false,
    vipCode: doc.vipCode || '',
    hidden: doc.hidden || false,
    price: doc.price || 0,
    salePrice: doc.salePrice || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    const { userData } = useAuthStore.getState();
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    e.preventDefault();
    onConfirm(doc.id, {
      ...formData,
      categoryName: categories.find((c: any) => c.id === formData.categoryId)?.name || 'Khác'
    });
  };

  return (
    <div className={cn("fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
      <div className={cn("bg-white dark:bg-zinc-925 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden transform transition-all duration-300", isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4")}>
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
           <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-zinc-200 uppercase tracking-tighter">Sửa thông tin tài liệu</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cập nhật chi tiết cho tệp tin của bạn</p>
           </div>
           <button onClick={onClose} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-all">
              <X size={20} />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Tên hiển thị</label>
                 <input 
                   type="text"
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                   value={formData.name}
                   onChange={e => setFormData({ ...formData, name: e.target.value })}
                   required
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Danh mục</label>
                 <select 
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none"
                   value={formData.categoryId}
                   onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                   required
                 >
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Số ký hiệu</label>
                 <input 
                   type="text"
                   placeholder="VD: 123/QD-BYT"
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                   value={formData.documentNumber}
                   onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Đơn vị ban hành</label>
                 <input 
                   type="text"
                   list="issuing-units-list"
                   placeholder="VD: Bộ Y tế"
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                   value={formData.issuingUnit}
                   onChange={e => setFormData({ ...formData, issuingUnit: e.target.value })}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Ngày ban hành</label>
                 <input 
                   type="date"
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                   value={formData.issuanceDate}
                   onChange={e => setFormData({ ...formData, issuanceDate: e.target.value })}
                 />
              </div>

              <div className="space-y-2 md:col-span-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Văn bản liên quan</label>
                 <DocumentSelector 
                    value={formData.relatedDocIds || []}
                    onChange={(val) => setFormData({ ...formData, relatedDocIds: val })}
                    options={documents.filter(d => d.id !== doc.id).map(d => ({ id: d.id, name: d.name, number: d.documentNumber }))}
                    className="w-full"
                    multiple={true}
                 />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Ghi chú</label>
              <textarea 
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all min-h-[100px]"
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: e.target.value })}
              />
           </div>

           <div className="hidden grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Giá niên yết (VNĐ)</label>
                 <input 
                   type="number"
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                   value={formData.price}
                   onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Giá khuyến mãi (VNĐ)</label>
                 <input 
                   type="number"
                   className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                   value={formData.salePrice}
                   onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                 />
              </div>
           </div>

           <div className="flex flex-wrap gap-6 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                 <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={false}
                      onChange={e => setFormData({ ...formData, isVip: e.target.checked })}
                    />
                    <div className="hidden w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                 </div>
                 
              </div>

              <div className="flex items-center gap-3">
                 <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.hidden}
                      onChange={e => setFormData({ ...formData, hidden: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                 </div>
                 <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-zinc-400">Ẩn tài liệu</span>
              </div>
           </div>

           {false && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                 <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Mã Code VIP</label>
                 <input 
                   type="text"
                   placeholder="Nhập mã code bảo mật..."
                   className="w-full px-5 py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-black tracking-widest text-indigo-600 outline-none transition-all"
                   value={formData.vipCode}
                   onChange={e => setFormData({ ...formData, vipCode: e.target.value })}
                   required={formData.isVip}
                 />
              </div>
           )}

           <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Lưu thay đổi
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

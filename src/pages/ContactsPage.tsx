import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  Users, Search, Plus, FileSpreadsheet, Download, Upload, Edit, Trash, Check, X, Phone, UserCircle, MapPin, Briefcase, ChevronRight, CheckSquare
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../store/authStore';
import { useConfirmStore } from '../store/confirmStore';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import LoadingScreen from '../components/ui/LoadingScreen';
import AppLogo from '../components/ui/AppLogo';

type ContactCategory = 'ubnd' | 'tram_y_te' | 'ctv_y_te' | 'ctv_dan_so';

interface Contact {
  id: string;
  fullName: string;
  phone: string;
  category: ContactCategory;
  position?: string; // For UBND, Trạm Y tế
  region?: string;   // For CTV
  createdAt?: number;
  updatedAt?: number;
}

interface ContactCategoryInfo {
  id: ContactCategory;
  label: string;
  icon: any;
}

const CATEGORIES: ContactCategoryInfo[] = [
  { id: 'ubnd', label: 'UBND Phường', icon: Briefcase },
  { id: 'tram_y_te', label: 'Trạm Y tế', icon: UserCircle },
  { id: 'ctv_y_te', label: 'Cộng tác viên Y tế', icon: MapPin },
  { id: 'ctv_dan_so', label: 'Cộng tác viên Dân số', icon: Users },
];

export default function ContactsPage() {
  const location = useLocation();
  const { userData, isSuperAdmin, isAdmin: authIsAdmin, loading: authLoading } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const canEdit = isSuperAdmin || authIsAdmin;

  const [activeTab, setActiveTab] = useState<ContactCategory>('ubnd');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Contact | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [positionOrRegion, setPositionOrRegion] = useState('');

  // Import Preview Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab') as ContactCategory;
    if (CATEGORIES.some(c => c.id === tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (userData?.role === 'review') {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Simple query to avoid missing index errors during initial setup
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      // Filter by category client-side for now
      setContacts(items.filter(item => item.category === activeTab));
      setLoading(false);
    }, (error) => {
      console.error("Contacts snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'contacts');
      setLoading(false);
    });

    return () => unsub();
  }, [activeTab]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFullName('');
    setPhone('');
    setPositionOrRegion('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Contact) => {
    setEditingItem(item);
    setFullName(item.fullName);
    setPhone(item.phone);
    setPositionOrRegion(item.position || item.region || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!fullName.trim() || !phone.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    const payload: any = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      category: activeTab,
      updatedAt: Date.now()
    };

    if (activeTab === 'ubnd' || activeTab === 'tram_y_te') {
      payload.position = positionOrRegion.trim();
    } else {
      payload.region = positionOrRegion.trim();
    }

    const toastId = toast.loading('Đang lưu...');
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'contacts', editingItem.id), payload);
        toast.success('Đã cập nhật!', { id: toastId });
      } else {
        payload.createdAt = Date.now();
        await addDoc(collection(db, 'contacts'), payload);
        toast.success('Đã thêm mới!', { id: toastId });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu.', { id: toastId });
    }
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    openConfirm({
      title: 'Xóa danh bạ',
      message: 'Bạn có chắc chắn muốn xóa liên hệ này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const tid = toast.loading('Đang xóa...');
        try {
          await deleteDoc(doc(db, 'contacts', id));
          toast.success('Đã xóa.', { id: tid });
        } catch (err) {
          toast.error('Lỗi khi xóa.', { id: tid });
        }
      }
    });
  };

  const downloadTemplate = () => {
    const isPosition = activeTab === 'ubnd' || activeTab === 'tram_y_te';
    const headers = ['Họ và Tên', 'Số điện thoại', isPosition ? 'Chức vụ' : 'Địa bàn'];
    const sample = {
      'Họ và Tên': 'Nguyễn Văn A',
      'Số điện thoại': '0912345678',
      [isPosition ? 'Chức vụ' : 'Địa bàn']: isPosition ? 'Trưởng phòng' : 'Tổ 1'
    };
    const ws = XLSX.utils.json_to_sheet([sample], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Mau_Import_Danh_Ba_${activeTab}.xlsx`);
  };

  const exportExcel = () => {
    if (contacts.length === 0) {
      toast.error('Không có dữ liệu.');
      return;
    }
    const isPosition = activeTab === 'ubnd' || activeTab === 'tram_y_te';
    const data = contacts.map((c, i) => ({
      'STT': i + 1,
      'Họ và Tên': c.fullName,
      'Số điện thoại': c.phone,
      [isPosition ? 'Chức vụ' : 'Địa bàn']: c.position || c.region || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh bạ');
    XLSX.writeFile(wb, `Danh_Ba_${activeTab}.xlsx`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        
        const isPosition = activeTab === 'ubnd' || activeTab === 'tram_y_te';
        const processed = rows.map(r => {
          const fullName = r['Họ và Tên'] || r['Họ và tên'] || r['fullName'] || '';
          const phone = r['Số điện thoại'] || r['phone'] || '';
          const val = r['Chức vụ'] || r['Địa bàn'] || r['position'] || r['region'] || '';
          return {
            fullName,
            phone,
            [isPosition ? 'position' : 'region']: val,
            category: activeTab
          };
        }).filter(r => r.fullName && r.phone);

        if (processed.length === 0) {
          toast.error('Không tìm thấy dữ liệu hợp lệ.');
          return;
        }
        setImportPreviewData(processed);
        setIsImportModalOpen(true);
      } catch (err) {
        toast.error('Lỗi đọc file.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    const tid = toast.loading('Đang nhập dữ liệu...');
    try {
      const baseTime = Date.now();
      // Use a for loop with index to ensure order and adjust timestamps
      for (let i = 0; i < importPreviewData.length; i++) {
        const item = importPreviewData[i];
        await addDoc(collection(db, 'contacts'), {
          ...item,
          createdAt: baseTime + (importPreviewData.length - i),
          updatedAt: baseTime + (importPreviewData.length - i)
        });
      }
      toast.success(`Đã nhập ${importPreviewData.length} liên hệ.`, { id: tid });
      setIsImportModalOpen(false);
    } catch (err) {
      toast.error('Lỗi khi nhập.', { id: tid });
    }
  };

  const filtered = contacts
    .filter(c => 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery) ||
      (c.position || c.region || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (!canEdit || selectedIds.length === 0) return;
    openConfirm({
      title: 'Xóa hàng loạt',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} liên hệ đã chọn?`,
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const tid = toast.loading('Đang xóa...');
        try {
          for (const id of selectedIds) {
            await deleteDoc(doc(db, 'contacts', id));
          }
          toast.success('Đã xóa thành công.', { id: tid });
          setSelectedIds([]);
        } catch (err) {
          toast.error('Lỗi khi xóa hàng loạt.', { id: tid });
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 lg:py-12 px-4 space-y-8 animate-fade-in">
      <Helmet>
        <title>Danh bạ điện thoại | Hệ thống</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/10 rounded-full text-indigo-700 dark:text-zinc-300 mb-3 text-[10px] font-black uppercase tracking-wider">
            <Phone className="w-3.5 h-3.5 text-indigo-500" />
            <span>Contact Directory</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Danh bạ điện thoại</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Hệ thống danh bạ UBND, Y tế và Cộng tác viên.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <>
              <button 
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200/50 dark:border-white/5 transition-all shadow-sm"
              >
                <Download size={14} /> Mẫu Excel
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200/50 dark:border-white/5 transition-all shadow-sm"
              >
                <Upload size={14} className="text-emerald-500" /> Nhập Excel
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
            </>
          )}
          <button 
            onClick={exportExcel}
            className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-2xl text-xs font-bold border border-indigo-100 dark:border-indigo-400/10 transition-all shadow-sm"
          >
            <FileSpreadsheet size={14} /> Xuất Excel
          </button>
          {canEdit && (
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-2xl text-sm font-bold shadow-lg transition-all"
            >
              <Plus size={16} /> Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          <div className="flex flex-wrap items-center gap-2 w-full">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === cat.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${activeTab === cat.id ? 'text-white' : 'text-slate-400'}`} />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full xl:max-w-xs shrink-0 self-end xl:self-start">
            <input 
              type="text"
              placeholder="Tìm theo tên, SĐT, chức vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <AppLogo className="w-12 h-12 mb-4" isLoading />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Đang tải danh bạ...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Không có kết quả</h3>
              <p className="text-sm text-slate-500 mt-1">Thử thay đổi từ khóa hoặc bộ lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-white/5">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="py-4 px-6 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="py-4 px-6">STT</th>
                    <th className="py-4 px-6">Họ và Tên</th>
                    <th className="py-4 px-6">Số điện thoại</th>
                    <th className="py-4 px-6">{(activeTab === 'ubnd' || activeTab === 'tram_y_te') ? 'Chức vụ' : 'Địa bàn'}</th>
                    {canEdit && <th className="py-4 px-6 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all ${selectedIds.includes(c.id) ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                      <td className="py-4 px-6">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-400">{i + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{c.fullName}</td>
                      <td className="py-4 px-6 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{c.phone}</td>
                      <td className="py-4 px-6 text-sm text-slate-600 dark:text-zinc-400">{c.position || c.region || '-'}</td>
                      {canEdit && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleOpenEditModal(c)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-600 transition-all">
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 relative z-10 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-white/5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingItem ? 'Sửa liên hệ' : 'Thêm liên hệ mới'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all"><X /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Họ và Tên</label>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Số điện thoại</label>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{(activeTab === 'ubnd' || activeTab === 'tram_y_te') ? 'Chức vụ' : 'Địa bàn'}</label>
                  <input type="text" value={positionOrRegion} onChange={e => setPositionOrRegion(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm">Hủy</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-sm">Lưu</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImportModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl p-6 relative z-10 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-white/5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xem trước dữ liệu Nhập</h3>
                <p className="text-xs text-slate-400">{importPreviewData.length} bản ghi hợp lệ</p>
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-slate-400">
                      <th className="pb-3">Tên</th>
                      <th className="pb-3">SĐT</th>
                      <th className="pb-3">Chức vụ/Địa bàn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/5">
                    {importPreviewData.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 dark:text-white font-medium">{row.fullName}</td>
                        <td className="py-2 text-slate-500 dark:text-zinc-400 font-mono">{row.phone}</td>
                        <td className="py-2 text-slate-500 dark:text-zinc-400">{row.position || row.region || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-3 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-sm">Hủy</button>
                <button onClick={confirmImport} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-sm">Xác nhận Nhập</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-[32px] shadow-2xl flex items-center gap-6 border border-white/10 shadow-indigo-500/20"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Đã chọn</span>
              <span className="text-sm font-bold">{selectedIds.length} liên hệ</span>
            </div>
            
            <div className="h-8 w-px bg-white/10 dark:bg-slate-200" />
            
            <div className="flex items-center gap-2">
              <div className="relative group/actions">
                <button 
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-500/20"
                >
                  <CheckSquare size={14} /> Thao tác / Hành động
                  <ChevronRight size={14} className="group-hover/actions:rotate-90 transition-transform" />
                </button>
                
                <div className="absolute bottom-full mb-3 right-0 w-52 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all">
                  <button 
                    onClick={handleBulkDelete}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold transition-all text-left"
                  >
                    <Trash size={14} /> Xóa tất cả đã chọn
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setSelectedIds([])}
                className="p-3 hover:bg-white/10 dark:hover:bg-slate-100 rounded-xl transition-all"
                title="Hủy chọn"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

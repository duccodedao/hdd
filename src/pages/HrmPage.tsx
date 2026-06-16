import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  Users, Search, Plus, FileSpreadsheet, Download, Upload, Copy, Edit, Delete, Trash, Check, X, CreditCard, MapPin, Phone, Calendar as CalendarIcon, Filter, ShieldAlert
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../store/authStore';
import { useConfirmStore } from '../store/confirmStore';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import LoadingScreen from '../components/ui/LoadingScreen';
import AppLogo from '../components/ui/AppLogo';

interface Employee {
  id: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  gender: string;
  idCard: string;
  phone: string;
  createdAt?: number;
  visibility?: 'public' | 'internal';
}

interface Collaborator {
  id: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  gender: string;
  region: string;
  phone: string;
  createdAt?: number;
  visibility?: 'public' | 'internal';
}

const convertToDateInputFormat = (dateStr: any): string => {
  if (!dateStr) return '';
  try {
    const rawVal = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
    if (!rawVal) return '';

    // If Excel read numerical sequence serial day number OR timestamp in ms
    if (typeof rawVal === 'number') {
      const d = new Date(rawVal);
      if (!isNaN(d.getTime())) {
        return format(d, 'yyyy-MM-dd');
      }
    }

    // Checking if already in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawVal))) {
      return String(rawVal);
    }

    // Common separator parsing for dd/MM/yyyy or dd-MM-yyyy or dd.MM.yyyy
    const matchDmy = String(rawVal).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (matchDmy) {
      const d = parseInt(matchDmy[1], 10);
      const m = parseInt(matchDmy[2], 10) - 1;
      const y = parseInt(matchDmy[3], 10);
      const specificDate = new Date(y, m, d);
      if (!isNaN(specificDate.getTime())) {
        return format(specificDate, 'yyyy-MM-dd');
      }
    }

    // Try parsing standard formats and fallback to yyyy-MM-dd representation
    const parsed = parseISO(String(rawVal));
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }

    const standardDate = new Date(String(rawVal));
    if (!isNaN(standardDate.getTime())) {
      return format(standardDate, 'yyyy-MM-dd');
    }

    // Match yyyy
    if (/^\d{4}$/.test(String(rawVal))) {
      return `${rawVal}-01-01`;
    }

    return '';
  } catch (err) {
    console.error("Error converting date to input format:", err?.message || String(err));
    return '';
  }
};

const safeFormatDate = (dateStr: any): string => {
  if (!dateStr) return 'Chưa nhập';
  try {
    const rawVal = typeof dateStr === 'string' ? dateStr.trim() : dateStr;
    if (!rawVal) return 'Chưa nhập';

    // If Excel read numerical sequence serial day number
    if (typeof rawVal === 'number') {
      const d = new Date(rawVal);
      if (!isNaN(d.getTime())) {
        return format(d, 'dd/MM/yyyy');
      }
    }

    // Check if looks like DD/MM/YYYY already
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(rawVal))) {
      return String(rawVal);
    }

    // Try parsing ISO
    const parsed = parseISO(String(rawVal));
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'dd/MM/yyyy');
    }

    // Standard JavaScript Date parsing
    const standardDate = new Date(String(rawVal));
    if (!isNaN(standardDate.getTime())) {
      return format(standardDate, 'dd/MM/yyyy');
    }

    // Try common separators
    const matchDmy = String(rawVal).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (matchDmy) {
      const d = parseInt(matchDmy[1], 10);
      const m = parseInt(matchDmy[2], 10) - 1;
      const y = parseInt(matchDmy[3], 10);
      const specificDate = new Date(y, m, d);
      if (!isNaN(specificDate.getTime())) {
        return format(specificDate, 'dd/MM/yyyy');
      }
    }

    // Year sequence only
    if (/^\d{4}$/.test(String(rawVal))) {
      return `01/01/${rawVal}`;
    }

    return String(rawVal);
  } catch (err) {
    console.error("Error formatting date:", err?.message || String(err));
    return String(dateStr);
  }
};

export default function HrmPage() {
  const { user, userData, isSuperAdmin, isAdmin, loading: authLoading } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const canEdit = isSuperAdmin || isAdmin;

  const [activeTab, setActiveTab] = useState<'employees' | 'collaborators'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Nam');
  const [idCard, setIdCard] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('internal');

  // Import Preview Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load datasets on mount
  useEffect(() => {
    if (authLoading || !canEdit) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubEmployees = onSnapshot(collection(db, 'hrm_employees'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      // Sort alphabetically or by date
      setEmployees(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    }, (error) => {
      console.error("hrm_employees snapshot error:", error?.message || String(error));
      handleFirestoreError(error, OperationType.LIST, 'hrm_employees');
      setLoading(false);
    });

    const unsubCollaborators = onSnapshot(collection(db, 'hrm_collaborators'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
      setCollaborators(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
      console.error("hrm_collaborators snapshot error:", error?.message || String(error));
      handleFirestoreError(error, OperationType.LIST, 'hrm_collaborators');
    });

    return () => {
      unsubEmployees();
      unsubCollaborators();
    };
  }, [canEdit, authLoading]);

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!canEdit) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-4 animate-fade-in">
        <Helmet>
          <title>Hệ thống Quản lý Nhân sự | BMASS</title>
        </Helmet>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-2xl space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quyền truy cập bị giới hạn</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Bạn cần quyền Quản trị viên hoặc Quản lý cấp cao để xem và chỉnh sửa thông tin hồ sơ nhân sự của hệ thống.
          </p>
        </div>
      </div>
    );
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFullName('');
    setBirthDate('');
    setGender('Nam');
    setIdCard('');
    setRegion('');
    setPhone('');
    setVisibility('internal');
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFullName('');
    setBirthDate('');
    setGender('Nam');
    setIdCard('');
    setRegion('');
    setPhone('');
    setVisibility('internal');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setFullName(item.fullName || '');
    setBirthDate(convertToDateInputFormat(item.birthDate));
    setGender(item.gender || 'Nam');
    setIdCard(item.idCard || '');
    setRegion(item.region || '');
    setPhone(item.phone || '');
    setVisibility(item.visibility || 'internal');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Bạn không có quyền thực hiện thao tác này.');
      return;
    }

    if (!fullName.trim() || !birthDate || !phone.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    const payload: any = {
      fullName: fullName.trim(),
      birthDate,
      gender,
      phone: phone.trim(),
      visibility,
      updatedAt: Date.now()
    };

    if (activeTab === 'employees') {
      if (!idCard.trim()) {
        toast.error('Nhân viên cần phải có Số CCCD.');
        return;
      }
      payload.idCard = idCard.trim();
    } else {
      if (!region.trim()) {
        toast.error('Cộng tác viên cần phải có Địa bàn quản lý.');
        return;
      }
      payload.region = region.trim();
    }

    const toastId = toast.loading('Đang lưu thông tin...');
    try {
      const colName = activeTab === 'employees' ? 'hrm_employees' : 'hrm_collaborators';
      if (editingItem) {
        // Update existing doc
        await updateDoc(doc(db, colName, editingItem.id), payload);
        toast.success('Cập nhật nhân sự thành công!', { id: toastId });
      } else {
        // Create new doc
        payload.createdAt = Date.now();
        await addDoc(collection(db, colName), payload);
        toast.success('Thêm mới nhân sự thành công!', { id: toastId });
      }
      handleCloseModal();
    } catch (err) {
      console.error("Save error:", err?.message || String(err));
      handleFirestoreError(err, editingItem ? OperationType.UPDATE : OperationType.CREATE, activeTab === 'employees' ? 'hrm_employees' : 'hrm_collaborators');
      toast.error('Có lỗi xảy ra khi lưu thông tin.', { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền thực hiện thao tác này.');
      return;
    }

    openConfirm({
      title: 'Xóa nhân sự',
      message: 'Bạn có chắc chắn muốn xóa nhân sự này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const toastId = toast.loading('Đang xóa...');
        try {
          const colName = activeTab === 'employees' ? 'hrm_employees' : 'hrm_collaborators';
          await deleteDoc(doc(db, colName, id));
          toast.success('Đã xóa dữ liệu thành công!', { id: toastId });
        } catch (err) {
          console.error("Delete error:", err?.message || String(err));
          handleFirestoreError(err, OperationType.DELETE, activeTab === 'employees' ? 'hrm_employees' : 'hrm_collaborators');
          toast.error('Có lỗi xảy ra khi xóa dữ liệu.', { id: toastId });
        }
      }
    });
  };

  // Excel template generator
  const downloadTemplate = () => {
    const isEmp = activeTab === 'employees';
    const filename = isEmp ? 'Mau_Import_Nhan_Vien' : 'Mau_Import_Cong_Tac_Vien';
    const sheetName = isEmp ? 'Nhân Viên' : 'Cộng Tác Viên';

    let headers: string[] = [];
    let sampleData: any = {};

    if (isEmp) {
      headers = ['Họ và tên', 'Ngày tháng năm sinh', 'Giới tính', 'Số CCCD', 'Số điện thoại'];
      sampleData = {
        'Họ và tên': 'Nguyễn Văn A',
        'Ngày tháng năm sinh': '1995-10-15',
        'Giới tính': 'Nam',
        'Số CCCD': '030095123456',
        'Số điện thoại': '0912345678'
      };
    } else {
      headers = ['Họ và tên', 'Ngày tháng năm sinh', 'Giới tính', 'Địa bàn quản lý', 'Số điện thoại'];
      sampleData = {
        'Họ và tên': 'Trần Thị B',
        'Ngày tháng năm sinh': '1998-05-20',
        'Giới tính': 'Nữ',
        'Địa bàn quản lý': 'Hà Nội - Cầu Giấy',
        'Số điện thoại': '0987654321'
      };
    }

    const worksheet = XLSX.utils.json_to_sheet([sampleData], { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    toast.success('Đã tải xuống file template mẫu!');
  };

  // Excel Export
  const exportData = () => {
    const isEmp = activeTab === 'employees';
    const dataList = isEmp ? employees : collaborators;
    
    if (dataList.length === 0) {
      toast.error('Không có dữ liệu nào để xuất!');
      return;
    }

    const mappedData = dataList.map((item, idx) => {
      const row: any = {
        'STT': idx + 1,
        'Họ và tên': item.fullName,
        'Ngày tháng năm sinh': item.birthDate,
        'Giới tính': item.gender,
        'Số điện thoại': item.phone,
        'Chế độ hiển thị': item.visibility === 'public' ? 'Công khai' : 'Nội bộ',
      };

      if (isEmp) {
        row['Số CCCD'] = (item as Employee).idCard;
      } else {
        row['Địa bàn quản lý'] = (item as Collaborator).region;
      }
      return row;
    });

    const sheetName = isEmp ? 'Danh sách Nhân Viên' : 'Danh sách Cộng Tác Viên';
    const filename = isEmp ? 'Danh_Sach_Nhan_Vien' : 'Danh_Sach_Cong_Tac_Vien';

    const worksheet = XLSX.utils.json_to_sheet(mappedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    toast.success('Dữ liệu đã xuất ra file Excel thành công!');
  };

  // Excel Import Handler
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          toast.error('File Excel không có dữ liệu để nhập.');
          return;
        }

        // Map data safely using regex mappers
        const processed = rows.map((row) => {
          const getVal = (possibleHeaders: string[]) => {
            for (const ph of possibleHeaders) {
              if (row[ph] !== undefined) return String(row[ph]).trim();
            }
            return '';
          };

          const fullName = getVal(['Họ và tên', 'Họ tên', 'fullName', 'fullname', 'Name', 'Tên', 'Học và tên']);
          const birthDate = getVal(['Ngày tháng năm sinh', 'Năm sinh', 'birthDate', 'birthdate', 'Ngày sinh']);
          const gender = getVal(['Giới tính', 'gender', 'Gender']);
          const phone = getVal(['Số điện thoại', 'SĐT', 'phone', 'Phone', 'Điện thoại']);

          if (activeTab === 'employees') {
            const idCard = getVal(['Số CCCD', 'CCCD', 'idCard', 'idcard', 'CMND']);
            return { fullName, birthDate, gender, idCard, phone, visibility: 'internal' };
          } else {
            const region = getVal(['Địa bàn quản lý', 'Địa bàn', 'region', 'Region', 'Khu vực']);
            return { fullName, birthDate, gender, region, phone, visibility: 'internal' };
          }
        }).filter(item => item.fullName.length > 0);

        if (processed.length === 0) {
          toast.error('Không tìm thấy bản ghi hợp lệ trong Excel.');
          return;
        }

        setImportPreviewData(processed);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error(err);
        toast.error('Có lỗi xảy ra khi đọc file Excel.');
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!canEdit) {
      toast.error('Bạn không có quyền thực hiện thao tác này.');
      return;
    }

    const toastId = toast.loading('Đang khởi tạo nhập Excel...');
    try {
      const colName = activeTab === 'employees' ? 'hrm_employees' : 'hrm_collaborators';
      let successCount = 0;

      for (const item of importPreviewData) {
        const payload = {
          ...item,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await addDoc(collection(db, colName), payload);
        successCount++;
      }

      toast.success(`Nhập thành công ${successCount} bản ghi!`, { id: toastId });
      setIsImportModalOpen(false);
      setImportPreviewData([]);
    } catch (err) {
      console.error(err);
      toast.error('Quá trình nhập dữ liệu bị lỗi.', { id: toastId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Bản sao lưu thành công!', { duration: 1500 });
  };

  // Filter current list based on search bar query
  const filteredList = (activeTab === 'employees' ? employees : collaborators).filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const isPublicMatch = item.visibility === 'public' && 'công khai'.includes(q);
    const isInternalMatch = item.visibility !== 'public' && 'nội bộ'.includes(q);
    
    return (
      item.fullName.toLowerCase().includes(q) ||
      (item.phone && item.phone.includes(q)) ||
      isPublicMatch ||
      isInternalMatch ||
      (activeTab === 'employees' && (item as Employee).idCard?.includes(q)) ||
      (activeTab === 'collaborators' && (item as Collaborator).region?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[1800px] mx-auto py-8 lg:py-12 space-y-8 animate-fade-in no-scrollbar px-4 bg-transparent min-h-screen">
      <Helmet>
        <title>Hệ thống Quản lý Nhân sự | BMASS</title>
        <meta name="description" content="Quản lý nhân sự, nhân viên chính thức và cộng tác viên điều hành vùng." />
      </Helmet>

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/10 rounded-full text-violet-700 dark:text-zinc-300 mb-3 text-[10px] font-black uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-violet-500" />
            <span>Personnel Management</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Quản Lý Nhân Sự
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mt-1.5 leading-relaxed">
            Hệ thống quản lý thông tin hồ sơ của Nhân viên chính thức và Cộng tác viên theo khu vực địa lý, hỗ trợ đồng bộ dữ liệu Excel cao cấp.
          </p>
        </div>

        {/* Action Button Row */}
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <>
              <button 
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 bg-slate-150 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 px-4.5 py-2.5 rounded-2xl text-sm font-bold transition-all border border-slate-200/50 dark:border-white/5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Tải Mẫu Excel</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-slate-150 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 px-4.5 py-2.5 rounded-2xl text-sm font-bold transition-all border border-slate-200/50 dark:border-white/5 shadow-sm relative cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Import Excel</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
            </>
          )}

          <button 
            onClick={exportData}
            className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 px-4.5 py-2.5 rounded-2xl text-sm font-bold transition-all border border-indigo-100 dark:border-indigo-400/10 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span>Xuất Excel</span>
          </button>

          {canEdit && (
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-[0_4px_12px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhân Sự</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2">
          {/* Subtab selection */}
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('employees'); setSearchQuery(''); }}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all relative ${
                activeTab === 'employees' 
                  ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-white/5' 
                  : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'
              }`}
            >
              NV ({employees.length})
              {activeTab === 'employees' && (
                <motion.div layoutId="hrm-active-tab-indicator" className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 dark:bg-white" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab('collaborators'); setSearchQuery(''); }}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all relative ${
                activeTab === 'collaborators' 
                  ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-white/5' 
                  : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'
              }`}
            >
              CTV ({collaborators.length})
              {activeTab === 'collaborators' && (
                <motion.div layoutId="hrm-active-tab-indicator" className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 dark:bg-white" />
              )}
            </button>
          </div>

          {/* Search bar input container */}
          <div className="relative w-full max-w-sm">
            <input 
              type="text" 
              placeholder={activeTab === 'employees' ? "Tìm theo tên, điện thoại, CCCD..." : "Tìm theo tên, điện thoại, địa bàn..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 transition-all shadow-sm"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Content Section / List Table */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AppLogo className="w-14 h-14 mb-4" isLoading={true} />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Đang tải hồ sơ nhân sự...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Không có dữ liệu</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                {searchQuery ? 'Không có nhân sự nào phù hợp với từ khóa tìm kiếm.' : 'Chưa có bản ghi nào được ghi nhận. Vui lòng thêm bằng nút "Thêm Nhân sự" hoặc "Import Excel" từ tệp dữ liệu.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar scroll-smooth">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-black/25 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5">
                    <th className="py-4 px-6 w-16 whitespace-nowrap">STT</th>
                    <th className="py-4 px-6 whitespace-nowrap">Họ và tên</th>
                    <th className="py-4 px-6 whitespace-nowrap">Ngày tháng năm sinh</th>
                    <th className="py-4 px-6 whitespace-nowrap">Giới tính</th>
                    {activeTab === 'employees' ? (
                      <th className="py-4 px-6 whitespace-nowrap">Số CCCD</th>
                    ) : (
                      <th className="py-4 px-6 whitespace-nowrap">Địa bàn quản lý</th>
                    )}
                    <th className="py-4 px-6 whitespace-nowrap">Số điện thoại</th>
                    <th className="py-4 px-6 whitespace-nowrap">Chế độ hiển thị</th>
                    <th className="py-4 px-6 text-right w-32 whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/40 dark:divide-white/5 text-sm">
                  {filteredList.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-white/[0.01] transition-all group">
                      <td className="py-4 px-6 font-mono text-xs text-slate-400 whitespace-nowrap">{index + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.fullName}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {safeFormatDate(item.birthDate)}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full ${
                          item.gender === 'Nam' 
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                            : 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400'
                        }`}>
                          {item.gender}
                        </span>
                      </td>
                      {activeTab === 'employees' ? (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span>{(item as Employee).idCard || 'N/A'}</span>
                          </div>
                        </td>
                      ) : (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
                            <MapPin className="w-3.5 h-3.5 text-violet-500" />
                            <span>{(item as Collaborator).region || 'N/A'}</span>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2 group/phone">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{item.phone}</span>
                          <button 
                            onClick={() => copyToClipboard(item.phone)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md opacity-0 group-hover/phone:opacity-100 transition-all"
                            title="Sao chép SĐT"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {item.visibility === 'public' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 animate-pulse"></span>
                            <span>Công khai</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-450 border border-slate-200/50 dark:border-white/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>Nội bộ</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit ? (
                            <>
                              <button 
                                onClick={() => handleOpenEditModal(item)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-600 transition-all"
                                title="Xóa"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Không có quyền</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Thêm / Sửa Nhân sự */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Dialog Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-150/50 dark:border-white/5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Sửa thông tin hồ sơ' : `Thêm ${activeTab === 'employees' ? 'Nhân viên mới' : 'Cộng tác viên mới'}`}
                </h3>
                <button 
                  onClick={handleCloseModal}
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Họ và tên */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Ngày sinh */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Ngày tháng năm sinh <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm"
                    />
                  </div>

                  {/* Giới tính */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Giới tính <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields based on Active Tab */}
                {activeTab === 'employees' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Số CCCD <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      maxLength={12}
                      placeholder="030095123456"
                      value={idCard}
                      onChange={(e) => setIdCard(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Địa bàn quản lý <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Hà Nội - Cầu Giấy"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm"
                    />
                  </div>
                )}

                {/* Số điện thoại & Chế độ hiển thị */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel"
                      required
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Chế độ hiển thị <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as 'public' | 'internal')}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm font-semibold"
                    >
                      <option value="internal">🔐 Nội bộ</option>
                      <option value="public">🌐 Công khai</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-150/50 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 py-3 rounded-2xl text-sm font-bold transition-all border border-slate-200/50 dark:border-white/5"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-bold transition-all shadow-md"
                  >
                    Lưu hồ sơ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION IMPORT CONTAINER PREVIEW MODAL */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-150/50 dark:border-white/5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-500 w-5 h-5" />
                  Confer & Nhập Excel ({importPreviewData.length} bản ghi)
                </h3>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-zinc-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/10 p-3 rounded-2xl leading-relaxed">
                Các bản ghi dưới đây được phân tích từ file Excel của bạn. Vui lòng kiểm tra kỹ trước khi bấm <strong>"Xác nhận nhập"</strong> để lưu vào hệ thống cơ sở dữ liệu.
              </div>

              {/* Preview table body */}
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto border border-slate-150 dark:border-white/5 rounded-2xl no-scrollbar scroll-smooth">
                <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-black/25 text-slate-400 font-bold uppercase sticky top-0 border-b border-slate-150 dark:border-white/5">
                      <th className="py-2.5 px-4 whitespace-nowrap">Tên</th>
                      <th className="py-2.5 px-4 whitespace-nowrap">Ngày sinh</th>
                      <th className="py-2.5 px-4 whitespace-nowrap">Giới tính</th>
                      {activeTab === 'employees' ? (
                        <th className="py-2.5 px-4 whitespace-nowrap">CCCD</th>
                      ) : (
                        <th className="py-2.5 px-4 whitespace-nowrap">Địa bàn quản lý</th>
                      )}
                      <th className="py-2.5 px-4 whitespace-nowrap">Số điện thoại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {importPreviewData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-white whitespace-nowrap">{item.fullName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                          {safeFormatDate(item.birthDate)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.gender === 'Nam' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                          }`}>
                            {item.gender}
                          </span>
                        </td>
                        {activeTab === 'employees' ? (
                          <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{item.idCard || 'N/A'}</td>
                        ) : (
                          <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">{item.region || 'N/A'}</td>
                        )}
                        <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{item.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-150/50 dark:border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 py-3 rounded-2xl text-sm font-bold transition-all border border-slate-200/50"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="button"
                  onClick={confirmImport}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-sm font-bold transition-all shadow-md"
                >
                  Xác nhận nhập
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

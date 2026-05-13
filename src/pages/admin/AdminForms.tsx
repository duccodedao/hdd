import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Files, Plus, Trash2, Edit2, Share2, ChevronRight, Save, X, PlusCircle, Layout, ListChecks, Calendar, Type, Hash, ArrowLeft, Eye, Search, Download, Upload, CheckCircle2, Table as TableIcon, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';
import * as XLSX from 'xlsx';

interface Question {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
  role?: 'standard' | 'primary' | 'prefilled';
}

interface Form {
  id: string;
  name: string;
  slug: string;
  description: string;
  questions: Question[];
  createdAt: any;
  createdBy: string;
  hasDataset?: boolean;
  dataset?: any[];
}

export default function AdminForms() {
  const { openConfirm } = useConfirmStore();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'responses' | 'dataset_import'>('list');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [formResponsesLoading, setFormResponsesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [responseCounts, setResponseCounts] = useState<{ [key: string]: number }>({});
  const [creationMode, setCreationMode] = useState<'standard' | 'dataset' | null>(null);

  // Dataset Import State
  const [importData, setImportData] = useState<{ headers: string[], rows: any[] } | null>(null);
  const [mapping, setMapping] = useState<{ [key: string]: 'primary' | 'prefilled' | 'input' | 'ignore' }>({});

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    questions: [] as Question[],
    hasDataset: false,
    dataset: [] as any[]
  });

  useEffect(() => {
    const q = query(collection(db, 'forms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setForms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Form)));
      setLoading(false);
    });
    
    // Fetch counts
    const unsubCounts = onSnapshot(collection(db, 'form_responses'), (snap) => {
      const counts: { [key: string]: number } = {};
      snap.docs.forEach(doc => {
        const formId = doc.data().formId;
        counts[formId] = (counts[formId] || 0) + 1;
      });
      setResponseCounts(counts);
    });

    return () => { unsub(); unsubCounts(); };
  }, []);

  const handleCreateForm = async () => {
    if (!formData.name) return toast.error('Vui lòng nhập tên Folder!');
    
    const slug = formData.slug || formData.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Check if slug is unique
    if (forms.some(f => f.slug === slug)) {
      return toast.error('Slug này đã tồn tại, vui lòng chọn tên hoặc slug khác!');
    }
    
    try {
      await addDoc(collection(db, 'forms'), {
        ...formData,
        slug,
        questions: formData.questions,
        createdAt: serverTimestamp(),
        createdBy: 'admin'
      });
      toast.success('Đã tạo Folder thành công!');
      resetForm();
      setView('list');
    } catch (e) {
      toast.error('Lỗi khi tạo Folder');
    }
  };

  const handleUpdateForm = async () => {
    if (!selectedForm) return;

    const slug = formData.slug || selectedForm.slug;
    
    // Check if slug is unique (excluding current form)
    if (forms.some(f => f.slug === slug && f.id !== selectedForm.id)) {
      return toast.error('Slug này đã được sử dụng bởi Folder khác!');
    }

    try {
      await updateDoc(doc(db, 'forms', selectedForm.id), {
        ...formData,
        slug,
        questions: formData.questions,
        hasDataset: formData.hasDataset,
        dataset: formData.dataset
      });
      toast.success('Đã cập nhật Folder!');
      resetForm();
      setView('list');
    } catch (e) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleDeleteForm = (id: string) => {
    openConfirm({
      title: 'Xóa Folder Form',
      message: 'Bạn có chắc chắn muốn xóa Folder này và toàn bộ dữ liệu phản hồi bên trong?',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'forms', id));
          toast.success('Đã xóa Folder');
        } catch (e) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      questions: [],
      hasDataset: false,
      dataset: []
    });
    setSelectedForm(null);
    setImportData(null);
    setMapping({});
    setCreationMode(null);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      type: 'text',
      required: false,
      options: []
    };
    setFormData(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
  };

  const removeQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const viewResponses = async (form: Form) => {
    setSelectedForm(form);
    setFormResponsesLoading(true);
    setView('responses');
    try {
      const q = query(collection(db, 'form_responses'), where('formId', '==', form.id));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort manually to avoid index error in Firebase
      data.sort((a: any, b: any) => {
        const dateA = toSafeDate(a.submittedAt).getTime();
        const dateB = toSafeDate(b.submittedAt).getTime();
        return dateB - dateA;
      });
      
      setResponses(data);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi tải phản hồi');
    } finally {
      setFormResponsesLoading(false);
    }
  };

  const shareForm = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã copy link form!');
  };

  const exportToExcel = () => {
    if (!selectedForm || responses.length === 0) return;
    
    try {
      const headers = ['Thời gian', ...selectedForm.questions.map(q => q.label)];
      const rows = responses.map(resp => {
        const rowData: any[] = [format(toSafeDate(resp.submittedAt), 'HH:mm dd/MM/yyyy')];
        selectedForm.questions.forEach(q => {
          rowData.push(resp.answers[q.id] || '');
        });
        return rowData;
      });

      // Use XLSX to create a worksheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Phản hồi");

      // Generate buffer and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ket_qua_${selectedForm.slug}_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Đã xuất file Excel!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const filteredForms = forms.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadDatasetTemplate = () => {
    const headers = ['Họ và tên', 'Ngày sinh', 'Số điện thoại', 'Ghi chú 1', 'Ghi chú 2'];
    const sampleRows = [
      ['Nguyễn Văn A', '1995-05-20', '0912345678', 'Nội dung 1', 'Đã thanh toán'],
      ['Trần Thị B', '1998-10-15', '0987654321', 'Nội dung 2', 'Chưa thanh toán'],
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_du_lieu_complet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải mẫu dữ liệu!');
  };

  const downloadQuestionsOnlyTemplate = () => {
    const headers = ['label', 'type', 'required', 'options'];
    const sampleRows = [
      ['Họ và tên', 'text', 'true', ''],
      ['Giới tính', 'select', 'true', 'Nam|Nữ|Khác'],
      ['Ngày sinh', 'date', 'false', '']
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_cau_hoi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải mẫu câu hỏi!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) return toast.error('File không chứa dữ liệu!');
        
        if (creationMode === 'standard') {
          // Import Question rows
          const headers = jsonData[0].map(h => String(h || '').toLowerCase().trim());
          const labelIdx = headers.indexOf('label');
          const typeIdx = headers.indexOf('type');
          const reqIdx = headers.indexOf('required');
          const optIdx = headers.indexOf('options');

          if (labelIdx === -1) return toast.error('File thiếu cột "label"');

          const newQuestions: Question[] = [];
          jsonData.slice(1).forEach(row => {
            const label = String(row[labelIdx] || '').trim();
            if (!label) return;

            const type = String(row[typeIdx] || 'text').trim() as any;
            const required = String(row[reqIdx] || '').toLowerCase() === 'true';
            const options = String(row[optIdx] || '').split('|').map(o => o.trim()).filter(Boolean);

            newQuestions.push({
              id: Math.random().toString(36).substr(2, 9),
              label,
              type: ['text', 'textarea', 'number', 'date', 'select'].includes(type) ? type : 'text',
              required,
              options
            });
          });

          setFormData(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
          toast.success(`Đã import ${newQuestions.length} câu hỏi!`);
        } else {
          // Import Dataset columns (Dataset mode)
          const headers = jsonData[0].map(h => String(h || '').trim()).filter(Boolean);
          const rows = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((h, i) => { 
              let val = row[i];
              if (val instanceof Date) { val = format(val, 'yyyy-MM-dd'); }
              obj[h] = val ?? ''; 
            });
            return obj;
          });

          setImportData({ headers, rows });
          const initialMap: any = {};
          headers.forEach((h, i) => {
            initialMap[h] = i === 0 ? 'primary' : 'prefilled';
          });
          setMapping(initialMap);
          setView('dataset_import');
        }
      } catch (err) {
        toast.error('Lỗi khi đọc file. Vui lòng kiểm tra lại định dạng Excel/CSV');
        console.error(err);
      }
      e.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmDatasetImport = () => {
    if (!importData) return;

    const newQuestions: Question[] = [];
    const dataset: any[] = [];

    importData.headers.forEach(h => {
      const mode = mapping[h];
      if (mode === 'ignore') return;

      // Auto-detect type based on first non-empty value
      let detectedType: 'text' | 'date' | 'number' = 'text';
      const firstVal = importData.rows.find(r => r[h])?.[h];
      
      if (typeof firstVal === 'number') {
        detectedType = 'number';
      } else if (typeof firstVal === 'string' && firstVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        detectedType = 'date';
      }

      newQuestions.push({
        id: Math.random().toString(36).substr(2, 9),
        label: h,
        type: detectedType as any,
        required: true,
        role: mode === 'primary' ? 'primary' : (mode === 'prefilled' ? 'prefilled' : 'standard')
      });
    });

    // We only take the relevant columns for the dataset
    importData.rows.forEach(row => {
      const entry: any = { _id: Math.random().toString(36).substr(2, 9) };
      importData.headers.forEach(h => {
        if (mapping[h] !== 'ignore') {
          // Link back to question label
          entry[h] = row[h];
        }
      });
      dataset.push(entry);
    });

    setFormData(prev => ({
      ...prev,
      hasDataset: true,
      questions: [...prev.questions, ...newQuestions],
      dataset: dataset
    }));

    toast.success(`Đã import ${importData.rows.length} hàng dữ liệu!`);
    setView(selectedForm ? 'edit' : 'create');
    setImportData(null);
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-medium">Đang tải Folders...</div>;

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  <Files className="w-6 h-6 text-purple-500" /> Danh sách Folders/Form
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-400">Quản lý các thư mục biểu mẫu thu thập dữ liệu.</p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4">
                 <div className="relative w-full md:w-64">
                    <input 
                      type="text"
                      placeholder="Tìm kiếm Folder..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
                 <button 
                  onClick={() => { resetForm(); setView('create'); }}
                  className="w-full md:w-auto bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  Tạo Folder mới
                </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredForms.map(form => (
                <div key={form.id} className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all">
                   <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Files className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2 transition-opacity">
                        <button onClick={() => { shareForm(form.slug); }} className="p-2 text-slate-500 hover:text-blue-500 transition-colors" title="Share link"><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => { 
                          setSelectedForm(form); 
                          setFormData({ 
                            name: form.name, 
                            slug: form.slug, 
                            description: form.description, 
                            questions: form.questions,
                            hasDataset: form.hasDataset || false,
                            dataset: form.dataset || []
                          }); 
                          setCreationMode(form.hasDataset ? 'dataset' : 'standard');
                          setView('edit'); 
                        }} className="p-2 text-slate-500 hover:text-amber-500 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteForm(form.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>

                   <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-500 transition-colors">{form.name}</h4>
                   <p className="text-xs text-slate-500 font-mono mb-4">/form/{form.slug}</p>
                   
                   {form.description && (
                     <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10">{form.description}</p>
                   )}

                   <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {form.questions.length} câu hỏi
                        </div>
                        <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">
                          {responseCounts[form.id] || 0} phản hồi
                        </div>
                      </div>
                      <button 
                        onClick={() => viewResponses(form)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 group/btn"
                      >
                        Xem phản hồi
                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                   </div>
                </div>
              ))}

              {forms.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                   <Files className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-4" />
                   <p className="text-slate-500 font-medium">Chưa có Folder nào được tạo</p>
                </div>
              )}
           </div>
        </div>
      )}

      {view === 'dataset_import' && importData && (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setView(selectedForm ? 'edit' : 'create')}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-bold dark:text-white">Xác nhận dữ liệu Import</h3>
                <p className="text-sm text-slate-500">
                  Phát hiện <span className="font-bold text-slate-900 dark:text-white">{importData.headers.length} cột</span> và <span className="font-bold text-slate-900 dark:text-white">{importData.rows.length} hàng</span> dữ liệu.
                </p>
              </div>
           </div>

           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 space-y-6">
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-4">
                    <TableIcon className="w-5 h-5 text-blue-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white">Thiết lập vai trò cột</h4>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {importData.headers.map((h, i) => (
                      <div key={i} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl">
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={h}>{h}</span>
                         <select 
                           value={mapping[h]}
                           onChange={(e) => setMapping(prev => ({ ...prev, [h]: e.target.value as any }))}
                           className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                         >
                           <option value="primary">Cột Chính (Để người dùng chọn)</option>
                           <option value="prefilled">Dữ liệu cố định (Hiện tự động)</option>
                           <option value="input">Người dùng tự điền bổ sung</option>
                           <option value="ignore">Bỏ qua cột này</option>
                         </select>
                      </div>
                    ))}
                 </div>

                 <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium italic">
                      * Cột Chính: Người dùng sẽ chọn thông tin từ danh sách này (ví dụ: Họ tên).<br/>
                      * Dữ liệu cố định: Sau khi chọn cột chính, các thông tin ở cột này sẽ tự hiện ra và không thể sửa.
                    </p>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                 <button 
                  onClick={() => setView(selectedForm ? 'edit' : 'create')}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                 >
                   Quay lại
                 </button>
                 <button 
                   onClick={confirmDatasetImport}
                   className="bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition shadow-lg active:scale-95 flex items-center gap-2"
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   Xác nhận và Import
                 </button>
              </div>
           </div>
        </div>
      )}
      {(view === 'create' || view === 'edit') && (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-bold dark:text-white">
                  {view === 'create' ? 'Tạo Folder mới' : 'Thiết lập Folder'}
                </h3>
                <p className="text-sm text-slate-500">Cấu hình thông tin và danh sách câu hỏi.</p>
              </div>
           </div>

           {!creationMode && view === 'create' ? (
             <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 space-y-8">
                <div className="text-center space-y-2">
                   <h4 className="text-xl font-bold dark:text-white">Chọn loại hình khởi tạo</h4>
                   <p className="text-sm text-slate-500">Quyết định cách bạn muốn xây dựng Folder này.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <button 
                     onClick={() => setCreationMode('standard')}
                     className="p-8 rounded-3xl border-2 border-slate-100 dark:border-white/5 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all text-left group"
                   >
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                        <Files className="w-6 h-6" />
                      </div>
                      <h5 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Không có dữ liệu sẵn</h5>
                      <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">Phù hợp khi bạn chưa có data người dùng. Bạn sẽ tự tạo câu hỏi hoặc import bộ câu hỏi từ file Excel.</p>
                   </button>
                   
                   <button 
                     onClick={() => setCreationMode('dataset')}
                     className="p-8 rounded-3xl border-2 border-slate-100 dark:border-white/5 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all text-left group"
                   >
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                        <TableIcon className="w-6 h-6" />
                      </div>
                      <h5 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Có dữ liệu sẵn</h5>
                      <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">Phù hợp khi bạn đã có danh sách (Họ tên, mã NV...). Hệ thống sẽ tự tạo câu hỏi từ các cột dữ liệu.</p>
                   </button>
                </div>
             </div>
           ) : (
             <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold mb-2 ml-1 text-slate-500 uppercase tracking-widest">Tên Folder</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                    placeholder="Ví dụ: Thử Nghiệm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 ml-1 text-slate-500 uppercase tracking-widest">Slug (Tùy chọn)</label>
                  <input 
                    type="text" 
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white font-mono"
                    placeholder="thu-nghiem"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 ml-1 text-slate-500 uppercase tracking-widest">Mô tả Folder</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white resize-none"
                  rows={3}
                  placeholder="Nhập mô tả cho Folder này..."
                />
              </div>

              <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                 <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       <ListChecks className="w-5 h-5 text-purple-500" /> Cấu hình câu hỏi
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={creationMode === 'dataset' ? downloadDatasetTemplate : downloadQuestionsOnlyTemplate}
                        className="text-[10px] font-bold py-2 px-3 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-lg hover:bg-slate-200 transition flex items-center gap-1.5"
                        title="Tải mẫu file CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {creationMode === 'dataset' ? 'Mẫu Dữ Liệu' : 'Mẫu Câu Hỏi'}
                      </button>
                      <label className="text-[10px] font-bold py-2 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {creationMode === 'dataset' ? 'Import Dữ Liệu' : 'Import Câu Hỏi'}
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
                      </label>
                      <button 
                        onClick={addQuestion}
                        className="text-[10px] font-bold py-2 px-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Thêm câu hỏi
                      </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {formData.questions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6 relative group/q">
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-1">
                               <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-slate-400">
                                 {idx + 1}
                               </div>
                            </div>
                            <div className="md:col-span-6">
                               <input 
                                 type="text" 
                                 value={q.label}
                                 onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                                 className="w-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-500 dark:text-white"
                                 placeholder="Nhập câu hỏi..."
                                 disabled={q.role === 'primary' || q.role === 'prefilled'}
                               />
                            </div>
                            <div className="md:col-span-3">
                               <select 
                                 value={q.type}
                                 onChange={(e) => updateQuestion(q.id, { type: e.target.value as any })}
                                 className="w-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 dark:text-white"
                                 disabled={q.role === 'primary' || q.role === 'prefilled'}
                               >
                                 <option value="text">Văn bản ngắn</option>
                                 <option value="textarea">Văn bản dài</option>
                                 <option value="number">Số</option>
                                 <option value="date">Ngày tháng</option>
                                 <option value="select">Lựa chọn (Select)</option>
                               </select>
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4">
                               <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                   type="checkbox" 
                                   checked={q.required}
                                   onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                                   className="w-4 h-4 accent-purple-500"
                                   disabled={q.role === 'primary' || q.role === 'prefilled'}
                                 />
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bắt buộc</span>
                               </label>
                               <button 
                                 onClick={() => removeQuestion(q.id)}
                                 className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>

                         {q.role && q.role !== 'standard' && (
                           <div className="mt-2 px-12">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${q.role === 'primary' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                 {q.role === 'primary' ? 'Cột Chính (Chọn tên)' : 'Dữ liệu có sẵn (ReadOnly)'}
                              </span>
                           </div>
                         )}
                         
                         {q.type === 'select' && (
                           <div className="mt-4 pl-12 space-y-3">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danh sách tùy chọn</label>
                              <div className="flex flex-wrap gap-2">
                                 {q.options?.map((opt, oIdx) => (
                                   <div key={oIdx} className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg group/opt">
                                      <span className="text-sm dark:text-white">{opt}</span>
                                      <button 
                                        onClick={() => updateQuestion(q.id, { options: q.options?.filter((_, i) => i !== oIdx) })}
                                        className="text-slate-400 hover:text-rose-500"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                   </div>
                                 ))}
                                 <div className="flex items-center gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Thêm tùy chọn mới..."
                                      className="bg-transparent border-b border-slate-200 dark:border-white/10 px-2 py-1 text-xs outline-none focus:border-purple-500 dark:text-white"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const val = e.currentTarget.value.trim();
                                          if (val) {
                                            updateQuestion(q.id, { options: [...(q.options || []), val] });
                                            e.currentTarget.value = '';
                                          }
                                        }
                                      }}
                                    />
                                 </div>
                              </div>
                           </div>
                         )}
                      </div>
                    ))}

                    {formData.questions.length === 0 && (
                      <div className="text-center py-10 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                         <p className="text-xs text-slate-400 font-medium italic">Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu.</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                 <button 
                  onClick={() => setView('list')}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                 >
                   Hủy bỏ
                 </button>
                 <button 
                   onClick={view === 'create' ? handleCreateForm : handleUpdateForm}
                   className="bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition shadow-lg active:scale-95 flex items-center gap-2"
                 >
                   <Save className="w-4 h-4" />
                   {view === 'create' ? 'Tạo Folder' : 'Lưu thay đổi'}
                 </button>
              </div>
            </div>
           )}
        </div>
      )}

      {view === 'responses' && (
        <div className="space-y-6">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-bold dark:text-white">
                  Phản hồi: {selectedForm?.name}
                </h3>
                <p className="text-sm text-slate-500">Xem toàn bộ câu trả lời của Folder này.</p>
              </div>
           </div>

           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <div className="text-sm font-bold text-slate-900 dark:text-white">Tổng cộng: {responses.length} phản hồi</div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => selectedForm && viewResponses(selectedForm)}
                     className="p-2 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-lg hover:bg-slate-200 transition"
                     title="Làm mới"
                   >
                     <RefreshCw className={`w-4 h-4 ${formResponsesLoading ? 'animate-spin' : ''}`} />
                   </button>
                   <button 
                     onClick={exportToExcel}
                     disabled={responses.length === 0}
                     className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition disabled:opacity-50"
                   >
                     <Save className="w-4 h-4" />
                      Xuất Excel (.xlsx)
                   </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Thời gian</th>
                         {selectedForm?.questions.map(q => (
                           <th key={q.id} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{q.label}</th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                      {responses.map((resp, idx) => (
                        <tr key={resp.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex flex-col">
                               <span className="text-sm text-slate-900 dark:text-white font-medium">{format(toSafeDate(resp.submittedAt), 'HH:mm dd/MM')}</span>
                               <span className="text-[10px] text-slate-400">#{(resp.id as string).slice(-6)}</span>
                             </div>
                           </td>
                           {selectedForm?.questions.map(q => (
                             <td key={q.id} className="px-6 py-4">
                               <div className="text-sm text-slate-600 dark:text-slate-300 max-w-[250px] line-clamp-3">
                                 {resp.answers[q.id] || <span className="italic opacity-30 text-[10px]">Trống</span>}
                               </div>
                             </td>
                           ))}
                        </tr>
                      ))}
                   </tbody>
                </table>

                {responses.length === 0 && !formResponsesLoading && (
                  <div className="py-20 text-center">
                     <p className="text-slate-500 font-medium">Chưa có phản hồi nào cho Folder này</p>
                  </div>
                )}

                {formResponsesLoading && (
                  <div className="py-20 text-center text-slate-500">Đang tải phản hồi...</div>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

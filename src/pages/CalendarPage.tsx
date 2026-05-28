import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, getDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, AlertCircle, Clock, RefreshCw, ListTodo, Search, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { createPortal } from 'react-dom';
import AppLogo from '../components/ui/AppLogo';
import LoadingScreen from '../components/ui/LoadingScreen';
import * as XLSX from 'xlsx';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  importance: 'low' | 'medium' | 'high';
  status?: 'completed' | 'not_completed' | 'overdue' | 'processing' | 'pending';
  description?: string;
  createdAt: number;
  syncedFromTasks?: boolean;
  syncedFromTaskId?: string;
}

export default function CalendarPage() {
  const { userData, isSuperAdmin, isAdmin } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'all-tasks' | 'recurring'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterSource, setFilterSource] = useState<'all' | 'calendar' | 'tasks'>('all');
  const [filterImportance, setFilterImportance] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'has-date' | 'no-date'>('all');
  const [filterDescription, setFilterDescription] = useState<'all' | 'has-desc' | 'no-desc'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // Recurring states
  const [recurringEvents, setRecurringEvents] = useState<any[]>([]);
  const [recurringFilter, setRecurringFilter] = useState<'all' | 'yearly' | 'monthly'>('all');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<any | null>(null);
  const [recurringToDelete, setRecurringToDelete] = useState<string | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    title: '',
    type: 'yearly' as 'yearly' | 'monthly',
    day: 1,
    month: 1,
    importance: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'completed' | 'not_completed' | 'overdue' | 'processing' | 'pending',
    description: ''
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    importance: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'completed' | 'not_completed' | 'overdue' | 'processing' | 'pending'
  });

  const canEdit = isSuperAdmin || isAdmin;

  useEffect(() => {
    const unsubEvents = onSnapshot(query(collection(db, 'calendar_events'), orderBy('createdAt', 'desc')), (snapshot) => {
      const items: CalendarEvent[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      setEvents(items);
      setLoading(false);
    }, (err) => {
      console.error("Calendar fetch error:", err);
      toast.error('Không thể tải dữ liệu lịch');
      setLoading(false);
    });

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(items);
    }, (err) => {
      console.error("Tasks fetch error:", err);
    });

    const unsubRecurring = onSnapshot(collection(db, 'recurring_events'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = items.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setRecurringEvents(sorted);
    }, (err) => {
      console.error("Recurring fetch error:", err);
    });

    return () => {
      unsubEvents();
      unsubTasks();
      unsubRecurring();
    };
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleOpenRecurringModal = (re?: any) => {
    if (!canEdit) return;
    if (re) {
      setSelectedRecurring(re);
      setRecurringForm({
        title: re.title,
        type: re.type,
        day: re.day,
        month: re.month || 1,
        importance: re.importance,
        status: re.status || 'pending',
        description: re.description || ''
      });
    } else {
      setSelectedRecurring(null);
      setRecurringForm({
        title: '',
        type: 'yearly',
        day: 1,
        month: 1,
        importance: 'medium',
        status: 'pending',
        description: ''
      });
    }
    setIsRecurringModalOpen(true);
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.title.trim()) return toast.error('Vui lòng nhập tiêu đề');
    
    try {
      const dataToSave = {
        title: recurringForm.title.trim(),
        type: recurringForm.type,
        day: Number(recurringForm.day),
        ...(recurringForm.type === 'yearly' && { month: Number(recurringForm.month) }),
        importance: recurringForm.importance,
        status: recurringForm.status,
        description: recurringForm.description.trim(),
      };

      if (selectedRecurring) {
        await setDoc(doc(db, 'recurring_events', selectedRecurring.id), dataToSave, { merge: true });
        toast.success('Đã cập nhật công việc định kỳ');
      } else {
        await addDoc(collection(db, 'recurring_events'), {
          ...dataToSave,
          createdAt: Date.now()
        });
        toast.success('Đã thêm công việc định kỳ mới');
      }
      setIsRecurringModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi lưu');
    }
  };

  const downloadTemplate = () => {
    try {
      const wsData = [
        {
          "Tiêu đề (Bắt buộc)": "Kỷ niệm Ngày thành lập công ty",
          "Chu kỳ (hang_nam / hang_thang)": "hang_nam",
          "Ngày (1-31)": 15,
          "Tháng (1-12, bỏ trống nếu hằng tháng)": 5,
          "Độ quan trọng (low / medium / high)": "high",
          "Mô tả chi tiết": "Tổ chức kỷ niệm ngày thành lập công ty toàn hệ thống hằng năm vào ngày 15 tháng 5."
        },
        {
          "Tiêu đề (Bắt buộc)": "Quyết toán thuế hàng tháng",
          "Chu kỳ (hang_nam / hang_thang)": "hang_thang",
          "Ngày (1-31)": 30,
          "Tháng (1-12, bỏ trống nếu hằng tháng)": "",
          "Độ quan trọng (low / medium / high)": "medium",
          "Mô tả chi tiết": "Hoần thành đối chiếu hóa đơn và nộp báo cáo thuế hàng tháng."
        },
        {
          "Tiêu đề (Bắt buộc)": "Gặp mặt đầu xuân",
          "Chu kỳ (hang_nam / hang_thang)": "hang_nam",
          "Ngày (1-31)": 1,
          "Tháng (1-12, bỏ trống nếu hằng tháng)": 1,
          "Độ quan trọng (low / medium / high)": "low",
          "Mô tả chi tiết": "Họp mặt chúc tết đầu năm mới dương lịch."
        }
      ];

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mau_Import_Lich");
      XLSX.writeFile(wb, "Mau_Import_Lich_Dinh_Ky.xlsx");
      toast.success('Đã tải xuống file mẫu Excel!');
    } catch (err) {
      console.error("Download template error:", err);
      toast.error('Có lỗi xảy ra khi tải xuống file mẫu');
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const toastId = toast.loading('Đang xử lý và import dữ liệu từ Excel...');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          toast.error('File Excel không có dữ liệu hoặc sai định dạng.', { id: toastId });
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          const title = row["Tiêu đề (Bắt buộc)"] || row["Tiêu đề"] || row["Tieu de"] || row["title"] || '';
          if (!title || String(title).trim() === '') {
            errorCount++;
            continue;
          }

          const cycleRaw = String(row["Chu kỳ (hang_nam / hang_thang)"] || row["Chu kỳ"] || row["Chu ky"] || row["type"] || '').toLowerCase();
          let type: 'yearly' | 'monthly' = 'yearly';
          if (cycleRaw.includes('thang') || cycleRaw.includes('monthly') || cycleRaw.includes('tháng')) {
            type = 'monthly';
          }

          const dayRaw = parseInt(row["Ngày (1-31)"] || row["Ngày"] || row["Ngay"] || row["day"]) || 1;
          const day = Math.max(1, Math.min(31, dayRaw));

          let month = undefined;
          if (type === 'yearly') {
            const monthRaw = parseInt(row["Tháng (1-12, bỏ trống nếu hằng tháng)"] || row["Tháng"] || row["Thang"] || row["month"]) || 1;
            month = Math.max(1, Math.min(12, monthRaw));
          }

          const importanceRaw = String(row["Độ quan trọng (low / medium / high)"] || row["Độ quan trọng"] || row["Do quan trong"] || row["importance"] || '').toLowerCase().trim();
          let importance: 'low' | 'medium' | 'high' = 'medium';
          if (importanceRaw === 'high' || importanceRaw === 'cao' || importanceRaw === 'quan trọng') {
            importance = 'high';
          } else if (importanceRaw === 'low' || importanceRaw === 'thấp') {
            importance = 'low';
          }

          const description = row["Mô tả chi tiết"] || row["Mô tả"] || row["Mo ta"] || row["description"] || '';

          await addDoc(collection(db, 'recurring_events'), {
            title: String(title).trim(),
            type,
            day,
            ...(month !== undefined && { month }),
            importance,
            description: String(description).trim(),
            createdAt: Date.now()
          });

          successCount++;
        }

        toast.success(`Import thành công ${successCount} công việc định kỳ! (Lỗi: ${errorCount})`, { id: toastId });
      } catch (err) {
        console.error("Excel import error:", err);
        toast.error('Đã xảy ra lỗi khi đọc file Excel.', { id: toastId });
      }
    };

    reader.readAsBinaryString(selectedFile);
    if (e.target) e.target.value = '';
  };

  const handleOpenModal = (date: Date, ev?: any) => {
    if (!canEdit) return;
    setSelectedDateStr(format(date, 'yyyy-MM-dd'));
    if (ev) {
      if (ev.isRecurringInstance) {
        const actualRe = recurringEvents.find(re => re.id === ev.recurringId);
        if (actualRe) {
          handleOpenRecurringModal(actualRe);
          return;
        }
      }
      setEditingEvent(ev);
      setEventForm({
        title: ev.title,
        description: ev.description || '',
        importance: ev.importance,
        status: ev.status || 'pending'
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        importance: 'medium',
        status: 'pending'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return tooltipError('Vui lòng nhập tiêu đề');
    
    try {
      if (editingEvent) {
        await setDoc(doc(db, 'calendar_events', editingEvent.id), {
          title: eventForm.title,
          description: eventForm.description,
          importance: eventForm.importance,
          status: eventForm.status,
          date: selectedDateStr
        }, { merge: true });
        toast.success('Đã cập nhật công việc');
      } else {
        await addDoc(collection(db, 'calendar_events'), {
          title: eventForm.title,
          description: eventForm.description,
          importance: eventForm.importance,
          status: eventForm.status,
          date: selectedDateStr,
          createdAt: Date.now()
        });
        toast.success('Đã thêm công việc mới');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi lưu');
    }
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      setEventToDelete(editingEvent.id);
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventToDelete));
      toast.success('Đã xóa công việc');
      setIsModalOpen(false);
      setEventToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi khi xóa');
    }
  };

  const confirmDeleteRecurring = async () => {
    if (!recurringToDelete) return;
    try {
      await deleteDoc(doc(db, 'recurring_events', recurringToDelete));
      toast.success('Đã xóa công việc định kỳ');
      setRecurringToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi khi xóa');
    }
  };

  const handleSyncFromTasks = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Đang đồng bộ dữ liệu từ Công việc...');
    try {
      // Fetch all from tasks
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Fetch existing events to prevent duplicates
      const eventsSnapshot = await getDocs(collection(db, 'calendar_events'));
      const existingEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      let addedCount = 0;
      let updatedCount = 0;

      for (const t of tasksData) {
        const title = t.title || 'Không tên';
        let dateStr = format(new Date(), 'yyyy-MM-dd');
        if (t.deadline) {
          try {
            dateStr = format(parseISO(t.deadline), 'yyyy-MM-dd');
          } catch {
            dateStr = t.deadline;
          }
        }
        
        const description = t.note || '';
        const importance = t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'medium' : 'low';

        // Check duplicate or previously synced event
        const duplicateEvent = existingEvents.find(ev => 
          ev.id === `task_sync_${t.id}` || 
          ev.syncedFromTaskId === t.id ||
          (ev.title?.trim().toLowerCase() === title.trim().toLowerCase() && ev.date === dateStr)
        );

        if (duplicateEvent) {
          // Update the existing document with the latest info
          await setDoc(doc(db, 'calendar_events', duplicateEvent.id), {
            title,
            description,
            importance,
            date: dateStr,
            syncedFromTasks: true,
            syncedFromTaskId: t.id
          }, { merge: true });
          updatedCount++;
        } else {
          // Create the document with a deterministic duplicate-proof index key ID
          const newDocId = `task_sync_${t.id}`;
          await setDoc(doc(db, 'calendar_events', newDocId), {
            title,
            description,
            importance,
            date: dateStr,
            createdAt: Date.now(),
            syncedFromTasks: true,
            syncedFromTaskId: t.id
          });
          addedCount++;
        }
      }

      toast.success(`Đồng bộ thành công! Thêm mới: ${addedCount}, Cập nhật: ${updatedCount}`, { id: toastId });
    } catch (err) {
      console.error("Sync error:", err);
      toast.error('Có lỗi xảy ra trong quá trình đồng bộ.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAndEdit = async (item: any) => {
    setIsSyncing(true);
    const toastId = toast.loading('Đang đồng bộ và mở chỉnh sửa...');
    try {
      const title = item.title || 'Không tên';
      let dateStr = item.date || format(new Date(), 'yyyy-MM-dd');
      const description = item.description || '';
      const importance = item.importance || 'medium';

      const docId = `task_sync_${item.id}`;

      // Insert or update directly using the deterministic key ID to avoid duplication
      await setDoc(doc(db, 'calendar_events', docId), {
        title,
        description,
        importance,
        date: dateStr,
        createdAt: Date.now(),
        syncedFromTasks: true,
        syncedFromTaskId: item.id
      }, { merge: true });

      const newEvent = {
        id: docId,
        title,
        description,
        importance,
        date: dateStr,
        createdAt: Date.now(),
        syncedFromTasks: true,
        syncedFromTaskId: item.id
      } as CalendarEvent;
      
      toast.success('Đồng bộ thành công! Đang mở chỉnh sửa...', { id: toastId });
      
      // Open modal
      try {
        handleOpenModal(parseISO(dateStr), newEvent);
      } catch {
        handleOpenModal(new Date(dateStr), newEvent);
      }
    } catch (err) {
      console.error("Sync and edit error:", err);
      toast.error('Có lỗi xảy ra khi đồng bộ.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const tooltipError = (msg: string) => toast.error(msg);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const d = date.getDate();
    const m = date.getMonth() + 1;
    
    // Normal calendar events
    const normal = events.filter(e => e.date === dateStr);
    
    // Projected recurring events
    const recurring = recurringEvents.filter(re => {
      if (re.type === 'yearly') {
        return Number(re.day) === d && Number(re.month) === m;
      } else if (re.type === 'monthly') {
        return Number(re.day) === d;
      }
      return false;
    }).map(re => ({
      id: `rec_${re.id}_${dateStr}`,
      title: re.title,
      date: dateStr,
      importance: re.importance,
      description: re.description,
      createdAt: re.createdAt || Date.now(),
      isRecurringInstance: true,
      recurringId: re.id,
      recurringType: re.type,
      recurringDay: re.day,
      recurringMonth: re.month
    }) as any);

    return [...normal, ...recurring];
  };

  const getImportanceColor = (imp: string) => {
    switch (imp) {
      case 'high': return 'bg-rose-500 text-white border-rose-600';
      case 'medium': return 'bg-amber-500 text-white border-amber-600';
      case 'low': return 'bg-indigo-500 text-white border-indigo-600';
      default: return 'bg-slate-500 text-white border-slate-600';
    }
  };

  const getImportanceBgColor = (eventsForDay: CalendarEvent[]) => {
    if (eventsForDay.some(e => e.importance === 'high')) return 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30';
    if (eventsForDay.some(e => e.importance === 'medium')) return 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30';
    if (eventsForDay.length > 0) return 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30';
    return 'bg-white dark:bg-transparent border-slate-100 dark:border-white/5';
  };

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'completed': 
        return { label: 'Hoàn thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30' };
      case 'not_completed': 
        return { label: 'Không hoàn thành', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' };
      case 'overdue': 
        return { label: 'Trễ hạn', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30' };
      case 'processing': 
        return { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30' };
      case 'pending': 
      default:
        return { label: 'Chờ xử lý', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-400 dark:border-white/20' };
    }
  };

  const combinedTasks = [
    ...events.map(ev => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      importance: ev.importance,
      status: ev.status,
      description: ev.description || '',
      source: 'Lịch làm việc',
      isEvent: true,
      raw: ev
    })),
    ...tasks
      .filter(t => !events.some(ev => ev.syncedFromTaskId === t.id))
      .map(t => {
        let dateStr = '';
        if (t.deadline) {
          try {
            dateStr = format(parseISO(t.deadline), 'yyyy-MM-dd');
          } catch {
            dateStr = t.deadline;
          }
        }
        return {
          id: t.id,
          title: t.title || 'Không tên',
          date: dateStr,
          importance: t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'medium' : 'low',
          status: t.status || 'pending',
          description: t.note || '',
          source: 'Tab Công việc',
          isEvent: false,
          raw: t
        };
      })
  ];

  const filteredCombined = combinedTasks.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = 
      filterSource === 'all' ||
      (filterSource === 'calendar' && item.isEvent) ||
      (filterSource === 'tasks' && !item.isEvent);

    const matchesImportance =
      filterImportance === 'all' ||
      (item.importance === filterImportance);

    const matchesDate =
      filterDate === 'all' ||
      (filterDate === 'has-date' && !!item.date) ||
      (filterDate === 'no-date' && !item.date);

    const matchesDesc =
      filterDescription === 'all' ||
      (filterDescription === 'has-desc' && !!item.description?.trim()) ||
      (filterDescription === 'no-desc' && !item.description?.trim());

    return matchesSearch && matchesSource && matchesImportance && matchesDate && matchesDesc;
  });

  filteredCombined.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-black/20 overflow-y-auto no-scrollbar relative min-h-screen">
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
               <div className="p-2 border-2 border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                 <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
               </div>
               Lịch Làm Việc
             </h1>
             <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-2xl">
               Theo dõi và quản lý các công việc quan trọng trong tháng.
             </p>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm dark:text-white">
               Hôm nay
             </button>
             <div className="flex items-center rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm">
               <button onClick={prevMonth} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-r border-slate-200 dark:border-white/10">
                 <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
               </button>
               <span className="px-4 py-2 text-sm font-bold text-slate-900 dark:text-white min-w-[140px] text-center capitalize">
                 {format(currentDate, 'MMMM yyyy', { locale: vi })}
               </span>
               <button onClick={nextMonth} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-l border-slate-200 dark:border-white/10">
                 <ChevronRight className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
               </button>
             </div>
          </div>
        </div>

        {/* Navigation Tabs (Lịch làm việc vs Danh sách tất cả) & Đồng bộ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2",
                viewMode === 'calendar' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <CalendarIcon className="w-4 h-4" /> Lịch làm việc
            </button>
            <button 
              onClick={() => setViewMode('all-tasks')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2",
                viewMode === 'all-tasks' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <ListTodo className="w-4 h-4" /> Danh sách công việc tất cả
            </button>
            <button 
              onClick={() => setViewMode('recurring')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2",
                viewMode === 'recurring' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <Clock className="w-4 h-4" /> Công việc định kỳ (Lặp lại)
            </button>
          </div>

          {canEdit && (
            <button
              onClick={handleSyncFromTasks}
              disabled={isSyncing}
              className={cn(
                "px-4 py-2 hover:opacity-90 active:scale-[0.98] border border-transparent cursor-pointer rounded-xl text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 flex items-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50"
              )}
              title="Đồng bộ tất cả dữ liệu từ Tab Công việc cũ sang Lịch làm việc"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              Đồng bộ từ Công việc
            </button>
          )}
        </div>

        {viewMode === 'calendar' ? (
          <>
            {/* Calendar Grid */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
              {/* Days of week */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-950/50">
                {weekDays.map(day => (
                  <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr">
                {days.map((day, dayIdx) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "min-h-[100px] p-2 border-r border-b border-slate-100 dark:border-white/5 relative group transition-colors cursor-pointer",
                        !isCurrentMonth ? "bg-slate-50/50 dark:bg-zinc-950/30 text-slate-400 dark:text-zinc-600" : "text-slate-900 dark:text-zinc-200",
                        isTodayDate ? "bg-blue-50/30 dark:bg-indigo-500/5" : "bg-white dark:bg-transparent",
                        isSameDay(day, selectedDay) && "ring-2 ring-inset ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-500/10",
                        dayEvents.length > 5 ? "animate-[pulse_3s_infinite] bg-rose-500/5 dark:bg-rose-500/10 ring-1 ring-rose-500/30" : "hover:bg-slate-50 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-1 ml-1",
                          isTodayDate && "bg-indigo-600 text-white shadow-md",
                          !isTodayDate && !isCurrentMonth && "opacity-50"
                        )}>
                          {format(day, dateFormat)}
                        </span>
                        {dayEvents.length > 5 && (
                          <span className="hidden md:inline-flex text-[9px] font-extrabold text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/40 px-1 rounded border border-rose-200 dark:border-rose-900 ml-auto mr-1 mt-1 shrink-0 scale-90 animate-bounce" title="Quá tải công việc (>5 việc)">
                            ⚠️ {dayEvents.length} việc
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1 px-1">
                        {dayEvents.map(ev => (
                          <div 
                            key={ev.id}
                            className={cn(
                              "w-2.5 h-2.5 rounded-full shadow-sm transition-all",
                              ev.isRecurringInstance 
                                ? 'bg-emerald-500 border border-emerald-600 dark:border-emerald-450' 
                                : ev.importance === 'high' ? 'bg-rose-500' : ev.importance === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                            )}
                            title={ev.title + (ev.isRecurringInstance ? " (Định kỳ lặp lại)" : "")}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Events List */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-white/5 pb-4 gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 leading-tight">
                  <span>Công việc ngày {format(selectedDay, 'dd/MM/yyyy')}</span>
                  <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-450 font-extrabold px-2 py-0.5 rounded-full inline-flex items-center ml-0.5" id="selected-day-event-count">
                    ({getEventsForDay(selectedDay).length} việc)
                  </span>
                </h3>
                {canEdit && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(selectedDay); }}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md cursor-pointer pointer-events-auto"
                  >
                    <Plus className="w-4 h-4" /> Thêm mới
                  </button>
                )}
              </div>
              
               <div className="flex-1 overflow-x-auto no-scrollbar scroll-smooth">
                 {getEventsForDay(selectedDay).length === 0 ? (
                   <div className="h-full min-h-[150px] flex items-center justify-center">
                     <p className="text-slate-500 dark:text-zinc-500 text-sm">Không có công việc nào trong ngày này.</p>
                   </div>
                 ) : (
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                     <thead>
                       <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                         <th className="py-3 px-4 whitespace-nowrap">Tiêu đề</th>
                         <th className="py-3 px-4 w-32 whitespace-nowrap">Mức độ</th>
                         <th className="py-3 px-4 w-36 whitespace-nowrap">Trạng thái</th>
                         <th className="py-3 px-4 whitespace-nowrap">Mô tả chi tiết</th>
                         {canEdit && <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Thao tác</th>}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                       {getEventsForDay(selectedDay).map(ev => (
                         <tr 
                           key={ev.id}
                           onClick={() => canEdit && handleOpenModal(selectedDay, ev)}
                           className={cn(
                             "group transition-colors hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300",
                             canEdit && "cursor-pointer"
                           )}
                         >
                           <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                             {ev.title}
                           </td>
                           <td className="py-3.5 px-4 whitespace-nowrap">
                             <span className={cn(
                               "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                               ev.importance === 'high' 
                                 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' 
                                 : ev.importance === 'medium'
                                   ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                                   : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30'
                             )}>
                               {ev.importance === 'high' ? 'Quan trọng' : ev.importance === 'medium' ? 'Trung bình' : 'Thấp'}
                             </span>
                           </td>
                           <td className="py-3.5 px-4 whitespace-nowrap">
                             <span className={cn(
                               "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                               getStatusInfo(ev.status).color
                             )}>
                               {getStatusInfo(ev.status).label}
                             </span>
                           </td>
                           <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed whitespace-nowrap">
                             {ev.description || <span className="text-slate-300 dark:text-zinc-600 italic font-normal">Không có mô tả</span>}
                           </td>
                           {canEdit && (
                             <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(selectedDay, ev); }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all inline-flex items-center"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (ev.isRecurringInstance) {
                                    setRecurringToDelete(ev.recurringId);
                                  } else {
                                    setEventToDelete(ev.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all inline-flex items-center"
                                title="Xóa công việc này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 justify-center pb-8 pt-4">
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500" /> Quan trọng</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" /> Trung bình</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" /> Thấp</div>
               <div className="flex items-center gap-1.5 animate-pulse"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Chấm xanh lá cây: Lặp lại / định kỳ</div>
            </div>
          </>
        ) : viewMode === 'all-tasks' ? (
          /* All integrated tasks list mode */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 flex flex-col min-h-[400px] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Danh sách công việc tất cả
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Dữ liệu tích hợp của "TAB công việc" và "Lịch làm việc" ({filteredCombined.length} đầu việc).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search input */}
                <div className="relative w-full sm:w-72 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên, mô tả hoặc nguồn..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  />
                </div>

                {/* Filter Mức độ */}
                <select
                  value={filterImportance}
                  onChange={e => setFilterImportance(e.target.value as any)}
                  className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all shadow-sm"
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="high">Mức độ: Quan trọng</option>
                  <option value="medium">Mức độ: Trung bình</option>
                  <option value="low">Mức độ: Thấp</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar scroll-smooth">
              {filteredCombined.length === 0 ? (
                <div className="h-full min-h-[250px] flex flex-col items-center justify-center">
                  <p className="text-slate-500 dark:text-zinc-500 text-sm">Không tìm thấy công việc nào phù hợp.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                      <th className="py-3 px-4 whitespace-nowrap">Tiêu đề</th>
                      <th className="py-3 px-4 w-36 whitespace-nowrap">Ngày / Thời hạn</th>
                      <th className="py-3 px-4 w-40 whitespace-nowrap">Nguồn dữ liệu</th>
                      <th className="py-3 px-4 w-32 whitespace-nowrap">Mức độ</th>
                      <th className="py-3 px-4 w-36 whitespace-nowrap">Trạng thái</th>
                      <th className="py-3 px-4 whitespace-nowrap">Mô tả chi tiết</th>
                      {canEdit && <th className="py-3 px-4 text-right w-36 whitespace-nowrap">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                    {filteredCombined.map(item => (
                      <tr 
                        key={item.id + '-' + item.source}
                        onClick={() => {
                          if (canEdit) {
                            if (item.isEvent) {
                              try {
                                handleOpenModal(parseISO(item.date), item.raw);
                              } catch {
                                handleOpenModal(new Date(item.date), item.raw);
                              }
                            } else {
                              handleSyncAndEdit(item);
                            }
                          }
                        }}
                        className={cn(
                          "group transition-colors hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300",
                          canEdit && "cursor-pointer"
                        )}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                          {item.date ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              {format(parseISO(item.date), 'dd/MM/yyyy')}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-600 italic font-normal">Chưa thiết lập</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold",
                            item.isEvent 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                          )}>
                            {item.source}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                            item.importance === 'high' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' 
                              : item.importance === 'medium'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30'
                          )}>
                            {item.importance === 'high' ? 'Quan trọng' : item.importance === 'medium' ? 'Trung bình' : 'Thấp'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                           <span className={cn(
                             "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                             getStatusInfo(item.status).color
                           )}>
                             {getStatusInfo(item.status).label}
                           </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed whitespace-nowrap">
                          {item.description || <span className="text-slate-300 dark:text-zinc-600 italic font-normal">Không có mô tả</span>}
                        </td>
                        {canEdit && (
                          <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                            {item.isEvent ? (
                              <div className="flex items-center justify-end space-x-1">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    try {
                                      handleOpenModal(parseISO(item.date), item.raw); 
                                    } catch {
                                      handleOpenModal(new Date(item.date), item.raw);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all inline-flex items-center"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setEventToDelete(item.id);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all inline-flex items-center"
                                  title="Xóa công việc này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSyncAndEdit(item);
                                }}
                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20 rounded-xl transition-all shadow-sm shrink-0"
                              >
                                Đồng bộ & Sửa
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Recurring tasks mode */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 flex flex-col min-h-[400px] space-y-4 animate-in fade-in duration-305">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Sổ danh sách công việc định kỳ
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Công việc lặp lại hằng năm / hằng tháng tự động điền vào lịch làm việc.
                </p>
              </div>
              
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={downloadTemplate}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Tải file mẫu .xlsx
                  </button>

                  <div className="relative inline-block">
                    <button 
                      type="button"
                      className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 dark:text-teal-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-teal-200/50 dark:border-teal-500/20 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> Nhập tệp Excel
                    </button>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleExcelImport}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  <button 
                    onClick={() => handleOpenRecurringModal()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm thủ công
                  </button>
                </div>
              )}
            </div>

              {/* Tách việc năm và tháng riêng - Tab filter selectors */}
              {recurringEvents.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-black/10 p-1 rounded-2xl border border-slate-100 dark:border-white/5 self-start w-full sm:w-auto">
                  <button
                    onClick={() => setRecurringFilter('all')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                      recurringFilter === 'all'
                        ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    📂 Tất cả
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 font-bold">
                      {recurringEvents.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setRecurringFilter('yearly')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                      recurringFilter === 'yearly'
                        ? "bg-amber-550/10 text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    🗓️ Hằng năm
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {recurringEvents.filter(re => re.type === 'yearly').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setRecurringFilter('monthly')}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                      recurringFilter === 'monthly'
                        ? "bg-teal-550/10 text-teal-600 dark:text-teal-400 bg-white dark:bg-zinc-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    🔄 Hằng tháng
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                      {recurringEvents.filter(re => re.type === 'monthly').length}
                    </span>
                  </button>
                </div>
              )}

              {/* Table of recurring events */}
              <div className="overflow-x-auto no-scrollbar scroll-smooth">
                {recurringEvents.length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600">
                    <FileSpreadsheet className="w-12 h-12 mb-3 opacity-40 text-indigo-500" />
                    <p className="text-sm font-medium">Chưa có công việc định kỳ nào được thiết lập.</p>
                    <p className="text-xs mt-1">Sử dụng tính năng import Excel hoặc Thêm thủ công bên dưới.</p>
                  </div>
                ) : recurringEvents.filter(re => recurringFilter === 'all' || re.type === recurringFilter).length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 dark:text-zinc-650">
                    <CalendarIcon className="w-12 h-12 mb-3 opacity-30 text-slate-400" />
                    <p className="text-sm font-medium">Không tìm thấy công việc định kỳ thuộc nhóm này.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        <th className="py-3 px-4 whitespace-nowrap">Tiêu đề</th>
                        <th className="py-3 px-4 w-32 whitespace-nowrap">Chu kỳ</th>
                        <th className="py-3 px-4 w-28 whitespace-nowrap">Áp dụng</th>
                        <th className="py-3 px-4 w-36 whitespace-nowrap">Trạng thái</th>
                        <th className="py-3 px-4 w-28 whitespace-nowrap">Mức độ</th>
                        <th className="py-3 px-4 whitespace-nowrap">Mô tả</th>
                        {canEdit && <th className="py-3 px-4 text-right w-24 whitespace-nowrap">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                      {recurringEvents
                        .filter(re => recurringFilter === 'all' || re.type === recurringFilter)
                        .map(re => (
                          <tr 
                            key={re.id}
                            className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-zinc-300"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {re.title}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider",
                                re.type === 'yearly' 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' 
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-400'
                              )}>
                                {re.type === 'yearly' ? 'Hằng năm' : 'Hằng tháng'}
                              </span>
                            </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                            {re.type === 'yearly' ? `Ngày ${re.day}/${re.month}` : `Ngày ${re.day}`}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                              getStatusInfo(re.status).color
                            )}>
                              {getStatusInfo(re.status).label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                              re.importance === 'high' 
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' 
                                : re.importance === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30'
                            )}>
                              {re.importance === 'high' ? 'Quan trọng' : re.importance === 'medium' ? 'Trung bình' : 'Thấp'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                            {re.description || <span className="italic opacity-50 font-normal">Không có mô tả</span>}
                          </td>
                          {canEdit && (
                            <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                              <button 
                                onClick={() => handleOpenRecurringModal(re)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all inline-flex items-center"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setRecurringToDelete(re.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all inline-flex items-center"
                                title="Xóa lịch này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
          </div>
        )}

      </div>

      {/* Modal Edit/Add */}
      {createPortal(
        <AnimatePresence>
          {isModalOpen && canEdit && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
            >
              <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/50">
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <Clock className="w-5 h-5 text-indigo-500" />
                   {editingEvent ? 'Chỉnh sửa Công việc' : 'Thêm Công việc Mới'}
                 </h2>
                 <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 dark:bg-white/10 px-3 py-1 rounded-full">
                   {format(parseISO(selectedDateStr), 'dd/MM/yyyy')}
                 </span>
              </div>
              
              <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tiêu đề</label>
                  <input 
                    type="text" 
                    value={eventForm.title}
                    onChange={e => setEventForm({...eventForm, title: e.target.value})}
                    placeholder="Nhập tiêu đề công việc..."
                    autoFocus
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Độ quan trọng</label>
                  <select 
                    value={eventForm.importance}
                    onChange={e => setEventForm({...eventForm, importance: e.target.value as any})}
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                  >
                    <option value="high">Quan trọng cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Trạng thái công việc</label>
                  <select 
                    value={eventForm.status}
                    onChange={e => setEventForm({...eventForm, status: e.target.value as any})}
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                  >
                    <option value="pending">Chờ xử lý</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="not_completed">Không hoàn thành</option>
                    <option value="overdue">Trễ hạn</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mô tả (tùy chọn)</label>
                  <textarea 
                    value={eventForm.description}
                    onChange={e => setEventForm({...eventForm, description: e.target.value})}
                    placeholder="Ghi chú chi tiết..."
                    rows={3}
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white resize-none"
                  />
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Hủy
                  </button>
                  {editingEvent && (
                    <button 
                      type="button"
                      onClick={handleDeleteEvent}
                      className="py-3 px-4 rounded-xl font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center justify-center"
                      title="Xóa công việc này"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={!eventForm.title.trim()}
                    className="flex-[2] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Lưu Công Việc
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {eventToDelete && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setEventToDelete(null); }}
            >
               <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col"
              onClick={e => e.stopPropagation()}
             >
               <div className="p-6 pb-2">
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                   <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Xóa Công Việc</h2>
                 <p className="text-slate-500 dark:text-zinc-400 text-sm text-center mt-2">
                   Bạn có chắc chắn muốn xóa công việc này không? Hành động này không thể hoàn tác.
                 </p>
               </div>
               <div className="p-6 flex gap-3">
                 <button 
                   onClick={() => setEventToDelete(null)}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                 >
                   Hủy Bỏ
                 </button>
                 <button 
                   onClick={confirmDelete}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md"
                 >
                   Xác Nhận Xóa
                 </button>
               </div>
             </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {isRecurringModalOpen && canEdit && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setIsRecurringModalOpen(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/50">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    {selectedRecurring ? 'Sửa Công Việc Định Kỳ' : 'Thêm Công Việc Định Kỳ'}
                  </h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 dark:bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">
                    Lặp lại định kỳ
                  </span>
                </div>
                
                <form onSubmit={handleSaveRecurring} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tiêu đề công việc</label>
                    <input 
                      type="text" 
                      value={recurringForm.title}
                      onChange={e => setRecurringForm({...recurringForm, title: e.target.value})}
                      placeholder="Ví dụ: Ngày thế giới phòng chống bệnh không lây nhiễm..."
                      autoFocus
                      required
                      className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                  </div>

                  {/* Chu kỳ lặp - Tách biệt hằng năm và hằng tháng rực rỡ */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Chu kỳ lặp lại</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setRecurringForm({...recurringForm, type: 'yearly'})}
                        className={cn(
                          "py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                          recurringForm.type === 'yearly'
                            ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-md"
                            : "text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                        )}
                      >
                        <CalendarIcon className="w-4 h-4" /> 🗓️ Hằng Năm
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecurringForm({...recurringForm, type: 'monthly'})}
                        className={cn(
                          "py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                          recurringForm.type === 'monthly'
                            ? "bg-white dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-md"
                            : "text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
                        )}
                      >
                        <Clock className="w-4 h-4" /> 🔄 Hằng Tháng
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Độ quan trọng</label>
                    <select 
                      value={recurringForm.importance}
                      onChange={e => setRecurringForm({...recurringForm, importance: e.target.value as any})}
                      className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    >
                      <option value="high">🔥 Quan trọng cao</option>
                      <option value="medium">⚡ Trung bình</option>
                      <option value="low">🌱 Thấp</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Trạng thái mặc định</label>
                    <select 
                      value={recurringForm.status}
                      onChange={e => setRecurringForm({...recurringForm, status: e.target.value as any})}
                      className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none"
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="processing">Đang xử lý</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="not_completed">Không hoàn thành</option>
                      <option value="overdue">Trễ hạn</option>
                    </select>
                  </div>

                  {/* Chi tiết về thời gian - Tách biệt rõ rệt */}
                  {recurringForm.type === 'yearly' ? (
                    <div className="border border-amber-500/10 bg-amber-500/5 p-4 rounded-2xl space-y-3">
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <span>📅</span> Cấu hình ngày/tháng hằng năm
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chọn ngày cố định</label>
                          <select 
                            value={recurringForm.day}
                            onChange={e => setRecurringForm({...recurringForm, day: Number(e.target.value)})}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                              <option key={d} value={d}>Ngày {d}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chọn tháng cố định</label>
                          <select 
                            value={recurringForm.month}
                            onChange={e => setRecurringForm({...recurringForm, month: Number(e.target.value)})}
                            className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>Tháng {m}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                        Công việc diễn ra đúng vào ngày <strong className="text-amber-600 dark:text-amber-400">{recurringForm.day} tháng {recurringForm.month}</strong> của tất cả các năm tiếp theo.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-teal-500/10 bg-teal-500/5 p-4 rounded-2xl space-y-3">
                      <div className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                        <span>🔄</span> Cấu hình ngày hằng tháng
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chọn ngày cố định hằng tháng</label>
                        <select 
                          value={recurringForm.day}
                          onChange={e => setRecurringForm({...recurringForm, day: Number(e.target.value)})}
                          className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>Ngày {d} hằng tháng</option>
                          ))}
                        </select>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                        Công việc sẽ diễn ra vào ngày <strong className="text-teal-600 dark:text-teal-400">{recurringForm.day}</strong> của tất cả các tháng suốt cả năm.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                    <textarea 
                      value={recurringForm.description}
                      onChange={e => setRecurringForm({...recurringForm, description: e.target.value})}
                      placeholder="Mô tả chi tiết..."
                      rows={3}
                      className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white resize-none"
                    />
                  </div>

                  <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button 
                      type="button" 
                      onClick={() => setIsRecurringModalOpen(false)}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      type="submit"
                      disabled={!recurringForm.title.trim()}
                      className="flex-[2] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      Lưu cấu hình
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {recurringToDelete && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setRecurringToDelete(null); }}
            >
               <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col"
              onClick={e => e.stopPropagation()}
             >
               <div className="p-6 pb-2">
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                   <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Xóa Lịch Định Kỳ</h2>
                 <p className="text-slate-500 dark:text-zinc-400 text-sm text-center mt-2">
                   Bạn có chắc chắn muốn xóa cấu hình công việc định kỳ này không? Việc hiển thị trên lịch sẽ dừng lại ngay lập tức.
                 </p>
               </div>
               <div className="p-6 flex gap-3">
                 <button 
                   onClick={() => setRecurringToDelete(null)}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                 >
                   Hủy Bỏ
                 </button>
                 <button 
                   onClick={confirmDeleteRecurring}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md"
                 >
                   Xác Nhận Xóa
                 </button>
               </div>
             </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

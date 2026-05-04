import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Server,
  Loader2,
  Trash2,
  Code,
  Copy,
  Database,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useConfirmStore } from '../store/confirmStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toSafeDate } from '../lib/utils';

const CURR_HOST = window.location.host;

interface DnsRequest {
  id: string;
  userId: string;
  userEmail: string;
  subdomain: string;
  domain?: string;
  type: 'A' | 'CNAME' | 'TXT' | 'NS' | 'AAAA';
  value: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: Timestamp | null;
}

interface RecordInput {
  subdomain: string;
  domain: string;
  type: 'A' | 'CNAME' | 'TXT' | 'NS' | 'AAAA';
  value: string;
}

interface SupportedDomain {
  id: string;
  domain: string;
}

import { useAppStore } from '../store/appStore';

import { OfflineGuard } from '../components/OfflineGuard';

export default function DnsRequestPage() {
  const { user } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  
  const [requests, setRequests] = useState<DnsRequest[]>([]);
  const [supportedDomains, setSupportedDomains] = useState<SupportedDomain[]>([]);
  const [forbiddenList, setForbiddenList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [records, setRecords] = useState<RecordInput[]>([
    { subdomain: '', domain: CURR_HOST, type: 'CNAME', value: '' }
  ]);

  useEffect(() => {
    const q = query(collection(db, 'supported_domains'), orderBy('domain', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const domains = snapshot.docs.map(doc => ({
        id: doc.id,
        domain: doc.data().domain
      })) as SupportedDomain[];
      setSupportedDomains(domains);
      if (domains.length > 0) {
        setRecords(prev => prev.map(r => ({ ...r, domain: r.domain || domains[0].domain })));
      }
    });

    const unsubForbidden = onSnapshot(collection(db, 'forbidden_subdomains'), (snapshot) => {
      setForbiddenList(snapshot.docs.map(doc => doc.data().subdomain.toLowerCase()));
    });

    return () => {
      unsubscribe();
      unsubForbidden();
    };
  }, []);



  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'dnsRequests'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DnsRequest[];
      
      // Sort on client side to avoid composite index requirement
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setRequests(docs);
      setFetching(false);
      setError(null);
    }, (err: any) => {
      setFetching(false);
      setError('Có lỗi xảy ra khi tải dữ liệu.');
      handleFirestoreError(err, OperationType.GET, 'dnsRequests');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddRecordLine = () => {
    const defaultDomain = supportedDomains.length > 0 ? supportedDomains[0].domain : CURR_HOST;
    setRecords([...records, { subdomain: '', domain: defaultDomain, type: 'A', value: '' }]);
  };

  const handleRemoveRecordLine = (index: number) => {
    if (records.length === 1) return;
    const newRecords = [...records];
    newRecords.splice(index, 1);
    setRecords(newRecords);
  };

  const handleRecordChange = (index: number, field: keyof RecordInput, val: string) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: val };
    setRecords(newRecords);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Check total limit (max 3 records)
    const activeRequests = requests.filter(r => r.status !== 'rejected');
    if (activeRequests.length + records.length > 3) {
      toast.error(`Bạn chỉ được phép sở hữu tối đa 3 bản ghi DNS. Hiện bạn đã có ${activeRequests.length} bản ghi.`);
      return;
    }
    
    // Validate and check for duplicates/bad slugs
    for (const rec of records) {
      const sub = rec.subdomain.toLowerCase().trim();
      if (!sub || !rec.value) {
        toast.error('Vui lòng điền đầy đủ Tên Subdomain và Giá trị cho tất cả các dòng.');
        return;
      }
      const cleanSub = sub.replace(/[^a-z0-9-.]/g, '');
      if (cleanSub !== sub) {
        toast.error(`Subdomain "${sub}" không hợp lệ, chỉ bao gồm chữ cái, số, dấu gạch ngang và dấu chấm.`);
        return;
      }
      if (forbiddenList.includes(cleanSub)) {
        toast.error(`Tiền tố "${cleanSub}" này bị cấm sử dụng!`);
        return;
      }

      // Local uniqueness check (within the same request batch)
      const isDuplicateInBatch = records.filter(r => r.subdomain.toLowerCase() === sub && r.domain === rec.domain).length > 1;
      if (isDuplicateInBatch) {
        toast.error(`Bạn không thể gửi trùng lặp "${sub}.${rec.domain}" trong cùng một lúc.`);
        return;
      }

      // Check global uniqueness
      try {
        const qUnique = query(
          collection(db, 'dnsRequests'),
          where('subdomain', '==', sub),
          where('domain', '==', rec.domain)
        );
        const uniqueSnap = await getDocs(qUnique);
        if (!uniqueSnap.empty) {
          toast.error(`Subdomain "${sub}.${rec.domain}" đã tồn tại trên hệ thống.`);
          return;
        }

        // Also check if matches any approved subdomain in subdomainRequests to avoid overlaps
        const qSubdomain = query(
          collection(db, 'subdomainRequests'),
          where('subdomain', '==', sub),
          where('domain', '==', rec.domain)
        );
        const subSnap = await getDocs(qSubdomain);
        if (!subSnap.empty) {
          toast.error(`Subdomain "${sub}.${rec.domain}" đã được sử dụng cho trang cá nhân.`);
          return;
        }
      } catch (err) {
        console.error('Uniqueness check error:', err);
      }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const rec of records) {
        const sub = rec.subdomain.toLowerCase().replace(/[^a-z0-9-.]/g, '');
        
        const newRef = doc(collection(db, 'dnsRequests'));
        batch.set(newRef, {
          userId: user.uid,
          userEmail: user.email,
          subdomain: sub,
          domain: rec.domain,
          type: rec.type,
          value: rec.value.trim(),
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();

      toast.success('Gửi yêu cầu DNS thành công!');
      const defaultDomain = supportedDomains.length > 0 ? supportedDomains[0].domain : CURR_HOST;
      setRecords([{ subdomain: '', domain: defaultDomain, type: 'CNAME', value: '' }]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'dnsRequests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa yêu cầu',
      message: 'Bạn có chắc chắn muốn xóa yêu cầu DNS này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'dnsRequests', id));
          toast.success('Đã xóa yêu cầu');
        } catch (err) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy: ' + text);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 space-y-16">
      <OfflineGuard message="Tính năng Quản lý DNS yêu cầu kết nối Internet để đồng bộ với máy chủ hạ tầng.">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-medium  tracking-normal w-fit border border-blue-500/10"
        >
          <Zap className="w-3.5 h-3.5" /> DNS Luồng cao
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl md:text-6xl font-medium text-slate-900 dark:text-white tracking-tight flex items-center gap-4  italic"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Server className="w-8 h-8" />
          </div>
          QUẢN TRỊ BẢN GHI DNS
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-slate-400 text-sm md:text-lg max-w-2xl font-medium leading-relaxed"
        >
          Hệ thống Anycast DNS siêu tốc, hỗ trợ cấu hình bản ghi đa dạng và cập nhật tức thì trên toàn cầu.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 bg-white dark:bg-black p-8 md:p-12 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-blue-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-medium text-slate-900 dark:text-white  tracking-tight">Khởi tạo bản ghi</h2>
              <p className="text-slate-400 text-xs font-bold mt-1">Cấu hình Subdomain mới trên hạ tầng Bmass HD.</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
              <span className="text-[11px] font-medium text-slate-400  tracking-normal">
                Đã dùng: <span className="text-blue-600">{requests.filter(r => r.status !== 'rejected').length}</span>/3
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {records.map((rec, idx) => (
                <div key={idx} className="p-8 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 relative group/row">
                  {records.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRecordLine(idx)}
                      className="absolute -right-3 -top-3 w-10 h-10 bg-white dark:bg-slate-900 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-10 shadow-lg border border-slate-100 dark:border-white/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Subdomain & Host</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-[2] min-w-0">
                          <input 
                            type="text" 
                            value={rec.subdomain}
                            onChange={(e) => handleRecordChange(idx, 'subdomain', e.target.value)}
                            placeholder="vd: app"
                            className="w-full px-5 py-5 text-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-300"
                            required
                          />
                        </div>
                        <div className="relative flex-1 min-w-[150px] shrink-0">
                          <select
                            value={rec.domain}
                            onChange={(e) => handleRecordChange(idx, 'domain', e.target.value)}
                            className="w-full pl-5 pr-10 py-4 h-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-medium text-xs  appearance-none cursor-pointer text-slate-900 dark:text-white text-ellipsis overflow-hidden"
                          >
                            <option value={CURR_HOST}>{CURR_HOST}</option>
                            {supportedDomains.map(d => (
                              d.domain !== CURR_HOST && <option key={d.id} value={d.domain}>{d.domain}</option>
                            ))}
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Loại Bản Ghi</label>
                      <div className="relative">
                        <select 
                          value={rec.type}
                          onChange={(e) => handleRecordChange(idx, 'type', e.target.value)}
                          className="w-full pl-5 pr-10 py-4 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-medium text-xs  appearance-none cursor-pointer text-slate-900 dark:text-white"
                        >
                          <option value="CNAME">CNAME (Alias)</option>
                          <option value="A">A (IPv4 Address)</option>
                          <option value="AAAA">AAAA (IPv6 Address)</option>
                          <option value="TXT">TXT (Text Record)</option>
                          <option value="NS">NS (Name Server)</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Giá trị đích (Content)</label>
                      <div className="relative">
                        <Database className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text" 
                          value={rec.value}
                          onChange={(e) => handleRecordChange(idx, 'value', e.target.value)}
                          placeholder="vd: connect.github.io hoặc 1.2.3.4"
                          className="w-full pl-12 pr-5 py-4 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-5 pt-6">
              <button 
                type="button"
                onClick={handleAddRecordLine}
                className="px-8 py-5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-2xl font-medium text-[11px] hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center gap-3 transition-all  tracking-normal"
              >
                <Plus className="w-5 h-5" />
                Thêm bản ghi
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-medium  tracking-[0.2em] text-[11px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Gửi yêu cầu cấu hình</>}
              </button>
            </div>
          </form>
        </motion.div>

        <div className="space-y-8">
            <div className="p-8 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl shadow-black/[0.02]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-500">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium mb-3  tracking-tight text-slate-900 dark:text-white italic">Tự động đồng bộ</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">Cập nhật DNS toàn cầu chỉ trong vài giây ngay sau khi yêu cầu được duyệt.</p>
            </div>

            <div className="p-8 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl shadow-black/[0.02]">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium mb-3  tracking-tight text-slate-900 dark:text-white italic">Bảo mật đám mây</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">Tích hợp sẵn lớp bảo mật ngăn chặn tấn công DDoS ở tầng DNS cho mọi bản ghi.</p>
            </div>
        </div>
      </div>

      {/* Connection Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-2xl shadow-black/[0.02]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h3 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight  italic">Danh sách Đã Đăng ký</h3>
            <p className="text-slate-400 text-sm font-bold mt-1">Theo dõi và quản lý các yêu cầu cấu hình DNS của bạn.</p>
          </div>
          <div className="flex gap-3">
             <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 text-center min-w-[120px]">
                <div className="text-2xl font-medium text-blue-600">{requests.filter(r => r.status === 'approved').length}</div>
                <div className="text-[9px] font-medium text-slate-400  tracking-normal mt-1">Đã duyệt</div>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 text-center min-w-[120px]">
                <div className="text-2xl font-medium text-amber-500">{requests.filter(r => r.status === 'pending').length}</div>
                <div className="text-[9px] font-medium text-slate-400  tracking-normal mt-1">Chờ duyệt</div>
             </div>
          </div>
        </div>
        
        {fetching ? (
          <div className="py-24 flex flex-col items-center justify-center">
             <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin mb-6" />
             <span className="text-[10px] font-medium text-slate-400  tracking-[0.3em]">Đang đồng bộ hạ tầng...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-8">
               <Database className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-medium  text-xs tracking-normal">Không có dữ liệu bản ghi</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-10 md:-mx-14 no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-white/5 border-y border-slate-100 dark:border-white/5 text-slate-500">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-medium  tracking-[0.2em]">Bản ghi & Ngày tạo</th>
                  <th className="px-10 py-6 text-[10px] font-medium  tracking-[0.2em]">Loại</th>
                  <th className="px-10 py-6 text-[10px] font-medium  tracking-[0.2em]">Giá trị đích</th>
                  <th className="px-10 py-6 text-[10px] font-medium  tracking-[0.2em]">Đường dẫn đích</th>
                  <th className="px-10 py-6 text-[10px] font-medium  tracking-[0.2em]">Trạng thái</th>
                  <th className="px-10 py-6 text-[10px] font-medium  tracking-[0.2em] text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-900 dark:text-white tracking-tight text-lg  group-hover:text-blue-600 transition-colors">
                          {req.subdomain}
                        </span>
                        <button onClick={() => copyToClipboard(req.subdomain)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-400 hover:text-blue-600 transition-all opacity-100">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold  tracking-normal mt-1.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {req.createdAt ? format(toSafeDate(req.createdAt.toMillis()), 'HH:mm - dd/MM/yyyy') : 'Đang xử lý...'}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="px-4 py-1.5 text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-500/20  tracking-tight">
                        {req.type}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/10 w-fit group/val">
                        <span className="text-slate-600 dark:text-slate-300 font-mono text-xs font-bold truncate max-w-[150px]">
                          {req.value}
                        </span>
                        <button onClick={() => copyToClipboard(req.value)} className="text-slate-300 hover:text-blue-600 transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-medium text-blue-600 dark:text-blue-400 tracking-tight lowercase truncate max-w-[200px] block">
                             {req.subdomain}.{req.domain || CURR_HOST}
                           </span>
                           <button onClick={() => copyToClipboard(`${req.subdomain}.${req.domain || CURR_HOST}`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all opacity-100 shrink-0">
                             <Copy className="w-3.5 h-3.5" />
                           </button>
                        </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-2">
                        {req.status === 'pending' && <span className="inline-flex w-fit items-center gap-2 px-4 py-1.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-600 border border-amber-100  tracking-normal"><Clock className="w-3.5 h-3.5" /> Chờ duyệt</span>}
                        {req.status === 'approved' && <span className="inline-flex w-fit items-center gap-2 px-4 py-1.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100  tracking-normal"><CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động</span>}
                        {req.status === 'rejected' && <span className="inline-flex w-fit items-center gap-2 px-4 py-1.5 text-[10px] font-medium rounded-full bg-red-50 text-red-600 border border-red-100  tracking-normal"><XCircle className="w-3.5 h-3.5" /> Từ chối</span>}
                        
                        {req.status === 'approved' && (req as any).expiresAt && (
                          <div className="text-[10px] text-rose-500 font-bold  tracking-normal flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            Hết hạn: {new Date((req as any).expiresAt).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                        {req.adminNote && (
                          <div className="mt-1 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 text-[10px] text-slate-500 font-bold max-w-[200px] leading-relaxed">
                            <span className="text-blue-600 block mb-1  tracking-tight">Note:</span>
                            "{req.adminNote}"
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button 
                        onClick={() => handleDelete(req.id)}
                        className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all opacity-100"
                        title="Xóa yêu cầu"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
     </OfflineGuard>
    </div>
  );
}

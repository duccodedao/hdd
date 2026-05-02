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
  Copy
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
  writeBatch
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
  type: 'A' | 'CNAME' | 'TXT' | 'NS' | 'AAAA';
  value: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: Timestamp | null;
}

interface RecordInput {
  subdomain: string;
  type: 'A' | 'CNAME' | 'TXT' | 'NS' | 'AAAA';
  value: string;
}

import { useAppStore } from '../store/appStore';

export default function DnsRequestPage() {
  const { user } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const { domainExpiryDate } = useAppStore();
  
  const [requests, setRequests] = useState<DnsRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [records, setRecords] = useState<RecordInput[]>([
    { subdomain: '', type: 'CNAME', value: '' }
  ]);

  const calculateDaysLeft = () => {
    if (!domainExpiryDate) return null;
    const expiry = new Date(domainExpiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysLeft = calculateDaysLeft();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'dnsRequests'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DnsRequest[];
      setRequests(docs);
      setFetching(false);
      setError(null);
    }, (err: any) => {
      setFetching(false);
      if (err.code === 'failed-precondition') {
        setError('Hệ thống đang tải dữ liệu. Vui lòng quay lại sau vài phút.');
      } else {
        setError('Có lỗi xảy ra khi tải dữ liệu.');
        handleFirestoreError(err, OperationType.GET, 'dnsRequests');
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddRecordLine = () => {
    setRecords([...records, { subdomain: '', type: 'A', value: '' }]);
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
    
    // Validate
    for (const rec of records) {
      if (!rec.subdomain || !rec.value) {
        toast.error('Vui lòng điền đầy đủ Tên Subdomain và Giá trị cho tất cả các dòng.');
        return;
      }
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      records.forEach(rec => {
        const newRef = doc(collection(db, 'dnsRequests'));
        batch.set(newRef, {
          userId: user.uid,
          userEmail: user.email,
          subdomain: rec.subdomain.toLowerCase().replace(/[^a-z0-9-.]/g, ''),
          type: rec.type,
          value: rec.value.trim(),
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();

      toast.success('Gửi yêu cầu DNS thành công!');
      setRecords([{ subdomain: '', type: 'CNAME', value: '' }]);
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
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
      <div className="mb-12 md:mb-16">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3"
        >
          <Server className="w-8 h-8 md:w-12 md:h-12 text-blue-600" />
          Cấp Subdomain DNS Miễn Phí
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-slate-400 text-sm md:text-xl max-w-2xl font-medium leading-relaxed"
        >
          Tạo và quản lý bản ghi DNS cho subdomain của riêng bạn. Hỗ trợ A, CNAME, TXT, thêm hàng loạt bản ghi dễ dàng.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 glass-card p-6 md:p-10 rounded-[2.5rem] border-slate-200 dark:border-white/10 relative overflow-hidden shadow-2xl shadow-blue-500/5"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Đăng ký bản ghi mới</h2>
          <p className="text-slate-500 text-sm mb-8 font-bold">Thỏa sức tạo subdomain không giới hạn trên hệ sinh thái.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {records.map((rec, idx) => (
                <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 relative">
                  {records.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRecordLine(idx)}
                      className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-10 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tên Subdomain</label>
                      <input 
                        type="text" 
                        value={rec.subdomain}
                        onChange={(e) => handleRecordChange(idx, 'subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''))}
                        placeholder="test"
                        className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white text-sm"
                        required
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Loại</label>
                      <select 
                        value={rec.type}
                        onChange={(e) => handleRecordChange(idx, 'type', e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-blue-600 outline-none transition-all font-black text-xs uppercase"
                      >
                        <option value="CNAME">CNAME</option>
                        <option value="A">A</option>
                        <option value="TXT">TXT</option>
                        <option value="NS">NS</option>
                        <option value="AAAA">AAAA</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Giá trị (Target)</label>
                      <input 
                        type="text" 
                        value={rec.value}
                        onChange={(e) => handleRecordChange(idx, 'value', e.target.value)}
                        placeholder="target.domain.com"
                        className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-blue-600 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                type="button"
                onClick={handleAddRecordLine}
                className="px-6 py-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                Thêm bản ghi
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Gửi yêu cầu</>}
              </button>
            </div>
          </form>
        </motion.div>

        <div className="hidden xl:flex flex-col gap-6">
            {daysLeft !== null && daysLeft > 0 && (
              <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-[2rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  <Clock className="w-8 h-8 text-rose-500 mb-4" />
                  <h3 className="text-lg font-black mb-2 uppercase tracking-tighter text-rose-600 dark:text-rose-400">Thời hạn sử dụng</h3>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-4xl font-black text-rose-600 dark:text-rose-400">{daysLeft}</span>
                    <span className="text-sm font-bold text-rose-700/80 dark:text-rose-400/80 uppercase tracking-widest leading-tight">Ngày<br/>Còn lại</span>
                  </div>
                  <p className="text-rose-700/70 dark:text-rose-400/70 text-xs font-medium mt-4 leading-relaxed line-clamp-3">
                    Subdomain của bạn sẽ có thể sử dụng được trong vòng {daysLeft} ngày tới kể từ hôm nay theo quy định của hệ thống.
                  </p>
              </div>
            )}
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem]">
                <Zap className="w-8 h-8 text-emerald-500 mb-4" />
                <h3 className="text-lg font-black mb-2 uppercase tracking-tighter text-emerald-600 dark:text-emerald-400">Kích hoạt tức thì</h3>
                <p className="text-emerald-700/80 dark:text-emerald-400/80 text-sm font-medium leading-relaxed">Sau khi Admin phê duyệt, bản ghi DNS của bạn sẽ được cập nhật ngay lập tức trên hệ thống DNS Box.</p>
            </div>
            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem]">
                <ShieldCheck className="w-8 h-8 text-blue-500 mb-4" />
                <h3 className="text-lg font-black mb-2 uppercase tracking-tighter text-blue-600 dark:text-blue-400">Bảo mật & Ổn định</h3>
                <p className="text-blue-700/80 dark:text-blue-400/80 text-sm font-medium leading-relaxed">Hệ thống DNS phân tán, ngăn chặn hiệu quả các cuộc tấn công DDoS bảo vệ tên miền.</p>
            </div>
        </div>
      </div>

      {/* Lịch sử yêu cầu */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm overflow-hidden"
      >
        <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white px-2">Quản lý DNS Subdomain</h3>
        
        {fetching ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : error && requests.length === 0 ? (
          <div className="py-8 text-center text-amber-500 bg-amber-500/10 rounded-2xl mx-2 font-medium">{error}</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">Bạn chưa đăng ký bản ghi DNS nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Subdomain (Tên)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Loại</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Giá trị</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Domain Gốc</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Trạng thái</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{req.subdomain}</span>
                        <button onClick={() => copyToClipboard(req.subdomain)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {req.createdAt ? format(toSafeDate(req.createdAt.toMillis()), 'HH:mm dd/MM/yyyy') : 'Đang xử lý...'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-md uppercase">
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-mono truncate max-w-[200px]" title={req.value}>
                          {req.value}
                        </span>
                        <button onClick={() => copyToClipboard(req.value)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Copy">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-500">{CURR_HOST}</span>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-wider"><Clock className="w-3 h-3" /> Đang chờ</span>}
                      {req.status === 'approved' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 uppercase tracking-wider"><CheckCircle2 className="w-3 h-3" /> Đã duyệt</span>}
                      {req.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Từ chối</span>}
                      
                      {req.adminNote && (
                        <div className="text-[10px] text-slate-500 mt-2 bg-slate-100 dark:bg-white/5 p-2 rounded-lg italic">
                          " {req.adminNote} "
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(req.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        title="Xóa yêu cầu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

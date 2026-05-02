import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Server, 
  Check, 
  X, 
  Trash2, 
  Clock, 
  Mail, 
  Loader2, 
  Search,
  Zap,
  Globe,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';

interface DnsRequest {
  id: string;
  userId: string;
  userEmail: string;
  subdomain: string;
  type: string;
  value: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: Timestamp;
}

const CURR_HOST = window.location.host;

export default function AdminDnsRequests() {
  const [requests, setRequests] = useState<DnsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { openConfirm } = useConfirmStore();

  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; requestId: string; status: 'approved' | 'rejected'; note: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'dnsRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DnsRequest[];
      setRequests(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openStatusModal = (id: string, status: 'approved' | 'rejected') => {
    setResponseModal({ isOpen: true, requestId: id, status, note: '' });
  };

  const confirmUpdateStatus = async () => {
    if (!responseModal) return;
    try {
      await updateDoc(doc(db, 'dnsRequests', responseModal.requestId), {
        status: responseModal.status,
        adminNote: responseModal.note.trim(),
        updatedAt: serverTimestamp()
      });
      toast.success(`Đã ${responseModal.status === 'approved' ? 'phê duyệt' : 'từ chối'} yêu cầu DNS`);
      setResponseModal(null);
    } catch (error) {
      toast.error('Lỗi khi cập nhật');
    }
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa bản ghi',
      message: 'Bạn có chắc chắn muốn xóa bản ghi DNS này?',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'dnsRequests', id));
          toast.success('Đã xóa bản ghi');
        } catch (error) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const filteredRequests = requests.filter(req => {
    const matchesFilter = filter === 'all' || req.status === filter;
    const matchesSearch = 
      req.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.value.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex bg-indigo-600/5 border border-indigo-600/10 p-4 rounded-2xl items-center gap-4 mb-4">
        <Server className="w-6 h-6 text-indigo-600" />
        <p className="text-xs font-bold text-slate-500">Hệ thống quản lý bản ghi DNS Subdomain. Không giới hạn số lượng yêu cầu.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 w-full lg:w-auto overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Đang chờ' : f === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm theo subdomain, target, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold outline-none ring-indigo-500/20 focus:ring-4 transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Subdomain</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Loại</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Giá trị</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Domain</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Người yêu cầu</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Trạng thái</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 font-bold italic text-sm">Không tìm thấy yêu cầu DNS nào</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-6 font-medium">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{req.subdomain}</span>
                        <p className="text-[9px] text-slate-400 font-bold mt-1">{format(toSafeDate(req.createdAt), 'HH:mm - dd/MM/yyyy')}</p>
                    </td>
                    <td className="px-6 py-6">
                       <span className="px-2 py-1 bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[10px] font-black rounded uppercase tracking-tighter border border-indigo-600/20">{req.type}</span>
                    </td>
                    <td className="px-6 py-6">
                       <div className="max-w-[200px] truncate text-[10px] font-black text-slate-600 dark:text-slate-300">
                          {req.value}
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <span className="text-[10px] font-bold text-slate-500">{CURR_HOST}</span>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                        <Mail className="w-3 h-3 opacity-50" /> {req.userEmail}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        {req.status}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right space-x-2">
                       {req.status === 'pending' ? (
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => openStatusModal(req.id, 'approved')}
                             className="p-2.5 bg-emerald-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                             title="Phê duyệt"
                           >
                             <Check className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => openStatusModal(req.id, 'rejected')}
                             className="p-2.5 bg-red-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                             title="Từ chối"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDelete(req.id)}
                              className="p-2.5 bg-slate-100 dark:bg-white/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                              title="Xóa vĩnh viễn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Modal */}
      <AnimatePresence>
        {responseModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setResponseModal(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  responseModal.status === 'approved' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {responseModal.status === 'approved' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                </div>
                <button
                  onClick={() => setResponseModal(null)}
                  className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
                {responseModal.status === 'approved' ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
              </h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Nhập thông điệp phản hồi để người dùng biết trạng thái của họ.</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nội dung phản hồi</label>
                  <textarea 
                    rows={4}
                    value={responseModal.note}
                    onChange={(e) => setResponseModal({...responseModal, note: e.target.value})}
                    placeholder="Ví dụ: Bản ghi đã được cấu hình thành công..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 outline-none transition-all text-sm text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={() => setResponseModal(null)}
                  className="px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmUpdateStatus}
                  className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] text-white shadow-xl transition-all ${
                    responseModal.status === 'approved' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                      : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  }`}
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

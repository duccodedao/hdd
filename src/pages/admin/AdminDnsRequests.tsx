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
  Timestamp,
  addDoc
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
  ShieldCheck,
  Plus,
  Copy
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
  domain: string;
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
  const [supportedDomains, setSupportedDomains] = useState<{id: string, domain: string, expiresAt?: string}[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newDomainExpiry, setNewDomainExpiry] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  
  const { openConfirm } = useConfirmStore();

  const [responseModal, setResponseModal] = useState<{ isOpen: boolean; requestId: string; status: 'approved' | 'rejected'; note: string; expiresAt?: string } | null>(null);

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

    const domainsUnsubscribe = onSnapshot(collection(db, 'supported_domains'), (snapshot) => {
      setSupportedDomains(snapshot.docs.map(doc => ({ id: doc.id, domain: doc.data().domain, expiresAt: doc.data().expiresAt })));
    });

    return () => {
      unsubscribe();
      domainsUnsubscribe();
    };
  }, []);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return toast.error('Vui lòng nhập tên domain');
    try {
      const data: any = {
        domain: newDomain.trim(),
        createdAt: serverTimestamp()
      };
      if (newDomainExpiry) {
        data.expiresAt = newDomainExpiry;
      }
      await addDoc(collection(db, 'supported_domains'), data);
      setNewDomain('');
      setNewDomainExpiry('');
      setIsAddingDomain(false);
      toast.success('Đã thêm domain hệ thống');
    } catch (error) {
      toast.error('Lỗi khi thêm domain');
    }
  };

  const deleteSupportedDomain = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'supported_domains', id));
      toast.success('Đã xóa domain');
    } catch (error) {
      toast.error('Lỗi khi xóa');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép!');
  };

  const openStatusModal = (id: string, status: 'approved' | 'rejected') => {
    let expiresAt = undefined;
    if (status === 'approved') {
      const request = requests.find(r => r.id === id);
      const domainInfo = supportedDomains.find(d => d.domain === request?.domain);
      
      if (domainInfo?.expiresAt) {
        expiresAt = domainInfo.expiresAt;
      } else {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        expiresAt = nextYear.toISOString().split('T')[0];
      }
    }
    setResponseModal({ isOpen: true, requestId: id, status, note: '', expiresAt });
  };

  const confirmUpdateStatus = async () => {
    if (!responseModal) return;
    try {
      const request = requests.find(r => r.id === responseModal.requestId);
      const updateData: any = {
        status: responseModal.status,
        adminNote: responseModal.note.trim(),
        updatedAt: serverTimestamp()
      };
      if (responseModal.status === 'approved' && responseModal.expiresAt) {
        updateData.expiresAt = responseModal.expiresAt;
      }

      await updateDoc(doc(db, 'dnsRequests', responseModal.requestId), updateData);

      // Send notification
      if (request) {
        await addDoc(collection(db, 'notifications'), {
          title: `Yêu cầu DNS: ${responseModal.status === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối'}`,
          content: `Yêu cầu cho subdomain ${request.subdomain} của bạn đã được ${responseModal.status === 'approved' ? 'phê duyệt' : 'từ chối'}. ${responseModal.note ? `Lưu ý: ${responseModal.note}` : ''}`,
          targetUserId: request.userId,
          createdAt: Date.now(),
          readBy: []
        });
      }

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
              className={`px-6 py-2.5 rounded-xl text-[10px] font-medium  tracking-normal transition-all whitespace-nowrap ${
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5">
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Host</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Loại</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Giá trị đích</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Domain Gốc</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Domain Cuối</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Trạng thái</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <span className="text-[10px] font-medium text-slate-400  tracking-normal">Đang tải dữ liệu...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 font-bold italic text-sm">Không tìm thấy yêu cầu DNS nào</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-medium text-slate-900 dark:text-white ">{req.subdomain}</span>
                           <button onClick={() => copyToClipboard(req.subdomain)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400">
                             <Copy className="w-3 h-3" />
                           </button>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 max-w-[120px] truncate" title={req.userEmail}>{req.userEmail}</p>
                    </td>
                    <td className="px-6 py-6">
                       <span className="px-2 py-1 bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[10px] font-medium rounded  tracking-tight border border-indigo-600/20">{req.type}</span>
                    </td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          <span className="max-w-[150px] truncate">{req.value}</span>
                          <button onClick={() => copyToClipboard(req.value)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400">
                             <Copy className="w-3 h-3" />
                          </button>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <span className="text-[10px] font-bold text-slate-500">{req.domain || CURR_HOST}</span>
                    </td>
                    <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 tracking-tight">
                             {req.subdomain}.{req.domain || CURR_HOST}
                           </span>
                           <button onClick={() => copyToClipboard(`${req.subdomain}.${req.domain || CURR_HOST}`)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400">
                             <Copy className="w-3 h-3" />
                           </button>
                        </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className={`inline-flex flex-col gap-1.5 px-3 py-1.5 rounded-xl border ${
                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-1.5 text-[9px] font-medium  tracking-normal">
                          {req.status === 'pending' ? 'Đang chờ' : req.status === 'approved' ? 'Hoạt động' : 'Từ chối'}
                        </div>
                        {req.status === 'approved' && (req as any).expiresAt && (
                          <div className="text-[10px] whitespace-nowrap font-bold opacity-80 border-t border-emerald-500/20 pt-1 mt-0.5">
                            HSD: {format(new Date((req as any).expiresAt), 'dd/MM/yyyy')}
                          </div>
                        )}
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
                         <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
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
        {isAddingDomain && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingDomain(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-8 max-w-md w-full relative z-10 shadow-2xl">
                <h3 className="text-xl font-medium mb-4  tracking-tight">Thêm Domain Hệ Thống</h3>
                <input 
                  type="text" 
                  value={newDomain} 
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="Ví dụ: bmassHD.io.vn"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 font-bold outline-none"
                />
                <label className="text-[10px] font-medium  text-slate-500 mb-1 block ml-1">Ngày hết hạn (Tuỳ chọn)</label>
                <input 
                  type="date" 
                  value={newDomainExpiry} 
                  onChange={(e) => setNewDomainExpiry(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 font-bold outline-none"
                />
                <div className="flex justify-end gap-3">
                   <button onClick={() => setIsAddingDomain(false)} className="px-4 py-2 font-bold text-slate-400">Hủy</button>
                   <button onClick={handleAddDomain} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Thêm ngay</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-medium  tracking-tight">Domains hỗ trợ</h3>
           <button onClick={() => setIsAddingDomain(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs  tracking-normal transition-transform hover:scale-105">
             <Plus className="w-4 h-4" /> Thêm domain
           </button>
        </div>
        <div className="flex flex-wrap gap-3">
           {supportedDomains.length === 0 ? (
             <p className="text-xs font-bold text-slate-400 italic">Chưa có domain nào được thiết lập. Hãy thêm domain để người dùng lựa chọn.</p>
           ) : (
             supportedDomains.map(d => (
               <div key={d.id} className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                 <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{d.domain}</span>
                    <button onClick={() => deleteSupportedDomain(d.id)} className="p-1 hover:text-red-500 text-slate-400 transition-colors ml-4">
                       <Trash2 className="w-3.5 h-3.5" />
                    </button>
                 </div>
                 {d.expiresAt && (
                   <div className="px-4 py-1.5 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800  tracking-normal text-center">
                     HSD: {format(new Date(d.expiresAt), 'dd/MM/yyyy')}
                   </div>
                 )}
               </div>
             ))
           )}
        </div>
      </div>
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative z-10"
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

              <h2 className="text-xl font-medium text-slate-900 dark:text-white mb-2  tracking-tight">
                {responseModal.status === 'approved' ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
              </h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Nhập thông điệp phản hồi để người dùng biết trạng thái của họ.</p>

              <div className="space-y-4">
                {responseModal.status === 'approved' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium  tracking-normal text-slate-500 ml-1">Ngày hết hạn bản ghi</label>
                    <input 
                        type="date" 
                        value={responseModal.expiresAt || ''}
                        onChange={e => setResponseModal({...responseModal, expiresAt: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white appearance-none"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-medium  tracking-normal text-slate-500 ml-1">Nội dung phản hồi</label>
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
                  className="px-5 py-3 rounded-xl font-bold  tracking-normal text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmUpdateStatus}
                  className={`px-8 py-3 rounded-xl font-bold  tracking-normal text-[10px] text-white shadow-xl transition-all ${
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

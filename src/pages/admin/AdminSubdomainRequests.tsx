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
  Globe, 
  Check, 
  X, 
  Trash2, 
  Clock, 
  User, 
  Mail, 
  MessageCircle,
  ExternalLink,
  Loader2,
  Search,
  ChevronRight,
  Code,
  ShieldCheck,
  Zap,
  Key,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';

interface SubdomainRequest {
  id: string;
  userId: string;
  userEmail: string;
  displayName: string;
  subdomain: string;
  domain: string;
  githubRepo?: string;
  adminUsername?: string;
  adminPassword?: string;
  apiKey?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: Timestamp;
}

const CURR_HOST = window.location.host;

export default function AdminSubdomainRequests() {
  const [requests, setRequests] = useState<SubdomainRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportedDomains, setSupportedDomains] = useState<{id: string, domain: string, expiresAt?: string}[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvingReq, setApprovingReq] = useState<SubdomainRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    username: '',
    password: '',
    apiKey: '',
    note: '',
    expiresAt: ''
  });
  
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    const q = query(collection(db, 'subdomainRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubdomainRequest[];
      setRequests(docs);
      setLoading(false);
    });

    const domainsUnsubscribe = onSnapshot(collection(db, 'supported_domains'), (snapshot) => {
      setSupportedDomains(snapshot.docs.map(doc => ({ id: doc.id, domain: doc.data().domain, expiresAt: doc.data().expiresAt })));
    });

    return () => {
      unsubscribe();
      domainsUnsubscribe();
    }
  }, []);

  const openApproveModal = (req: SubdomainRequest) => {
    let defaultExpiry = '';
    const domainInfo = supportedDomains.find(d => d.domain === req.domain);
    if (domainInfo?.expiresAt) {
      defaultExpiry = domainInfo.expiresAt;
    } else {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      defaultExpiry = nextYear.toISOString().split('T')[0];
    }

    // Auto generate unique API Key
    const randomKey = 'API-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    setApprovingReq(req);
    setApprovalForm({
      username: req.userEmail.split('@')[0],
      password: Math.random().toString(36).slice(-8) + '@',
      apiKey: randomKey,
      note: '',
      expiresAt: defaultExpiry
    });
  };

  const handleApprove = async () => {
    if (!approvingReq) return;
    if (!approvalForm.username || !approvalForm.password) {
      toast.error('Vui lòng điền đủ Username và Password');
      return;
    }

    try {
      await updateDoc(doc(db, 'subdomainRequests', approvingReq.id), {
        status: 'approved',
        adminUsername: approvalForm.username,
        adminPassword: approvalForm.password,
        apiKey: approvalForm.apiKey,
        adminNote: approvalForm.note,
        expiresAt: approvalForm.expiresAt || null,
        updatedAt: serverTimestamp()
      });

      // Send push notification via notifications collection
      await addDoc(collection(db, 'notifications'), {
        userId: approvingReq.userId,
        title: 'Yêu cầu tên miền đã được phê duyệt! 🎉',
        message: `Tên miền /${approvingReq.subdomain} của bạn đã sẵn sàng sử dụng.`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp(),
        link: '/domains'
      });

      toast.success('Đã phê duyệt và cấp quyền');
      setApprovingReq(null);
    } catch (error) {
      toast.error('Lỗi khi phê duyệt');
    }
  };

  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; requestId: string; note: string } | null>(null);

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await updateDoc(doc(db, 'subdomainRequests', rejectModal.requestId), {
        status: 'rejected',
        adminNote: rejectModal.note,
        updatedAt: serverTimestamp()
      });

      // Get user ID from requests list
      const req = requests.find(r => r.id === rejectModal.requestId);
      if (req) {
        await addDoc(collection(db, 'notifications'), {
          userId: req.userId,
          title: 'Yêu cầu tên miền bị từ chối',
          message: `Lý do: ${rejectModal.note || 'Không có lý do cụ thể.'}`,
          type: 'security',
          read: false,
          timestamp: serverTimestamp(),
          link: '/domains'
        });
      }

      toast.success('Đã từ chối yêu cầu');
      setRejectModal(null);
    } catch (error) {
      toast.error('Lỗi khi thực hiện');
    }
  };

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa yêu cầu',
      message: 'Xóa yêu cầu này sẽ xóa luôn cấu hình site liên quan. Tiếp tục?',
      confirmText: 'Xóa ngay',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          const req = requests.find(r => r.id === id);
          await deleteDoc(doc(db, 'subdomainRequests', id));
          if (req?.subdomain) {
            await deleteDoc(doc(db, 'siteConfigs', req.subdomain));
          }
          toast.success('Đã dọn dẹp dữ liệu');
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
      req.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex bg-blue-600/5 border border-blue-600/10 p-4 rounded-2xl items-center gap-4 mb-4">
        <Zap className="w-6 h-6 text-blue-600" />
        <p className="text-xs font-bold text-slate-500">Hệ thống quản lý định danh Slug Cá Nhân. Mỗi người dùng chỉ có 1 Slug duy nhất.</p>
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
                  ? 'bg-blue-600 text-white shadow-lg' 
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
            placeholder="Tìm theo slug, email, tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold outline-none ring-blue-500/20 focus:ring-4 transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5">
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Thông tin Slug</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Người yêu cầu</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5">Trạng thái</th>
                <th className="px-6 py-5 text-[10px] font-medium text-slate-500  tracking-normal border-b border-slate-100 dark:border-white/5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                      <span className="text-[10px] font-medium text-slate-400  tracking-normal">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                       <Database className="w-12 h-12 text-slate-300 mb-4" />
                       <p className="text-slate-400 font-bold italic text-sm">Hiện tại chưa có dữ liệu yêu cầu nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                            {req.domain || CURR_HOST}/p/{req.subdomain}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400">Personal Slug</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{req.displayName}</p>
                      <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" /> {req.userEmail}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <div className={`inline-flex flex-col gap-1.5 px-3 py-1.5 rounded-xl border ${
                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-1.5 text-[9px] font-medium  tracking-normal">
                          {req.status === 'pending' && <Clock className="w-3 h-3" />}
                          {req.status === 'approved' && <ShieldCheck className="w-3 h-3" />}
                          {req.status === 'rejected' && <X className="w-3 h-3" />}
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
                             onClick={() => openApproveModal(req)}
                             className="p-2.5 bg-emerald-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                             title="Phê duyệt"
                           >
                             <Check className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setRejectModal({ isOpen: true, requestId: req.id, note: '' })}
                             className="p-2.5 bg-red-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-red-500/20"
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

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setRejectModal(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-500/10 text-red-500 border border-red-500/20">
                  <X className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setRejectModal(null)}
                  className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-medium text-slate-900 dark:text-white mb-2  tracking-tight">
                Từ chối yêu cầu
              </h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Nhập thông điệp phản hồi để người dùng biết trạng thái của họ.</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-medium  tracking-normal text-slate-500 ml-1">Lý do từ chối</label>
                  <textarea 
                    rows={4}
                    value={rejectModal.note}
                    onChange={(e) => setRejectModal({...rejectModal, note: e.target.value})}
                    placeholder="Ví dụ: Tên đã được sử dụng hoặc vi phạm chính sách..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-red-600 outline-none transition-all text-sm text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={() => setRejectModal(null)}
                  className="px-5 py-3 rounded-xl font-bold  tracking-normal text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReject}
                  className="px-8 py-3 rounded-xl font-bold  tracking-normal text-[10px] text-white shadow-xl transition-all bg-red-600 hover:bg-red-700 shadow-red-600/20"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approval Modal */}
      <AnimatePresence>
        {approvingReq && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApprovingReq(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-10 border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-3xl font-medium text-slate-900 dark:text-white  tracking-tight">Phê duyệt Site</h2>
                   <p className="text-xs font-medium text-slate-400 mt-1  tracking-normal">Cấp quyền quản trị /{approvingReq.subdomain}</p>
                </div>
                <button onClick={() => setApprovingReq(null)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6">
                 <div className="p-4 bg-blue-600/5 border border-blue-600/10 rounded-2xl flex items-center gap-3">
                    <Database className="w-6 h-6 text-blue-600" />
                    <div>
                        <p className="text-[10px] font-medium text-slate-500  tracking-normal">Đang khởi tạo site cho:</p>
                        <p className="text-xs font-medium dark:text-white">{approvingReq.displayName} ({approvingReq.userEmail})</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium  text-slate-500 px-1">Tài khoản Quản trị</label>
                        <input 
                            type="text" 
                            value={approvalForm.username}
                            onChange={e => setApprovalForm({...approvalForm, username: e.target.value})}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all dark:text-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium  text-slate-500 px-1">Mật khẩu Quản trị</label>
                        <input 
                            type="text" 
                            value={approvalForm.password}
                            onChange={e => setApprovalForm({...approvalForm, password: e.target.value})}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all dark:text-white"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium  text-slate-500 px-1 flex items-center justify-between">
                            API Key (Tự động)
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        </label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                            <input 
                                type="text" 
                                readOnly
                                value={approvalForm.apiKey}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-medium text-blue-600 outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium  text-slate-500 px-1">Ngày Hết Hạn</label>
                        <input 
                            type="date" 
                            value={approvalForm.expiresAt}
                            onChange={e => setApprovalForm({...approvalForm, expiresAt: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[12px] font-bold outline-none focus:border-blue-600 appearance-none dark:text-white"
                        />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-medium  text-slate-500 px-1">Ghi chú (Nếu có)</label>
                    <textarea 
                        rows={3}
                        placeholder="Chào mừng bạn đến với hệ thống..."
                        value={approvalForm.note}
                        onChange={e => setApprovalForm({...approvalForm, note: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all dark:text-white resize-none"
                    />
                 </div>

                 <button 
                  onClick={handleApprove}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-xs shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    <Check className="w-5 h-5" /> Phê duyệt & Gửi thông báo
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Code,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs,
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { toSafeDate } from '../lib/utils';
import toast from 'react-hot-toast';
import { Copy, Trash2, Check, X } from 'lucide-react';

const CURR_HOST = window.location.host;

interface DomainRequest {
  id: string;
  subdomain: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'pending_deletion';
  adminNote?: string;
  githubRepo?: string;
  createdAt: Timestamp;
}

export default function DomainRequestPage() {
  const { user, userData } = useAuthStore();
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportedDomains, setSupportedDomains] = useState<{id: string, domain: string}[]>([]);
  const [forbiddenList, setForbiddenList] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'subdomainRequests'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DomainRequest[];
      
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
      if (err.code === 'failed-precondition') {
        setError('Hệ thống đang khởi tạo chỉ mục dữ liệu. Vui lòng quay lại sau vài phút.');
      } else {
        setError('Có lỗi xảy ra khi tải dữ liệu.');
        handleFirestoreError(err, OperationType.GET, 'subdomainRequests');
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'supported_domains'), (snapshot) => {
      const domains = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setSupportedDomains(domains);
      // Default to current host as requested
      if (!selectedDomain) {
        setSelectedDomain(CURR_HOST);
      }
    });
    
    const unsubForbidden = onSnapshot(collection(db, 'forbidden_subdomains'), (snapshot) => {
      setForbiddenList(snapshot.docs.map(doc => doc.data().subdomain.toLowerCase()));
    });

    return () => {
      unsub();
      unsubForbidden();
    };
  }, []);

  useEffect(() => {
    if (!subdomain || !selectedDomain) {
      setIsAvailable(null);
      return;
    }

    if (forbiddenList.includes(subdomain.toLowerCase())) {
      setIsAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const sub = subdomain.toLowerCase();
        
        // Check subdomainRequests
        const q1 = query(
          collection(db, 'subdomainRequests'),
          where('subdomain', '==', sub),
          where('domain', '==', selectedDomain)
        );
        const snapshot1 = await getDocs(q1);
        
        // Check dnsRequests
        const q2 = query(
          collection(db, 'dnsRequests'),
          where('subdomain', '==', sub),
          where('domain', '==', selectedDomain)
        );
        const snapshot2 = await getDocs(q2);

        setIsAvailable(snapshot1.empty && snapshot2.empty);
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain, selectedDomain, forbiddenList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (subdomain.length < 3) {
      toast.error('Subdomain phải có ít nhất 3 ký tự');
      return;
    }

    if (forbiddenList.includes(subdomain.toLowerCase())) {
      toast.error('Subdomain này bị cấm sử dụng!');
      return;
    }

    if (!isAvailable) {
      toast.error('Subdomain này đã có người sử dụng cho domain đã chọn');
      return;
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (cleanSubdomain !== subdomain) {
      toast.error('Subdomain chỉ được chứa chữ cái, số và dấu gạch ngang');
      return;
    }

    setLoading(true);
    try {
      // Check for existing requests to enforce limits
      const approvedOrPending = requests.filter(r => r.status === 'approved' || r.status === 'pending');
      if (approvedOrPending.length >= 3) {
        toast.error('Mỗi tài khoản chỉ có thể sở hữu tối đa 3 Subdomain.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'subdomainRequests'), {
        userId: user.uid,
        userEmail: email,
        displayName: userData?.displayName || 'User',
        subdomain: cleanSubdomain,
        domain: selectedDomain || CURR_HOST,
        githubRepo: (e.currentTarget as any).githubRepo?.value || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Gửi yêu cầu thành công!');
      setSubdomain('');
      (e.currentTarget as HTMLFormElement).reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subdomainRequests');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép!');
  };

  const requestDeletion = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'subdomainRequests', requestId), {
        status: 'pending_deletion',
        updatedAt: serverTimestamp()
      });
      toast.success('Đã gửi yêu cầu xóa Subdomain');
    } catch (error) {
      toast.error('Lỗi khi gửi yêu cầu xóa');
    }
  };

  const statusColors: any = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    pending_deletion: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
  };

  const statusLabels: any = {
    pending: 'Đang chờ duyệt',
    approved: 'Đang sử dụng',
    rejected: 'Đã từ chối',
    pending_deletion: 'Chờ xóa'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 space-y-16">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-medium  tracking-[0.2em] w-fit border border-blue-500/10"
        >
          <Zap className="w-3.5 h-3.5" /> Định danh & Thương hiệu
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl md:text-6xl font-medium text-slate-900 dark:text-white tracking-tight flex items-center gap-4  italic"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Globe className="w-8 h-8" />
          </div>
          ĐỊNH DANH CÁ NHÂN
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-slate-400 text-sm md:text-lg max-w-2xl font-medium leading-relaxed"
        >
          Tạo dựng thương hiệu riêng với đường dẫn bmassHD chuyên nghiệp. Ví dụ: <span className="text-blue-600 font-bold decoration-blue-500/30 underline decoration-2 underline-offset-4">{selectedDomain || CURR_HOST}/p/slug-cua-ban</span>
        </motion.p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
        {/* Request Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 bg-white dark:bg-black p-8 md:p-12 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-blue-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-medium text-slate-900 dark:text-white  tracking-tight">Đăng ký đường dẫn</h2>
              <p className="text-slate-400 text-xs font-bold mt-1">Lựa chọn định danh gắn liền với thương hiệu cá nhân của bạn.</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
              <span className="text-[11px] font-medium text-slate-400  tracking-normal">
                Sở hữu: <span className="text-blue-600">{requests.filter(r => r.status === 'approved' || r.status === 'pending').length}</span>/3
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Định danh (Slug)</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-300 group-focus-within/input:text-blue-600 transition-colors">
                    <Search className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="ví dụ: duc-nguyen"
                    className="w-full pl-14 pr-14 py-5 text-xl bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-medium text-slate-900 dark:text-white"
                    required
                  />
                  <div className="absolute inset-y-0 right-5 flex items-center">
                    {checking ? (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    ) : isAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : isAvailable === false ? (
                      <X className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Tên miền liên kết</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300">
                    <Globe className="w-full h-full" />
                  </div>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-medium text-[10px]  appearance-none cursor-pointer text-slate-900 dark:text-white"
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
              <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Email liên hệ hệ thống</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">GitHub Repository (Tiến trình Deploy)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center text-slate-300">
                  <Code className="w-5 h-5" />
                </div>
                <input 
                  type="url" 
                  name="githubRepo"
                  placeholder="https://github.com/username/repo-name"
                  className="w-full pl-14 pr-5 py-4 bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-300"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold  tracking-tight ml-2">Tùy chọn: Chúng tôi hỗ trợ Auto-Deploy từ mã nguồn GitHub.</p>
            </div>

            {/* Live Preview */}
            <AnimatePresence mode="wait">
              {subdomain && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 bg-blue-600 rounded-2xl text-white shadow-2xl shadow-blue-600/30 overflow-hidden relative group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[10px] font-medium  tracking-[0.2em] opacity-80 mb-3">Đường dẫn đích của bạn:</p>
                  <div className="flex items-center gap-2 font-medium text-xl md:text-2xl truncate italic">
                    <span className="opacity-50 tracking-tight">{(selectedDomain || CURR_HOST)}/p/</span>
                    <span className="text-white underline decoration-white/40 underline-offset-4 decoration-2 truncate">{subdomain}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading || !subdomain}
              className="w-full py-6 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-medium  tracking-[0.3em] text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/10 flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              GỬI YÊU CẦU XÁC MINH
            </button>
          </form>
        </motion.div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mb-4" />
              <p className="font-medium text-slate-900 dark:text-emerald-400 text-xs  tracking-normal leading-none">Bảo mật</p>
              <p className="text-slate-500 text-[10px] font-bold mt-2">Nội dung xác minh</p>
            </div>
            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <Zap className="w-8 h-8 text-amber-500 mb-4" />
              <p className="font-medium text-slate-900 dark:text-amber-400 text-xs  tracking-normal leading-none">Tốc độ</p>
              <p className="text-slate-500 text-[10px] font-bold mt-2">Duyệt trong 24h</p>
            </div>
          </div>

          <div className="p-8 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:scale-150 transition-all duration-700" />
            <h3 className="text-lg font-medium  tracking-tight italic flex items-center gap-2 mb-4">
              <ExternalLink className="w-5 h-5" /> Hệ sinh thái
            </h3>
            <p className="text-[11px] font-bold text-blue-50 leading-relaxed opacity-80">
              Mỗi định danh được cấp phát sẽ được tích hợp sẵn vào hệ sinh thái tìm kiếm và quảng bá của Bmass HD.
            </p>
          </div>
        </div>
      </div>

      {/* History Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl p-10 md:p-14 shadow-2xl shadow-black/[0.02]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 px-2">
          <div>
            <h3 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight  italic">Lịch sử định danh</h3>
            <p className="text-slate-400 text-sm font-bold mt-1">Danh sách các đường dẫn slug bạn đang sở hữu.</p>
          </div>
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
            <span className="text-[11px] font-medium text-slate-400  tracking-normal">
              Tổng cộng: <span className="text-blue-600">{requests.length}</span> đối tượng
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {fetching ? (
            <div className="col-span-full py-24 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin mb-6" />
              <span className="text-[10px] font-medium text-slate-400  tracking-[0.3em]">Đang đồng bộ dữ liệu...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <Globe className="w-20 h-20 text-slate-100 dark:text-white/5 mx-auto mb-8" />
              <p className="text-slate-400 font-medium  text-xs tracking-normal">Chưa có bản ghi định danh nào</p>
            </div>
          ) : (
            requests.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group p-8 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/20 transition-all hover:shadow-2xl hover:shadow-blue-500/5"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                    <Globe className="w-7 h-7" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-xl text-[10px] font-medium  tracking-normal border ${statusColors[req.status]}`}>
                    {statusLabels[req.status]}
                  </div>
                </div>

                <div className="space-y-1 mb-8">
                  <div className="flex items-center gap-2 group/slug">
                    <h4 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight  truncate">
                      {req.subdomain}
                    </h4>
                    <button onClick={() => copyToClipboard(`${(req as any).domain || CURR_HOST}/p/${req.subdomain}`)} className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 text-slate-400 hover:text-blue-600 transition-all opacity-100">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold  tracking-normal flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Tạo: {req.createdAt ? toSafeDate(req.createdAt).toLocaleString('vi-VN') : 'Pending Sync'}
                  </p>
                  {req.status === 'approved' && (req as any).expiresAt && (
                    <p className="text-[10px] text-rose-500 font-bold  tracking-normal flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      Hết hạn: {new Date((req as any).expiresAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/10 mb-8 overflow-hidden">
                   <div className="text-[9px] font-medium text-slate-400  tracking-normal mb-1">Tên miền gốc</div>
                   <div className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{(req as any).domain || CURR_HOST}</div>
                </div>

                {req.status === 'approved' && (
                  <div className="flex gap-3">
                    <a 
                      href={`https://${(req as any).domain || CURR_HOST}/p/${req.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-4 bg-slate-900 dark:bg-white/5 text-white rounded-2xl font-medium  tracking-normal text-[10px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-black/5"
                    >
                      <ExternalLink className="w-4 h-4" /> TRUY CẬP
                    </a>
                    <button 
                      onClick={() => requestDeletion(req.id)}
                      className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 dark:border-rose-500/20"
                      title="Yêu cầu xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {req.status === 'pending_deletion' && (
                   <div className="py-4 bg-rose-500/10 rounded-2xl text-center border border-rose-500/20">
                      <p className="text-[10px] font-medium text-rose-500  tracking-[0.2em]">ĐANG CHỜ XÓA</p>
                   </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

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
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { toSafeDate } from '../lib/utils';
import toast from 'react-hot-toast';

const CURR_HOST = window.location.host;

interface DomainRequest {
  id: string;
  subdomain: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  githubRepo?: string;
  createdAt: Timestamp;
}

export default function DomainRequestPage() {
  const { user, userData } = useAuthStore();
  const { domainExpiryDate } = useAppStore();
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      collection(db, 'subdomainRequests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DomainRequest[];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (subdomain.length < 3) {
      toast.error('Subdomain phải có ít nhất 3 ký tự');
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
      const hasActiveSubdomain = requests.some(r => r.status === 'approved' || r.status === 'pending');
      if (hasActiveSubdomain) {
        toast.error('Mỗi tài khoản chỉ có thể sở hữu 1 Subdomain.');
        setLoading(false);
        return;
      }

      // Check for 7-day cooldown
      const lastRequest = requests[0]; // Logic assumes requests are sorted by createdAt desc
      if (lastRequest) {
        const lastCreated = toSafeDate(lastRequest.createdAt);
        const diffDays = (Date.now() - lastCreated.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          const daysLeft = Math.ceil(7 - diffDays);
          toast.error(`Bạn cần đợi thêm ${daysLeft} ngày để thực hiện yêu cầu mới.`);
          setLoading(false);
          return;
        }
      }

      await addDoc(collection(db, 'subdomainRequests'), {
        userId: user.uid,
        userEmail: email,
        displayName: userData?.displayName || 'User',
        subdomain: cleanSubdomain,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Gửi yêu cầu thành công!');
      setSubdomain('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subdomainRequests');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20'
  };

  const statusLabels = {
    pending: 'Đang chờ duyệt',
    approved: 'Đã phê duyệt',
    rejected: 'Đã từ chối'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-12 pb-24 pt-4 px-4 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest w-fit"
        >
          <Zap className="w-3.5 h-3.5" /> Special Feature
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3"
        >
          <Globe className="w-8 h-8 md:w-12 md:h-12 text-blue-600" />
          Cấp Trang Cá Nhân Miễn Phí
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 dark:text-slate-400 text-sm md:text-xl max-w-2xl font-medium leading-relaxed"
        >
          Xây dựng thương hiệu cá nhân với đường dẫn riêng ngay trên hệ sinh thái bmassHD. Ví dụ: {CURR_HOST}/p/ten-cua-ban
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Request Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Đăng ký ngay</h2>
          <p className="text-slate-500 text-sm mb-8 font-bold">Vui lòng điền tên định danh (slug) bạn muốn sở hữu.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Đường dẫn mong muốn (Slug)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="vi dụ: ten-cua-ban"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email liên hệ</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Live Preview */}
            <AnimatePresence>
              {subdomain && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-600/20 overflow-hidden"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Đường dẫn của bạn sẽ là:</p>
                  <div className="flex items-center gap-2 font-black text-lg md:text-xl truncate">
                    <span className="opacity-50">{CURR_HOST}/p/</span>
                    <span className="text-white underline decoration-white/30 truncate">{subdomain}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading || !subdomain}
              className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-600/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Gửi yêu cầu phê duyệt
            </button>
          </form>

          <div className="mt-10 grid grid-cols-2 gap-4">
             <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-widest">Bảo mật</p>
                <p className="text-slate-500 text-[10px] font-bold">100% Thuộc về bạn</p>
             </div>
             <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <Zap className="w-6 h-6 text-amber-500 mb-2" />
                <p className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-widest">Tốc độ</p>
                <p className="text-slate-500 text-[10px] font-bold">Duyệt trong 24h</p>
             </div>
          </div>

          {daysLeft !== null && daysLeft > 0 && (
            <div className="mt-8 p-6 bg-rose-500/5 border border-rose-500/20 rounded-[2rem] relative overflow-hidden">
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
        </motion.div>

        {/* Request History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Lịch sử yêu cầu</h3>
            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500">
              {requests.length} Yêu cầu
            </span>
          </div>

          <div className="space-y-4">
            {fetching ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-[2.5rem] text-center px-10">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                <p className="text-amber-600 font-bold text-sm">{error}</p>
                <p className="text-slate-400 text-xs mt-2 font-medium">Chỉ mục này đang được Firebase tự động khởi tạo.</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] text-center px-10">
                <Globe className="w-12 h-12 text-slate-200 dark:text-white/5 mb-4" />
                <p className="text-slate-500 font-bold text-sm">Bạn chưa có yêu cầu nào.</p>
                <p className="text-slate-400 text-xs mt-2 font-medium">Hãy gửi yêu cầu đầu tiên của bạn ngay bên cạnh!</p>
              </div>
            ) : (
              requests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card p-6 rounded-[2rem] border-slate-100 dark:border-white/10 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white tracking-tight text-sm">{CURR_HOST}/p/{req.subdomain}</p>
                        <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.createdAt?.toDate().toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[req.status]}`}>
                      {statusLabels[req.status]}
                    </div>
                  </div>

                  {req.githubRepo && (
                    <div className="mb-4 p-4 rounded-2xl bg-slate-900 border border-white/5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Code className="w-3.5 h-3.5" /> Source Code (Github):
                      </p>
                      <a 
                        href={req.githubRepo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-400 hover:underline truncate block"
                      >
                        {req.githubRepo}
                      </a>
                    </div>
                  )}

                  {req.adminNote && (
                    <div className="mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                         <AlertCircle className="w-3 h-3" /> Phản hồi từ Admin:
                       </p>
                       <p className="text-xs font-bold text-slate-700 dark:text-white leading-relaxed">
                         {req.adminNote}
                       </p>
                    </div>
                  )}

                  {req.status === 'approved' && (
                    <a 
                      href={`/p/${req.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Truy cập ngay
                    </a>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

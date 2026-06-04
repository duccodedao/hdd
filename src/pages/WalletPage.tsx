import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  AlertCircle, RefreshCw, Plus, ArrowUpRight, History, 
  CreditCard, CheckCircle2, Copy, Gift, ArrowDownLeft, Search,
  ShoppingBag
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp: number;
    let animationFrame: number;
    const duration = 800;
    const initialValue = displayValue;
    const diff = value - initialValue;
    
    if (diff === 0) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.floor(initialValue + diff * easeProgress));
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
};

export default function WalletPage() {
  const { user } = useAuthStore();
  const { maintenanceTabs } = useAppStore();
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTabTab] = useState<'deposit' | 'withdraw' | 'offers'>('deposit');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'deposits' | 'purchases'>('deposits');
  
  // Real-time collections
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]); // Recommended target recipients
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  const [searchTx, setSearchTx] = useState('');

  // Purchase History Pagination
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(10);
  const totalPurchasePages = Math.ceil(transactions.length / purchasePageSize);
  const paginatedTransactions = transactions.slice((purchasePage - 1) * purchasePageSize, purchasePage * purchasePageSize);

  // Pagination for Deposit History
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [10, 20, 30, 40, 50];

  // (Removed redundant states)
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(50000);
  const [selectedBank, setSelectedBank] = useState<'MB' | 'VCB'>('MB');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [depositStep, setDepositStep] = useState<1 | 2 | 3 | 4>(1);
  
  const [bankingConfig, setBankingConfig] = useState<any>({
    MB: {
      bankCode: 'MB',
      bankName: 'Ngân hàng Quân Đội (MB)',
      bankAccount: '00010302003',
      ownerName: 'Vũ Minh Đức'
    }
  });

  const presets = [20000, 50000, 100000, 200000, 500000, 1000000];

  // 1. Sync User Balance Real-time
  useEffect(() => {
    if (!user) return;
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => unsubUser();
  }, [user]);

  // 2. Load lists (transactions, deposits, recommendations)
  useEffect(() => {
    if (!user) return;

    // Load custom system settings for banking config
    const fetchSystemConfig = async () => {
      try {
        const sysSnap = await getDoc(doc(db, 'settings', 'system'));
        if (sysSnap.exists()) {
          const sysData = sysSnap.data();
          if (sysData.bankingConfig) {
            setBankingConfig({
              MB: {
                bankCode: sysData.bankingConfig.bankCode || 'MB',
                bankName: sysData.bankingConfig.bankCode === 'MB' ? 'Ngân hàng Quân Đội (MB)' : `${sysData.bankingConfig.bankCode} Bank`,
                bankAccount: sysData.bankingConfig.bankAccount || '00010302003',
                ownerName: sysData.bankingConfig.ownerName || sysData.bankingConfig.holderName || sysData.bankingConfig.recipientName || 'Vũ Minh Đức'
              }
            });
          }
        }
      } catch (err) {
        console.error("Error loading system coordinates:", err);
      }
    };
    fetchSystemConfig();

    // Query of deposit invoices
    const qDeposits = query(
      collection(db, 'invoices'),
      where('userId', '==', user.uid),
      where('type', '==', 'deposit'),
      orderBy('createdAt', 'desc')
    );

    // Query of spent/transfer transactions
    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Dynamic search suggestions - Get some system users to show as suggestions (excluding self)
    const loadSystemUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const listUsers = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter((u: any) => u.uid !== user.uid);
        
        setSystemUsers(listUsers.slice(0, 5));
      } catch (e) {
        console.error("Error reading directory users:", e);
      }
    };
    loadSystemUsers();

    const unsubDeposits = onSnapshot(qDeposits, (snap) => {
      setDeposits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });

    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubDeposits();
      unsubTransactions();
    };
  }, [user]);

  // Timer Countdown for Deposit Invoice
  useEffect(() => {
    let timerId: any;
    if (activeInvoice && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1000);
      }, 1000);
    } else if (timeLeft <= 0 && activeInvoice) {
      setActiveInvoice(null);
      setDepositStep(1);
    }
    return () => clearInterval(timerId);
  }, [activeInvoice, timeLeft]);

  // Real-time listener for active deposit payment confirmation to Step 4
  useEffect(() => {
    if (!activeInvoice?.id) return;
    const unsubInv = onSnapshot(doc(db, 'invoices', activeInvoice.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'paid' || data.status === 'completed') {
          setDepositStep(4);
        }
      }
    });
    return () => unsubInv();
  }, [activeInvoice?.id]);

  // Refresh Balance Trigger
  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    toast.success('Đã cập nhật số dư mới nhất!');
    setTimeout(() => setIsRefreshing(false), 900);
  };

  // Pagination Logic
  const filteredDepositsList = deposits
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    })
    .filter(d => {
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const isSucceeded = d.status === 'paid' || d.status === 'completed';
        if (statusFilter === 'completed') matchesStatus = isSucceeded;
        else if (statusFilter === 'pending') matchesStatus = d.status === 'pending';
        else if (statusFilter === 'cancelled') matchesStatus = d.status === 'cancelled' || d.status === 'failed' || (!isSucceeded && d.status !== 'pending');
      }

      let matchesSearch = true;
      if (searchTx.trim()) {
        const s = searchTx.toLowerCase();
        matchesSearch = d.id?.toLowerCase().includes(s) || 
                        d.paymentDetails?.referenceCode?.toLowerCase().includes(s);
      }

      return matchesStatus && matchesSearch;
    });

  const totalPages = Math.ceil(filteredDepositsList.length / pageSize);
  const paginatedDeposits = filteredDepositsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize, searchTx]);

  // Create deposit invoice (SePay Integration)
  const handleDepositInit = async () => {
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount < 5000) {
      toast.error('Số tiền nạp tối thiểu là 5.000đ');
      return;
    }

    setIsGeneratingQR(true);
    try {
      const resp = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          userEmail: user?.email,
          items: [{ name: `Nạp ví BMASS`, price: amount }],
          totalAmount: amount,
          type: 'deposit'
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const msg = errorData.error || 'Create invoice server failure';
        if (errorData.hint) {
          toast.error(`${msg}\n${errorData.hint}`, { duration: 8000 });
        }
        throw new Error(msg);
      }
      const invoiceData = await resp.json();

      setActiveInvoice(invoiceData);
      setTimeLeft(15 * 60_000); // 15 mins checkout counter
      setDepositStep(2); // Set step after successful creation
      toast.success('Tạo đơn nạp thành công!');
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khởi tạo nạp tiền SePay');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Verify SePay invoice webhook status
  const handleVerifyInvoiceStatus = async (invoiceId: string, isSandbox = false) => {
    const toastId = toast.loading(isSandbox ? 'Đang thực hiện duyệt mô phỏng...' : 'Đang kiểm tra giao dịch...');
    try {
      const resp = await fetch('/api/invoices/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, isSandboxMock: isSandbox })
      });

      const data = await resp.json();
      if (data.success) {
        toast.success(data.message || 'Cộng tiền vào ví thành công!', { id: toastId });
        if (activeInvoice?.id === invoiceId) {
          setActiveInvoice(null);
        }
      } else {
        toast.error(data.message || 'Hệ thống chưa ghi nhận chuyển khoản mới.', { id: toastId });
      }
    } catch (err) {
      toast.error('Không kết nối được API xác thực', { id: toastId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép nội dung!');
  };

  const formatTime = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // feature maintenance check
  if (maintenanceTabs?.wallet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 h-[calc(100vh-80px)]">
         <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-white/10">
           <AlertCircle className="w-8 h-8 opacity-50" />
         </div>
         <h2 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-2">Đang bảo trì</h2>
         <p className="max-w-md mx-auto text-xs text-slate-500 dark:text-zinc-500 font-medium leading-relaxed">Ví điện tử hiện đang được hệ thống nâng cấp. Vui lòng quay lại sau ít phút hoặc theo dõi bảng tin kỹ thuật.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 py-4 sm:py-6 h-full flex flex-col gap-6">
      
      {/* Profile Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
        <div>
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chào mừng trở lại,</h4>
          <p className="text-lg font-bold text-slate-800 dark:text-zinc-100">
            {userData?.displayName || 'Thành viên BMASS'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">● Trực tuyến</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Side: Balance and Tab Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Balance Widget */}
          <div className="relative overflow-hidden bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-600/20">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-200">Số dư khả dụng</span>
                <button 
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className={`p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/90 ${isRefreshing ? 'animate-spin' : ''}`}
                  title="Làm mới số dư"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-baseline gap-1 mt-6">
                <span className="text-5xl font-black tracking-tighter text-white">
                  <AnimatedNumber value={userData?.balance || 0} />
                </span>
                <span className="text-xl font-bold text-indigo-300">đ</span>
              </div>
            </div>
            
            {/* Background flare */}
            <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-50" />
            <div className="absolute -top-16 -left-16 w-40 h-40 bg-indigo-700 rounded-full blur-3xl opacity-50" />
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-zinc-950 rounded-3xl p-4 border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'deposit', label: 'Nạp tiền', icon: Plus },
                { id: 'withdraw', label: 'Rút tiền', icon: ArrowUpRight },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTabTab(tab.id as any);
                  }}
                  className={`flex flex-col items-center justify-center gap-3 py-5 rounded-2xl transition-all font-black border ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border-indigo-600' 
                      : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850 border-transparent'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area: Active Form */}
        <div className="lg:col-span-8 space-y-4 flex flex-col min-w-0">
          <div className="bg-white dark:bg-zinc-950 p-4 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
          <AnimatePresence mode="wait">
            
            {/* TAB: NẠP TIỀN / 4-STAGE CLEAR EXPERIENCE */}
            {activeTab === 'deposit' && (
              <motion.div
                key="view-deposit-stepper"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* 4 Step visual indicator progress bar */}
                <div className="flex items-center justify-between mb-2 px-1">
                  {[
                    { step: 1, label: 'Phương thức' },
                    { step: 2, label: 'Thanh toán' },
                    { step: 3, label: 'Chờ duyệt' },
                    { step: 4, label: 'Thành công' }
                  ].map((s, i) => (
                    <React.Fragment key={s.step}>
                      <div className="flex flex-col items-center gap-1 flex-1 relative">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          depositStep === s.step
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/50'
                            : depositStep > s.step
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                        }`}>
                          {depositStep > s.step ? '✓' : s.step}
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-bold tracking-tight whitespace-nowrap mt-1 ${
                          depositStep === s.step ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400'
                        }`}>{s.label}</span>
                      </div>
                      {i < 3 && (
                        <div className={`h-[2px] w-full mx-1 -mt-4 transition-all ${
                          depositStep > s.step ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-zinc-850'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {depositStep === 1 && (
                  <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                       
                       {/* Left column: QR code placeholder */}
                       <div className="hidden lg:flex lg:col-span-5 bg-slate-50/50 dark:bg-zinc-900/50 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                         <div className="flex items-center gap-2 mb-4 opacity-50 grayscale">
                           <img 
                             src="https://qr.sepay.vn/assets/img/banklogo/MB.png" 
                             alt="MB Bank Logo" 
                             className="h-4 object-contain"
                           />
                           <span className="text-[10px] font-black text-slate-400 tracking-wider">MB BANK</span>
                         </div>
                         
                         <div className="p-3 bg-white/50 dark:bg-zinc-900/50 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm">
                           <div className="w-40 h-40 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 rounded-xl relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('https://qr.sepay.vn/img?acc=0&bank=MB&amount=0&des=0')] opacity-5 blur-sm bg-cover" />
                             <RefreshCw className="w-6 h-6 text-slate-300 dark:text-zinc-600 relative z-10" />
                           </div>
                         </div>
                         <p className="text-[9px] text-slate-400 font-extrabold mt-3 uppercase tracking-wider opacity-60">MÃ QR SẼ HIỂN THỊ KHI TẠO ĐƠN</p>
                       </div>

                       {/* Right column: Form */}
                       <div className="col-span-1 lg:col-span-7 space-y-4 bg-transparent lg:bg-slate-50/50 lg:dark:bg-zinc-900/50 lg:p-6 lg:rounded-3xl flex flex-col justify-center">
                    {/* Method List (Only MB Bank as instructed) */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block ml-1">Chọn Phương thức thanh toán</label>
                       <div className="p-3.5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/10 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-indigo-100 dark:border-white/5">
                             <img src="https://qr.sepay.vn/assets/img/banklogo/MB.png" alt="MB" className="h-4 object-contain" />
                           </div>
                           <div>
                             <p className="text-xs font-black leading-none mb-1 text-indigo-600 dark:text-indigo-400">Ngân hàng Quân Đội (MB Bank)</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Duyệt tự động SePay tức thì</p>
                           </div>
                         </div>
                         <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                           ✓
                         </div>
                       </div>
                     </div>

                    {/* Numeric Input & Presets */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block ml-1">Số tiền muốn nạp (VNĐ)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={depositAmount}
                          onChange={(e) => {
                            setDepositAmount(e.target.value);
                            setSelectedPreset(null);
                          }}
                          placeholder="Nhập tối thiểu 5.000..."
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 italic">đ</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {presets.map(bp => (
                          <button
                            key={bp}
                            type="button"
                            onClick={() => {
                              setDepositAmount(bp.toString());
                              setSelectedPreset(bp);
                            }}
                            className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                              selectedPreset === bp 
                                ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold' 
                                : 'bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-white/5 text-slate-600 dark:text-zinc-300 hover:border-indigo-400'
                            }`}
                          >
                            {bp.toLocaleString()}đ
                          </button>
                        ))}
                      </div>
                    </div>
                    </div>
                  </div>

                    <button
                      onClick={handleDepositInit}
                      disabled={isGeneratingQR}
                      className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2"
                    >
                      {isGeneratingQR ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Tạo đơn & Mã QR thanh toán</>
                      )}
                    </button>
                  </div>
                )}

                 {depositStep === 2 && activeInvoice && (
                   <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                     
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                       
                       {/* Left column: QR code and bank brand logo */}
                       <div className="lg:col-span-5 bg-slate-50/50 dark:bg-zinc-900/50 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                         <div className="flex items-center gap-2 mb-4 bg-indigo-50/50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-100/50">
                           <img 
                             src="https://qr.sepay.vn/assets/img/banklogo/MB.png" 
                             alt="MB Bank Logo" 
                             className="h-4 object-contain"
                           />
                           <span className="text-[10px] font-black text-slate-600 dark:text-zinc-350 tracking-wider">MB BANK</span>
                         </div>
                         
                         <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                           <img 
                             src={`https://qr.sepay.vn/img?acc=${bankingConfig.MB.bankAccount}&bank=${bankingConfig.MB.bankCode}&amount=${activeInvoice.totalAmount}&des=${activeInvoice.paymentDetails?.referenceCode}`}
                             alt="QR Deposit Code"
                             className="w-40 h-40 object-contain rounded-xl mx-auto"
                           />
                         </div>
                         <p className="text-[9px] text-slate-400 font-extrabold mt-3 uppercase tracking-wider">QUÉT MÃ TRÊN ĐỂ TỰ ĐỘNG ĐIỀN THÔNG TIN</p>
                       </div>

                       {/* Right column: Invoice details in horizontal tabular layout */}
                       <div className="lg:col-span-7 bg-slate-50/50 dark:bg-zinc-900/50 p-6 rounded-3xl flex flex-col justify-between">
                         <div className="overflow-x-auto">
                           <table className="w-full text-left text-xs border-collapse">
                             <tbody>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px] w-28">Chủ thụ hưởng</td>
                                 <td className="py-3 font-bold text-slate-800 dark:text-zinc-200 text-right">{bankingConfig.MB.ownerName}</td>
                               </tr>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">#STT</td>
                                 <td className="py-3 flex items-center justify-end gap-2 text-right">
                                   <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{activeInvoice.id}</span>
                                   <button onClick={() => copyToClipboard(activeInvoice.id)} type="button" className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Sao chép"><Copy size={16} /></button>
                                 </td>
                               </tr>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Số tài khoản nhận</td>
                                 <td className="py-3 flex items-center justify-end gap-2 text-right">
                                   <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{bankingConfig.MB.bankAccount}</span>
                                   <button onClick={() => copyToClipboard(bankingConfig.MB.bankAccount)} type="button" className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Sao chép"><Copy size={16} /></button>
                                 </td>
                               </tr>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Nội dung CK</td>
                                 <td className="py-3 flex items-center justify-end gap-2 text-right">
                                   <span className="font-mono font-black text-[#3d5afe] bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded text-xs select-all">{activeInvoice.paymentDetails?.referenceCode}</span>
                                   <button onClick={() => copyToClipboard(activeInvoice.paymentDetails?.referenceCode || "")} type="button" className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Sao chép"><Copy size={16} /></button>
                                 </td>
                               </tr>
                               <tr>
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Số tiền nạp</td>
                                 <td className="py-3 flex items-center justify-end gap-2 text-right font-black">
                                   <span className="text-emerald-600 text-sm">{activeInvoice.totalAmount.toLocaleString()} VNĐ</span>
                                   <button onClick={() => copyToClipboard(activeInvoice.totalAmount.toString())} type="button" className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Sao chép"><Copy size={16} /></button>
                                 </td>
                               </tr>
                             </tbody>
                           </table>
                         </div>
                         
                         <div className="mt-4 pt-3 border-t border-slate-200/40 dark:border-white/5 text-[9px] text-slate-400 leading-relaxed italic">
                           * Ghi chú: Chuyển khoản hoàn toàn chính xác nội dung thụ hưởng để tài khoản được áp dụng tự động.
                         </div>
                       </div>

                     </div>

                     <div className="space-y-3 pt-2">
                       <button
                         onClick={() => {
                           handleVerifyInvoiceStatus(activeInvoice.id, false);
                           setDepositStep(3);
                         }}
                         className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2"
                       >
                         Tôi đã chuyển khoản thanh toán
                       </button>

                       <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
                         <div className="flex items-center gap-1.5 text-amber-600 font-extrabold">
                           <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                           <span>Hết hạn: {formatTime(timeLeft)}</span>
                         </div>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => {
                               setActiveInvoice(null);
                               setDepositStep(1);
                             }}
                             className="text-[10px] font-black text-rose-500 hover:underline cursor-pointer"
                           >
                             Hủy đơn nạp
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}


                {depositStep === 3 && activeInvoice && (
                  <div className="flex flex-col items-center justify-center text-center py-6 space-y-6 animate-in fade-in duration-300">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-950/20 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 absolute inset-0 m-auto flex items-center justify-center">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-widest">Đang rà soát thanh toán</h3>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Hệ thống đang kiểm tra tự động dòng tiền ngân hàng liên kết với SePay. Giao dịch sẽ được nâng cấp phê duyệt tức thì.
                      </p>
                    </div>

                    <div className="w-full bg-slate-50/50 dark:bg-zinc-900/40 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-2 text-left">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">ID đơn nạp:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-250 truncate max-w-[150px]">{activeInvoice.id}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tổng tiền nạp:</span>
                        <span className="font-extrabold text-emerald-600">{activeInvoice.totalAmount.toLocaleString()} VNĐ</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Nội dung đã ghi:</span>
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-450">{activeInvoice.paymentDetails?.referenceCode}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 w-full">
                      <button
                        onClick={() => handleVerifyInvoiceStatus(activeInvoice.id, false)}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-655 dark:bg-zinc-900 dark:text-slate-350 dark:hover:bg-zinc-850 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200/50 dark:border-white/5"
                      >
                        Kiểm tra lại ngay
                      </button>

                      <button
                        onClick={() => handleVerifyInvoiceStatus(activeInvoice.id, true)}
                        className="hidden flex-1 py-3 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Duyệt Mô phỏng (Sandbox)
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setDepositStep(1);
                        setActiveInvoice(null);
                      }}
                      className="text-[10px] font-black text-rose-500 hover:underline cursor-pointer"
                    >
                      Quay lại trang chính nạp tiền
                    </button>
                  </div>
                )}

                {depositStep === 4 && activeInvoice && (
                  <div className="flex flex-col items-center justify-center text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <span className="text-2xl font-black text-white">✓</span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest">Nạp tiền thành công!</h3>
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        + {activeInvoice.totalAmount.toLocaleString()}đ
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      Tuyệt vời! Hệ thống SePay đã ghi nhận thành công giao dịch của bạn. Số dư ví điện tử của bạn đã được cộng tương ứng.
                    </p>

                    <div className="p-3 bg-indigo-50/50 dark:bg-zinc-900/40 rounded-xl w-full text-xs flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Số dư tài khoản mới:</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        <AnimatedNumber value={userData?.balance || 0} /> đ
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveInvoice(null);
                        setDepositStep(1);
                      }}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      Hoàn tất
                    </button>
                  </div>
                )}
                
              </motion.div>
            )}

            {/* TAB: RÚT TIỀN (Under Development Placeholder) */}
            {activeTab === 'withdraw' && (
              <motion.div
                key="view-withdraw"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-10 space-y-4"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Đang phát triển</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Chức năng rút tiền mặt về tài khoản ngân hàng liên kết đang được tích hợp thêm. Vui lòng quay lại sau.</p>
                </div>
                <button 
                  onClick={() => setActiveTabTab('deposit')}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Quay lại
                </button>
              </motion.div>
            )}

            {/* TAB: ƯU ĐÃI (Under Development Placeholder) */}
            {activeTab === 'offers' && (
              <motion.div
                key="view-offers"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-10 space-y-4"
              >
                <div className="w-14 h-14 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <Gift size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Kho Ưu đãi BMASS</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Ưu đãi giảm giá 20-50% khi thanh toán các gói công cụ AI bằng ví điện tử đang được lên chương trình.</p>
                </div>
                <button 
                  onClick={() => setActiveTabTab('deposit')}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Quay lại
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      {/* 5. Combined Histories Table Container */}
      <div className="bg-white dark:bg-zinc-950 p-0 rounded-[2.5rem] flex flex-col border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex-1 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-2 sticky top-0 bg-white dark:bg-zinc-950 z-20">
          <div className="flex items-center gap-8 border-b border-slate-100 dark:border-white/5 w-full sm:w-auto">
            <button 
              onClick={() => setActiveHistoryTab('deposits')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
                activeHistoryTab === 'deposits' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Lịch sử nạp tiền
              {activeHistoryTab === 'deposits' && <motion.div layoutId="activeTabHistory" className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveHistoryTab('purchases')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
                activeHistoryTab === 'purchases' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Lịch sử mua hàng
              {activeHistoryTab === 'purchases' && <motion.div layoutId="activeTabHistory" className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-full" />}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-white/10 w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text" 
                value={searchTx} 
                onChange={(e) => setSearchTx(e.target.value)} 
                placeholder="Tìm kiếm..." 
                className="pl-8 pr-3 py-2 w-full bg-slate-50 dark:bg-zinc-900 outline-none text-[10px] font-bold text-slate-800 dark:text-zinc-200"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar scroll-smooth">
          {activeHistoryTab === 'deposits' ? (
            <div className="min-w-[800px]">
              {deposits.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <History size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Chưa có lịch sử nạp tiền</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10">
                      <tr className="border-b border-slate-100 dark:border-white/5">
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">STT</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">ID giao dịch</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày giờ</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Số tiền</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {paginatedDeposits.map((d, index) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{(currentPage - 1) * pageSize + index + 1}</td>
                          <td className="py-4 px-2 text-[11px] font-mono font-bold text-slate-900 dark:text-white uppercase truncate max-w-[120px]">{d.id?.slice(-12)}</td>
                          <td className="py-4 px-2 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                            {d.createdAt?.toMillis ? format(d.createdAt.toMillis(), 'HH:mm dd/MM/yy') : 'Vừa xong'}
                          </td>
                          <td className="py-4 px-2 text-[11px] font-black text-emerald-600 text-right">{d.totalAmount?.toLocaleString()}đ</td>
                          <td className="py-4 px-6 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              d.status === 'completed' || d.status === 'paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {d.status === 'completed' || d.status === 'paid' ? 'Thành công' : 'Đang duyệt'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/10">
                    <div className="flex items-center gap-2">
                       {pageSizes.map(size => (
                         <button key={size} onClick={() => setPageSize(size)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === size ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'} cursor-pointer`}>{size}</button>
                       ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-2 disabled:opacity-30 cursor-pointer"><ArrowDownLeft className="w-4 h-4 rotate-45" /></button>
                      <span className="text-[10px] font-black text-slate-400">Trang {currentPage} / {totalPages || 1}</span>
                      <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)} className="p-2 disabled:opacity-30 cursor-pointer"><ArrowUpRight className="w-4 h-4 rotate-45" /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="min-w-[800px]">
              {transactions.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <ShoppingBag size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Chưa có lịch sử mua hàng</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10">
                      <tr className="border-b border-slate-100 dark:border-white/5">
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">STT</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">ID giao dịch</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày giờ</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Sản phẩm</th>
                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Số tiền</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {paginatedTransactions.map((tx, index) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 text-[11px] font-bold text-slate-400">{(purchasePage - 1) * purchasePageSize + index + 1}</td>
                          <td className="py-4 px-2 text-[11px] font-mono font-bold text-slate-900 dark:text-white uppercase truncate max-w-[120px]">{tx.id?.slice(-12)}</td>
                          <td className="py-4 px-2 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                            {tx.createdAt?.toMillis ? format(tx.createdAt.toMillis(), 'HH:mm dd/MM/yy') : 'Vừa xong'}
                          </td>
                          <td className="py-4 px-2 text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[200px] uppercase">{tx.productName || tx.description || 'Giao dịch'}</td>
                          <td className="py-4 px-2 text-[11px] font-black text-rose-500 text-right">-{tx.amount?.toLocaleString()}đ</td>
                          <td className="py-4 px-6 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                              Thành công
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/10">
                    <div className="flex items-center gap-2">
                       {pageSizes.map(size => (
                         <button key={size} onClick={() => setPurchasePageSize(size)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${purchasePageSize === size ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'} cursor-pointer`}>{size}</button>
                       ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button disabled={purchasePage === 1} onClick={() => setPurchasePage(p => p - 1)} className="p-2 disabled:opacity-30 cursor-pointer"><ArrowDownLeft className="w-4 h-4 rotate-45" /></button>
                      <span className="text-[10px] font-black text-slate-400">Trang {purchasePage} / {totalPurchasePages || 1}</span>
                      <button disabled={purchasePage >= totalPurchasePages} onClick={() => setPurchasePage(p => p + 1)} className="p-2 disabled:opacity-30 cursor-pointer"><ArrowUpRight className="w-4 h-4 rotate-45" /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
   );
}

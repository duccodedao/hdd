import React, { useState, useEffect } from 'react';
import { X, Zap, RefreshCw, AlertCircle, Check, Download } from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title?: string;
    name?: string;
    price: number;
    salePrice?: number;
    type?: string;
    githubUrl?: string;
  } | null;
  onPaid: () => void;
}

export const PaymentDialog = ({ isOpen, onClose, item, onPaid }: PaymentDialogProps) => {
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'paid' | 'expired' | 'error'>('waiting');
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60_000);
  const [bankingConfig, setBankingConfig] = useState({
    bankCode: 'MB',
    bankAccount: '00010302003'
  });

  const [retryTrigger, setRetryTrigger] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [showSandboxBypass, setShowSandboxBypass] = useState(false);

  useEffect(() => {
    let uiInterval: any;
    let unsubInvoice: any = null;

    if (isOpen && item && user) {
      setPaymentStatus('waiting');
      setTimeLeft(15 * 60_000);
      setVerifying(false);
      setShowSandboxBypass(false);

      const fetchBankingConfig = async () => {
        try {
          const sysSnap = await getDoc(doc(db, 'settings', 'system'));
          if (sysSnap.exists()) {
            const data = sysSnap.data();
            if (data.bankingConfig) {
              setBankingConfig({
                bankCode: data.bankingConfig.bankCode || 'MB',
                bankAccount: data.bankingConfig.bankAccount || '00010302003'
              });
            }
          }
        } catch (err) {
          console.error("Error loading banking configurations:", err);
        }
      };
      fetchBankingConfig();

      const initPayment = async () => {
        setLoading(true);
        try {
          const resp = await fetch('/api/invoices/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              userEmail: user.email,
              items: [{ 
                itemId: item.id, 
                name: item.title || item.name || 'Sản phẩm', 
                price: item.salePrice || item.price 
              }],
              totalAmount: item.salePrice || item.price
            })
          });

          if (!resp.ok) {
             const errData = await resp.json().catch(() => ({}));
             throw new Error(errData.error || 'Failed to create invoice');
          }

          const data = await resp.json();
          setInvoice(data);
          
          const deadline = Date.now() + 15 * 60_000;

          // Visual countdown timer
          uiInterval = setInterval(() => {
            const left = deadline - Date.now();
            if (left <= 0) {
              clearInterval(uiInterval);
              if (unsubInvoice) {
                unsubInvoice();
                unsubInvoice = null;
              }
              setPaymentStatus('expired');
            } else {
              setTimeLeft(left);
            }
          }, 1000);

          // Real-time listener for "immediate confirmation"
          unsubInvoice = onSnapshot(doc(db, 'invoices', data.id), (snapshot) => {
            if (snapshot.exists()) {
              const invoiceData = snapshot.data();
              if (invoiceData.status === 'paid') {
                if (unsubInvoice) {
                  unsubInvoice();
                  unsubInvoice = null;
                }
                if (uiInterval) clearInterval(uiInterval);
                setPaymentStatus('paid');
                toast.success('Thanh toán thành công!');
                onPaid();
              }
            }
          });
        } catch (e: any) {
          toast.error('Lỗi khi khởi tạo thanh toán');
          setErrorMessage(e.message || 'Lỗi không xác định');
          setPaymentStatus('error');
        } finally {
          setLoading(false);
        }
      };
      initPayment();
    }
    return () => {
      if (unsubInvoice) {
        unsubInvoice();
      }
      if (uiInterval) clearInterval(uiInterval);
    };
  }, [isOpen, item?.id, user?.uid, retryTrigger]);

  const handleVerifyPayment = async (isMock = false) => {
    if (!invoice?.id) return;
    setVerifying(true);
    try {
      const resp = await fetch('/api/invoices/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          isSandboxMock: isMock
        })
      });

      const resData = await resp.json();
      if (resp.ok && resData.success) {
        setPaymentStatus('paid');
        toast.success(resData.message || 'Thanh toán thành công!');
        onPaid();
      } else {
        toast.error(resData.message || 'Không tìm thấy giao dịch chuyển khoản');
        if (!isMock) {
          setShowSandboxBypass(true);
        }
      }
    } catch (e: any) {
      toast.error('Có lỗi xảy ra khi xác thực giao dịch');
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center text-center space-y-4">
             <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
                <Zap size={40} className="fill-indigo-600 animate-pulse" />
             </div>
             
             <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Thanh toán</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Quét mã QR để hoàn tất.</p>
             </div>

             {loading && !invoice ? (
               <div className="py-12 flex flex-col items-center gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Đang khởi tạo giao dịch...</p>
               </div>
             ) : paymentStatus === 'error' || !invoice ? (
               <div className="py-12 flex flex-col items-center gap-4 text-center">
                  <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                    <AlertCircle size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Lỗi khởi tạo giao dịch</p>
                  {errorMessage && <p className="text-xs text-rose-500 max-w-xs">{errorMessage}</p>}
                  <button onClick={() => setRetryTrigger(prev => prev + 1)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Thử lại</button>
               </div>
             ) : paymentStatus === 'paid' ? (
                /* Successful payment state displaying quick action buttons */
                <div className="w-full space-y-6 py-4 animate-in zoom-in-95 duration-300" id="payment-success-screen">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-md">
                      <Check className="w-8 h-8 text-emerald-500 font-bold" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">Thanh Toán Thành Công!</h4>
                      <p className="text-slate-500 dark:text-zinc-400 text-xs">Cảm ơn bạn, giao dịch của bạn đã được xác nhận tự động.</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-slate-100 dark:border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Tài liệu:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 text-right max-w-[200px] truncate">{item.title || item.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Số tiền:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{(item.salePrice || item.price).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Mã hóa đơn:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{invoice.id}</span>
                    </div>
                  </div>

                  {item.githubUrl && (
                    <button
                      onClick={() => {
                        window.open(item.githubUrl, '_blank');
                        toast.success('Đang bắt đầu tải xuống tài liệu...');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/15 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all text-xs uppercase tracking-wider"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Tải xuống tài liệu ngay
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full py-3 px-5 rounded-2xl font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs uppercase tracking-wider"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
             ) : (
               <div className="w-full space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5">
                     <img 
                       src={`https://qr.sepay.vn/img?acc=${bankingConfig.bankAccount}&bank=${bankingConfig.bankCode}&amount=${invoice.totalAmount}&des=${invoice.paymentDetails.referenceCode}`}
                       alt="VietQR"
                       className="w-full aspect-square rounded-2xl shadow-sm border border-slate-200 dark:border-white/10"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                     <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tiền</p>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{invoice.totalAmount.toLocaleString()}đ</p>
                     </div>
                     <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nội dung</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{invoice.paymentDetails.referenceCode}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                     <AlertCircle size={20} className="text-amber-500 shrink-0" />
                     <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium text-left leading-relaxed">
                        Chuyển đúng số tiền và nội dung để hệ thống tự động xác nhận ngay sau khi nhận tiền.
                     </p>
                  </div>

                  <div className={`p-3 rounded-xl text-center font-bold text-sm border transition-colors duration-500 ${
                    paymentStatus === 'expired' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-400/10 dark:text-rose-400 dark:border-rose-400/20' :
                    'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10'
                  }`}>
                    {paymentStatus === 'expired' && 'Đơn hàng đã hết hạn'}
                    {paymentStatus === 'waiting' && `Đang chờ thanh toán · ${String(Math.floor(timeLeft / 60_000)).padStart(2, '0')}:${String(Math.floor((timeLeft % 60_000) / 1000)).padStart(2, '0')}`}
                  </div>

                  {paymentStatus === 'waiting' && (
                     <div className="space-y-2 pt-2" id="manual-payment-verification-section">
                        <button
                           onClick={() => handleVerifyPayment(false)}
                           disabled={verifying}
                           className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 active:scale-[0.99] transition-all text-xs uppercase tracking-wider disabled:opacity-60"
                        >
                           {verifying ? (
                              <>
                                 <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                 Đang quét ngân hàng qua SePay...
                              </>
                           ) : (
                              <>
                                 <RefreshCw className="w-4 h-4 text-white" />
                                 Tôi đã thanh toán (Kiểm tra ngay)
                              </>
                           )}
                        </button>
                     </div>
                  )}
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

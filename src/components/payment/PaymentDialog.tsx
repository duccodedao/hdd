import React, { useState, useEffect } from 'react';
import { X, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
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
  };
  onPaid: () => void;
}

export const PaymentDialog = ({ isOpen, onClose, item, onPaid }: PaymentDialogProps) => {
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'paid' | 'expired' | 'error'>('waiting');
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60_000);

const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let interval: any;
    let uiInterval: any;
    if (isOpen && item && user) {
      setPaymentStatus('waiting');
      setTimeLeft(15 * 60_000);
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
                } else {
                  setTimeLeft(left);
                }
              }, 1000);

              interval = setInterval(async () => {
                const left = deadline - Date.now();
                if (left <= 0) {
                  clearInterval(interval);
                  setPaymentStatus('expired');
                  return;
                }

                const invDoc = await getDoc(doc(db, 'invoices', data.id));
                if (invDoc.exists() && invDoc.data().status === 'paid') {
                  clearInterval(interval);
                  setPaymentStatus('paid');
                  toast.success('Thanh toán thành công!');
                  setTimeout(() => {
                    onPaid();
                    onClose();
                  }, 2000);
                }
              }, 3000);
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
      if (interval) clearInterval(interval);
      if (uiInterval) clearInterval(uiInterval);
    };
  }, [isOpen, item?.id, user?.uid, retryTrigger]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center text-center space-y-6">
             <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
                <Zap size={40} className="fill-indigo-600 animate-pulse" />
             </div>
             
             <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Thanh toán dịch vụ</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Quét mã VietQR để kích hoạt tiện ích tức thì.</p>
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
             ) : (
               <div className="w-full space-y-6">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-white/5">
                     <img 
                       src={`https://qr.sepay.vn/img?acc=STB_060269666879&bank=SACOMBANK&amount=${invoice.totalAmount}&des=${invoice.paymentDetails.referenceCode}`}
                       alt="VietQR"
                       className="w-full aspect-square rounded-2xl shadow-sm border border-slate-200 dark:border-white/10"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tiền</p>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{invoice.totalAmount.toLocaleString()}đ</p>
                     </div>
                     <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nội dung</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{invoice.paymentDetails.referenceCode}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                     <AlertCircle size={20} className="text-amber-500 shrink-0" />
                     <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium text-left leading-relaxed">
                        Chuyển đúng số tiền và nội dung để hệ thống tự động xác nhận ngay sau khi nhận tiền.
                     </p>
                  </div>

                  <div className={`p-4 rounded-xl text-center font-bold text-sm border transition-colors duration-500 ${
                    paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                    paymentStatus === 'expired' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' :
                    'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10'
                  }`}>
                    {paymentStatus === 'paid' && 'Thanh toán thành công'}
                    {paymentStatus === 'expired' && 'Đơn hàng đã hết hạn'}
                    {paymentStatus === 'waiting' && `Đang chờ thanh toán · ${String(Math.floor(timeLeft / 60_000)).padStart(2, '0')}:${String(Math.floor((timeLeft % 60_000) / 1000)).padStart(2, '0')}`}
                  </div>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

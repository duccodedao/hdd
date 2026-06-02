import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentTransactionStatusProps {
  invoiceId?: string; // Standard direct tracking of a single invoice
  onPaid?: (invoiceData: any) => void; // Callback when an invoice is fully paid
  showDetails?: boolean; // Toggle displaying visual status panel
  className?: string;
}

export const PaymentTransactionStatus = ({
  invoiceId,
  onPaid,
  showDetails = true,
  className = ''
}: PaymentTransactionStatusProps) => {
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep track of shown alerts in this session to prevent duplicate toasts
  const [toastShown, setToastShown] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);

    // If an invoiceId is explicitly provided, watch that specific doc
    if (invoiceId) {
      const unsub = onSnapshot(
        doc(db, 'invoices', invoiceId),
        (docSnap) => {
          setLoading(false);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const inv = { id: docSnap.id, ...data };
            setInvoice(inv);

            if (data.status === 'paid' && !toastShown[docSnap.id]) {
              setToastShown(prev => ({ ...prev, [docSnap.id]: true }));
              toast.success('Hệ thống đã nhận được thanh toán! Xác nhận dịch vụ thành công.', {
                duration: 5000,
                icon: '🎉'
              });
              if (onPaid) {
                onPaid(inv);
              }
            }
          } else {
            setError('Không tìm thấy thông tin hóa đơn');
          }
        },
        (err) => {
          console.error("Error listening to invoice:", err);
          setError('Không thể kết nối máy chủ dữ liệu Real-time');
          setLoading(false);
        }
      );

      return () => unsub();
    } 
    // If no specific invoiceId but user is logged in, listen to the user's active invoices
    else if (user?.uid) {
      const q = query(
        collection(db, 'invoices'),
        where('userId', '==', user.uid)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          setLoading(false);
          const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          
          // Sort by creation time (descending)
          const sorted = docs.sort((a: any, b: any) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return db - da;
          });

          // Grab latest invoice
          const latest = sorted[0];
          if (latest) {
            setInvoice(latest);

            // Handle transition to paid
            if ((latest as any).status === 'paid' && !toastShown[latest.id]) {
              setToastShown(prev => ({ ...prev, [latest.id]: true }));
              toast.success('Thanh toán thành công! Giao dịch của bạn đã được xác nhận lập tức.', {
                duration: 5000,
                icon: '🚀'
              });
              if (onPaid) {
                onPaid(latest);
              }
            }
          } else {
            setInvoice(null);
          }
        },
        (err) => {
          console.error("Error listening to user invoices:", err);
          setError('Không thể tải lịch sử giao dịch trực tuyến');
          setLoading(false);
        }
      );

      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [invoiceId, user?.uid]);

  if (!showDetails) {
    return null;
  }

  return (
    <div className={`p-5 rounded-[2rem] border transition-all duration-300 ${
      error ? 'bg-red-50/50 border-red-200 dark:bg-red-500/5 dark:border-red-500/10' :
      loading ? 'bg-slate-50/50 border-slate-200 dark:bg-white/5 dark:border-white/5' :
      invoice?.status === 'paid' ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/10' :
      invoice?.status === 'expired' ? 'bg-slate-100/80 border-slate-300 dark:bg-zinc-900/80 dark:border-white/10' : 
      'bg-amber-50/50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/10'
    } ${className}`} id="payment-transaction-status-wrapper">
      
      {loading ? (
        <div className="flex items-center justify-between gap-3" id="payment-status-loading">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Đang đồng bộ hóa</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Đang kết nối cổng thanh toán...</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400" id="payment-status-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Lỗi hệ thống</p>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">{error}</p>
          </div>
        </div>
      ) : invoice ? (
        <div className="space-y-3" id={`payment-status-invoice-${invoice.id}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {invoice.status === 'paid' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : invoice.status === 'expired' ? (
                <AlertCircle className="w-6 h-6 text-slate-400 shrink-0" />
              ) : (
                <Clock className="w-6 h-6 text-amber-500 animate-pulse shrink-0" />
              )}
              <div>
                <p className={`text-xs font-black uppercase tracking-wider ${
                  invoice.status === 'paid' ? 'text-emerald-700 dark:text-emerald-400' :
                  invoice.status === 'expired' ? 'text-slate-600 dark:text-zinc-400' :
                  'text-amber-800 dark:text-amber-400'
                }`}>
                  {invoice.status === 'paid' ? 'Giao dịch thành công' :
                   invoice.status === 'expired' ? 'Đơn hàng hết hạn' :
                   'Đang chờ chuyển khoản'}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                  Mã đơn hàng: {invoice.id}
                </p>
              </div>
            </div>
            
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' :
              invoice.status === 'expired' ? 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300' :
              'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
            }`}>
              {invoice.status === 'paid' ? 'Đã duyệt' : invoice.status === 'expired' ? 'Hủy' : 'Chờ khách'}
            </span>
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider space-y-1 bg-white/40 dark:bg-black/10 p-3 rounded-2xl border border-slate-100 dark:border-black/5">
            <div className="flex justify-between">
              <span>Sản phẩm:</span>
              <span className="text-slate-700 dark:text-zinc-300 uppercase tracking-widest">
                {invoice.items && invoice.items.length > 0 
                  ? invoice.items.map((i: any) => i.name).join(', ') 
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Số tiền:</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {invoice.totalAmount ? invoice.totalAmount.toLocaleString() : '0'}đ
              </span>
            </div>
            {invoice.paymentDetails?.referenceCode && (
              <div className="flex justify-between">
                <span>Nội dung chuyển khoản:</span>
                <span className="text-slate-800 dark:text-slate-200 select-all">
                  {invoice.paymentDetails.referenceCode}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-2" id="payment-status-none">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
            Chưa có giao dịch thanh toán nào được ghi nhận.
          </p>
        </div>
      )}
    </div>
  );
};

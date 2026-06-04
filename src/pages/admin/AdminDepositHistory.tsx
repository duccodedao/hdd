import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, onSnapshot, doc, updateDoc, getDoc, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Landmark, ArrowUpRight, Search, CheckSquare, XCircle, AlertCircle, RefreshCw, Filter } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDepositHistory() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subType, setSubType] = useState<"deposits" | "withdrawals">("deposits");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "cancelled">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to deposits (invoices)
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to withdrawals
    const unsubWithdrawals = onSnapshot(collection(db, "withdrawals"), (snap) => {
      setWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubInvoices();
      unsubWithdrawals();
    };
  }, []);

  // Handle Manual Approval of Deposits
  const handleApproveDeposit = async (invoiceId: string, userId: string, amount: number) => {
    if (!confirm(`Bạn có chắc chắn muốn DUYỆT THỦ CÔNG đơn nạp này? Tài khoản của người dùng sẽ lập tức được cộng +${amount.toLocaleString()}đ.`)) return;

    try {
      const userRef = doc(db, "users", userId);
      const invoiceRef = doc(db, "invoices", invoiceId);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("Người dùng không khả dụng trong hệ thống.");
        }

        const currentBalance = userSnap.data().balance || 0;
        transaction.update(userRef, {
          balance: currentBalance + amount
        });

        transaction.update(invoiceRef, {
          status: "completed",
          updatedAt: Timestamp.now(),
          approvedManually: true
        });
      });

      toast.success("Đã phê duyệt đơn nạp tiền thành công!");
    } catch (error: any) {
      console.error(error);
      toast.error("Lỗi duyệt nạp tiền: " + error.message);
    }
  };

  // Handle Manual Rejection of Deposits
  const handleCancelDeposit = async (invoiceId: string) => {
    if (!confirm("Bạn có đồng ý HỦY đơn nạp này không?")) return;

    try {
      const invoiceRef = doc(db, "invoices", invoiceId);
      await updateDoc(invoiceRef, {
        status: "cancelled",
        updatedAt: Timestamp.now()
      });
      toast.success("Đã hủy đơn nạp tiền.");
    } catch (error: any) {
      toast.error("Lỗi hủy đơn: " + error.message);
    }
  };

  // Handle Manual Approval of Withdrawal Request
  const handleApproveWithdrawal = async (withdrawalId: string, userId: string, amount: number) => {
    if (!confirm(`Phê duyệt RÚT TIỀN THÀNH CÔNG cho yêu cầu này? Số dư ví của người dùng đã bị trừ khi gửi yêu cầu.`)) return;

    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      await updateDoc(withdrawalRef, {
        status: "completed",
        updatedAt: Timestamp.now()
      });
      toast.success("Đã hoàn tất thanh toán rút tiền!");
    } catch (error: any) {
      toast.error("Lỗi cập nhật: " + error.message);
    }
  };

  // Handle Manual Rejection of Withdrawal Request (Restores user balance)
  const handleDeclineWithdrawal = async (withdrawalId: string, userId: string, amount: number) => {
    if (!confirm(`Từ chối yêu cầu rút tiền cực này? Số tiền ${amount.toLocaleString()}đ sẽ hoàn trả lại vào số dư ví của khách hàng.`)) return;

    try {
      const userRef = doc(db, "users", userId);
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("Người dùng không tồn tại.");
        }

        const currentBalance = userSnap.data().balance || 0;
        transaction.update(userRef, {
          balance: currentBalance + amount
        });

        transaction.update(withdrawalRef, {
          status: "cancelled",
          updatedAt: Timestamp.now(),
          rejectReason: "Quản trị viên từ chối"
        });
      });

      toast.success("Đã từ chối rút tiền và hoàn phí thành công!");
    } catch (error: any) {
      console.error(error);
      toast.error("Lỗi từ chối: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-bold uppercase tracking-widest">Đang tải lịch sử giao dịch...</p>
      </div>
    );
  }

  // Filter Deposits
  const filteredDeposits = invoices.filter(inv => {
    const isSucceeded = inv.status === "completed" || inv.status === "paid";
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "completed" && isSucceeded) ||
      (statusFilter === "pending" && inv.status === "pending") ||
      (statusFilter === "cancelled" && inv.status !== "pending" && !isSucceeded);

    const matchesSearch = 
      inv.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.userId?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  }).sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));

  // Filter Withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "completed" && (w.status === "completed" || w.status === "approved")) ||
      (statusFilter === "pending" && w.status === "pending") ||
      (statusFilter === "cancelled" && w.status === "cancelled");

    const matchesSearch = 
      w.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.userId?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  }).sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Header controls layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub tabs */}
        <div className="inline-flex bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-1 rounded-2xl">
          <button
            onClick={() => { setSubType("deposits"); setStatusFilter("all"); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-xl flex items-center gap-2 tracking-wider ${
              subType === "deposits"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Landmark size={15} /> Lịch sử Nạp Tiền
          </button>
          <button
            onClick={() => { setSubType("withdrawals"); setStatusFilter("all"); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-xl flex items-center gap-2 tracking-wider ${
              subType === "withdrawals"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <ArrowUpRight size={15} /> Yêu cầu Rút Tiền
          </button>
        </div>

        {/* Global Search and general status filters */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-lg w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo email, ID giao dịch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-indigo-600 dark:text-zinc-200"
          >
            <option value="all">Lọc toàn bộ</option>
            <option value="completed">Thành công</option>
            <option value="pending">Đang duyệt</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {subType === "deposits" ? (
        /* Deposits list presentation - NO sticky actions, fully scrollable */
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            {filteredDeposits.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertCircle className="w-8 h-8 opacity-20 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Không tìm thấy giao dịch nạp phù hợp</p>
              </div>
            ) : (
              <table className="w-full text-left font-sans text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10 pb-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <td className="py-4 px-3">ID Đơn</td>
                    <td className="py-4 px-3">Người nạp (Email)</td>
                    <td className="py-4 px-3 text-right">Số tiền nạp</td>
                    <td className="py-4 px-3">Nội dung Chuyển Khoản</td>
                    <td className="py-4 px-3">Thời gian</td>
                    <td className="py-4 px-3 text-center">Trạng thái</td>
                    <td className="py-4 px-3 text-right">Hành động</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredDeposits.map((d) => {
                    const isSucceeded = d.status === "completed" || d.status === "paid";
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-zinc-300">
                        <td className="py-4 px-3 font-mono font-bold text-slate-900 dark:text-white">{d.id}</td>
                        <td className="py-4 px-3 truncate max-w-[150px]" title={d.userEmail || d.userId}>{d.userEmail || d.userId || "N/A"}</td>
                        <td className="py-4 px-3 text-right font-black text-emerald-600">{d.totalAmount?.toLocaleString()}đ</td>
                        <td className="py-4 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{d.paymentDetails?.referenceCode || "N/A"}</td>
                        <td className="py-4 px-3 text-slate-400">
                          {d.createdAt?.toMillis ? new Date(d.createdAt.toMillis()).toLocaleString() : "Hôm nay"}
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isSucceeded 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-450" 
                              : d.status === "pending"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}>
                            {isSucceeded ? "Thành công" : d.status === "pending" ? "Đang duyệt" : "Đã hủy"}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          {d.status === "pending" ? (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleApproveDeposit(d.id, d.userId, d.totalAmount)}
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg flex items-center justify-center cursor-pointer"
                                title="Phê duyệt"
                              >
                                <CheckSquare size={14} />
                              </button>
                              <button
                                onClick={() => handleCancelDeposit(d.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg flex items-center justify-center cursor-pointer"
                                title="Từ chối"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Đã chốt sổ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Withdrawals list presentation - Fully scrollable, NO sticky actions */
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            {filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertCircle className="w-8 h-8 opacity-20 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Chưa phát sinh yêu cầu rút tiền</p>
              </div>
            ) : (
              <table className="w-full text-left font-sans text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10 pb-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <td className="py-4 px-3">Mã Rút</td>
                    <td className="py-4 px-3">Người rút (Email)</td>
                    <td className="py-4 px-3">Thông tin nhận (Ngân hàng)</td>
                    <td className="py-4 px-3 text-right">Số tiền rút</td>
                    <td className="py-4 px-3">Thời gian</td>
                    <td className="py-4 px-3 text-center">Trạng thái</td>
                    <td className="py-4 px-3 text-right">Hành động</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredWithdrawals.map((w) => {
                    const isSucceeded = w.status === "completed" || w.status === "approved";
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-zinc-300">
                        <td className="py-4 px-3 font-mono font-bold text-slate-900 dark:text-white">{w.id}</td>
                        <td className="py-4 px-3 truncate max-w-[150px]" title={w.userEmail || w.userId}>{w.userEmail || w.userId || "N/A"}</td>
                        <td className="py-4 px-3">
                          <p className="font-extrabold text-indigo-600 dark:text-indigo-400">{w.bankName || "N/A"}</p>
                          <p className="text-[10px] font-mono text-slate-400">{w.bankAccount} - {w.ownerName}</p>
                        </td>
                        <td className="py-4 px-3 text-right font-black text-rose-500">-{w.amount?.toLocaleString()}đ</td>
                        <td className="py-4 px-3 text-slate-400">
                          {w.createdAt?.toMillis ? new Date(w.createdAt.toMillis()).toLocaleString() : "Hôm nay"}
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isSucceeded 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-450" 
                              : w.status === "pending"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}>
                            {isSucceeded ? "Hoàn tất" : w.status === "pending" ? "Đang chờ" : "Đã hủy"}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          {w.status === "pending" ? (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleApproveWithdrawal(w.id, w.userId, w.amount)}
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-440 rounded-lg flex items-center justify-center cursor-pointer"
                                title="Đã chuyển tiền"
                              >
                                <CheckSquare size={14} />
                              </button>
                              <button
                                onClick={() => handleDeclineWithdrawal(w.id, w.userId, w.amount)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-450 rounded-lg flex items-center justify-center cursor-pointer"
                                title="Không duyệt và Trả Tiền"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

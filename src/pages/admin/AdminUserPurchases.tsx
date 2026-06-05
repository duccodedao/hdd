import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ShoppingBag, Search, AlertCircle, RefreshCw, Layers } from "lucide-react";

export default function AdminUserPurchases() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTx = onSnapshot(
      query(collection(db, "transactions"), orderBy("createdAt", "desc")),
      (snap) => {
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    return () => unsubTx();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-bold uppercase tracking-widest">Đang tải lịch sử mua hàng...</p>
      </div>
    );
  }

  // Filter Transactions - Only purchases (type = purchase) or document sales
  const purchasesOnly = transactions.filter(tx => tx.type === "purchase" || tx.type === "document_purchase" || !tx.type);

  const filteredPurchases = purchasesOnly.filter(p => {
    const matchesSearch = 
      p.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.userId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = 
      productFilter === "all" ||
      (productFilter === "ai_tool" && p.productName?.toLowerCase().includes("ai")) || // typical indicators or exact matching
      (productFilter === "document" && !p.productName?.toLowerCase().includes("ai"));

    return matchesSearch && matchesType;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Search and control filter */}
      <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm người mua, tên tài liệu, ID đơn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-3 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-indigo-600 dark:text-zinc-200"
        >
          <option value="all">Tất cả sản phẩm</option>
          <option value="ai_tool">Chỉ AI Tools</option>
          <option value="document">Chỉ Tài liệu / Doc</option>
        </select>
      </div>

      {/* Main Grid display - Horizontal scrollable block */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-8 h-8 opacity-20 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">Chưa có giao dịch mua hàng nào được ghi nhận</p>
            </div>
          ) : (
            <table className="w-full text-left font-sans text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 pb-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <td className="py-4 px-3">Mã GD Mua</td>
                  <td className="py-4 px-3">Khách hàng (Email)</td>
                  <td className="py-4 px-3">Sản phẩm</td>
                  <td className="py-4 px-3 text-right">Giá tiền trừ</td>
                  <td className="py-4 px-3">Thời gian</td>
                  <td className="py-4 px-3 text-right">Trạng thái</td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-zinc-300">
                    <td className="py-4 px-3 font-mono font-bold text-slate-900 dark:text-white">{p.id}</td>
                    <td className="py-4 px-3 truncate max-w-[150px]" title={p.userEmail || p.userId}>{p.userEmail || p.userName || "N/A"}</td>
                    <td className="py-4 px-3 font-semibold text-slate-800 dark:text-zinc-150">
                      {p.productName || p.productId || "Sản phẩm ẩn"}
                    </td>
                    <td className="py-4 px-3 text-right font-bold text-slate-900 dark:text-white">
                      -{p.amount?.toLocaleString()}đ
                    </td>
                    <td className="py-4 px-3 text-slate-400">
                      {p.createdAt?.toMillis ? new Date(p.createdAt.toMillis()).toLocaleString() : "N/A"}
                    </td>
                    <td className="py-4 px-3 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        Hoàn tất
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}

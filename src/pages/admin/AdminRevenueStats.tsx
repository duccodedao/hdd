import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Landmark, TrendingUp, ShoppingBag, Users, Wallet, RefreshCw, BarChart3, PieChartIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";

export default function AdminRevenueStats() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync invoices
    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync transactions
    const unsubTx = onSnapshot(collection(db, "transactions"), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync users
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubInvoices();
      unsubTx();
      unsubUsers();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-bold uppercase tracking-widest">Đang tính toán thống kê tài chính...</p>
      </div>
    );
  }

  // Calculations
  const completedDeposits = invoices.filter(inv => inv.status === "completed" || inv.status === "paid");
  const totalDepositAmount = completedDeposits.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  const purchaseTxs = transactions.filter(tx => tx.type === "purchase" || tx.type === "document_purchase");
  const totalPurchaseAmount = purchaseTxs.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalUserBalance = users.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  // Group deposits by date for line/area chart (last 7 days helper)
  const getDailyStatsData = () => {
    const dailyMap: Record<string, { date: string; "Tiền nạp": number; "Mua hàng": number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      dailyMap[label] = { date: label, "Tiền nạp": 0, "Mua hàng": 0 };
    }

    // Populate deposits
    completedDeposits.forEach(inv => {
      let dateObj: Date | null = null;
      if (inv.createdAt?.toMillis) dateObj = new Date(inv.createdAt.toMillis());
      else if (inv.createdAt) dateObj = new Date(inv.createdAt);
      
      if (dateObj) {
        const label = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        if (dailyMap[label]) {
          dailyMap[label]["Tiền nạp"] += (inv.totalAmount || 0);
        }
      }
    });

    // Populate purchases
    purchaseTxs.forEach(tx => {
      let dateObj: Date | null = null;
      if (tx.createdAt?.toMillis) dateObj = new Date(tx.createdAt.toMillis());
      else if (tx.createdAt) dateObj = new Date(tx.createdAt);
      
      if (dateObj) {
        const label = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        if (dailyMap[label]) {
          dailyMap[label]["Mua hàng"] += (tx.amount || 0);
        }
      }
    });

    return Object.values(dailyMap);
  };

  const chartData = getDailyStatsData();

  // Pie chart of product split
  const getProductSplit = () => {
    const counts: Record<string, number> = {};
    purchaseTxs.forEach(tx => {
      const name = tx.productType === "ai_tool" ? "AI Tools" : "Tài liệu / File";
      counts[name] = (counts[name] || 0) + (tx.amount || 0);
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const pieData = getProductSplit();
  const COLORS = ["#3d5afe", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* 4 Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Deposits */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng tiền nạp</p>
            <p className="text-xl font-black text-slate-850 dark:text-zinc-150">{totalDepositAmount.toLocaleString()} VNĐ</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        {/* Total Spent Purchases */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doanh thu mua hàng</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalPurchaseAmount.toLocaleString()} VNĐ</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Current User Balances */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng số dư người dùng</p>
            <p className="text-xl font-black text-amber-600">{totalUserBalance.toLocaleString()} VNĐ</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Active Members count */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng thành viên site</p>
            <p className="text-xl font-black text-slate-850 dark:text-zinc-100">{users.length} Users</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial Flow area chart */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-455" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Dòng Tiền Hệ Thống (7 Ngày Gần Nhất)</h4>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d5afe" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3d5afe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="Tiền nạp" stroke="#10b981" fillOpacity={1} fill="url(#colorDeposit)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="Mua hàng" stroke="#3d5afe" fillOpacity={1} fill="url(#colorPurchase)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie product distribution split */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-4 h-4 text-slate-455" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Phân Phối Doanh Thu</h4>
            </div>
            
            {pieData.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                Chưa phát sinh giao dịch mua hàng
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value.toLocaleString()}đ`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            {pieData.map((d, index) => (
              <div key={d.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-500 font-medium">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{d.value.toLocaleString()}đ</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

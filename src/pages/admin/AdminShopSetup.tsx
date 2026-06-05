import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Settings, Landmark, ShieldCheck, RefreshCw, ShoppingBag, Globe } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminShopSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Shop Brand States
  const [shopName, setShopName] = useState("Hệ thống Mini-Ecosystem Pro");
  const [shopSlogan, setShopSlogan] = useState("Nền tảng cung cấp giải pháp công cụ AI và hỗ trợ thông minh bậc nhất");
  const [supportEmail, setSupportEmail] = useState("support@system.com");
  
  // Banking parameters (updates the User Wallet Page dynamically in real-time)
  const [bankingConfig, setBankingConfig] = useState({
    bankCode: "MB",
    bankName: "Ngân hàng Quân Đội (MB)",
    bankAccount: "00010302003",
    ownerName: "Vũ Minh Đức"
  });

  // Load configuration from database
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const sysSnap = await getDoc(doc(db, "settings", "system"));
        if (sysSnap.exists()) {
          const data = sysSnap.data();
          if (data.bankingConfig) {
            setBankingConfig({
              bankCode: data.bankingConfig.bankCode || "MB",
              bankName: data.bankingConfig.bankName || "Ngân hàng Quân Đội (MB)",
              bankAccount: data.bankingConfig.bankAccount || "00010302003",
              ownerName: data.bankingConfig.ownerName || "Vũ Minh Đức"
            });
          }
          if (data.shopConfig) {
            setShopName(data.shopConfig.shopName || "Hệ thống Mini-Ecosystem Pro");
            setShopSlogan(data.shopConfig.shopSlogan || "Nền tảng cung cấp giải pháp công cụ AI và hỗ trợ thông minh bậc nhất");
            setSupportEmail(data.shopConfig.supportEmail || "support@system.com");
          }
        }
      } catch (err) {
        console.error("Error loading config inside Shop Setup:", err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Save changes to database
  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Đang lưu trữ thay đổi Cấu hình...");

    try {
      await setDoc(doc(db, "settings", "system"), {
        bankingConfig: {
          bankCode: bankingConfig.bankCode,
          bankName: bankingConfig.bankName,
          bankAccount: bankingConfig.bankAccount,
          ownerName: bankingConfig.ownerName
        },
        shopConfig: {
          shopName,
          shopSlogan,
          supportEmail
        }
      }, { merge: true });

      toast.success("Cập nhật Cấu hình Cửa hàng (Shop Setup) thành công!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi đồng bộ dữ liệu: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-bold uppercase tracking-widest">Đang kết nối trung tâm cấu hình...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl space-y-6"
    >
      <form onSubmit={handleSaveConfigs} className="space-y-6">
        
        {/* Section 1: Brand details */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Thông tin Thương hiệu & Cửa hàng</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tên Cửa hàng (Shop Name)</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Hỗ trợ kĩ thuật</label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Slogan / Ghi chú trang chủ</label>
              <textarea
                rows={2}
                value={shopSlogan}
                onChange={(e) => setShopSlogan(e.target.value)}
                className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: MB Bank gateway details */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">Cổng Nhận Thanh Toán (Bank Gate Setup)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tên Ngân hàng</label>
              <input
                type="text"
                required
                value={bankingConfig.bankName}
                onChange={(e) => setBankingConfig({ ...bankingConfig, bankName: e.target.value })}
                className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mã ngân hàng (VietQR standard)</label>
              <input
                type="text"
                required
                value={bankingConfig.bankCode}
                onChange={(e) => setBankingConfig({ ...bankingConfig, bankCode: e.target.value })}
                className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
                placeholder="Ví dụ: MB, VCB..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Số tài khoản nhận</label>
              <input
                type="text"
                required
                value={bankingConfig.bankAccount}
                onChange={(e) => setBankingConfig({ ...bankingConfig, bankAccount: e.target.value })}
                className="w-full font-mono text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chủ tài khoản (Người thụ hưởng)</label>
              <input
                type="text"
                required
                value={bankingConfig.ownerName}
                onChange={(e) => setBankingConfig({ ...bankingConfig, ownerName: e.target.value })}
                className="w-full text-xs px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:border-indigo-600 focus:outline-none dark:text-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* Form action triggers */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/10 flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Lưu thay đổi...
              </>
            ) : (
              <>Lưu Cấu Hình</>
            )}
          </button>
        </div>

      </form>
    </motion.div>
  );
}

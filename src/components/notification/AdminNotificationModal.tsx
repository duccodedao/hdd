import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Users, Shield, User, Loader2 } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { logActivity, ActivityType } from '../../services/activityService';
import toast from 'react-hot-toast';

interface AdminNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserListItem {
  uid: string;
  displayName?: string;
  email: string;
  role: string;
}

export default function AdminNotificationModal({ isOpen, onClose }: AdminNotificationModalProps) {
  const { userData } = useAuthStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'role' | 'user'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && target === 'user' && users.length === 0) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          const list: UserListItem[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
              uid: docSnap.id,
              displayName: data.displayName,
              email: data.email || '',
              role: data.role || 'user'
            });
          });
          setUsers(list);
        } catch (err: any) {
          console.error("Error fetching admin users:", err);
          toast.error("Không thể tải danh sách người dùng.");
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen, target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung!");
      return;
    }

    if (target !== 'all' && !targetValue) {
      toast.error("Vui lòng hoàn tất cấu hình đối tượng nhận!");
      return;
    }

    setSubmitting(true);
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const notifData = {
        id: notificationId,
        title: title.trim(),
        message: message.trim(),
        target,
        targetValue: target === 'all' ? '' : targetValue,
        createdAt: Date.now(),
        senderName: userData?.displayName || 'Administrator'
      };

      await setDoc(doc(db, 'notifications', notificationId), notifData);
      
      // Log administrative dispatch
      await logActivity(
        ActivityType.SECURITY_CHANGE,
        `Đã gửi thông báo mới: "${title.trim()}" (${target === 'all' ? 'Tất cả' : target === 'role' ? `Vai trò ${targetValue}` : 'Cá nhân'})`
      );

      toast.success("Đã phát hành thông báo thành công!");
      
      // Reset fields
      setTitle('');
      setMessage('');
      setTarget('all');
      setTargetValue('');
      onClose();
    } catch (err: any) {
      console.error("Error sending notification:", err);
      toast.error(`Gửi thông báo thất bại: ${err?.message || "Unknown Error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 dark:bg-zinc-950/70 backdrop-blur-sm">
          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/20 shrink-0">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Send className="w-4 h-4 active:scale-95 transition-transform" />
                <h3 className="font-display font-medium text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                  Phát hành thông báo mới
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Target Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  Đối tượng mục tiêu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTarget('all'); setTargetValue(''); }}
                    className={`py-2 px-3 rounded-lg text-[11px] font-semibold border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      target === 'all'
                        ? 'bg-indigo-50 border-indigo-250 dark:bg-indigo-500/10 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                        : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTarget('role'); setTargetValue(''); }}
                    className={`py-2 px-3 rounded-lg text-[11px] font-semibold border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      target === 'role'
                        ? 'bg-indigo-50 border-indigo-250 dark:bg-indigo-500/10 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                        : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Theo Vai trò
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTarget('user'); setTargetValue(''); }}
                    className={`py-2 px-3 rounded-lg text-[11px] font-semibold border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      target === 'user'
                        ? 'bg-indigo-50 border-indigo-250 dark:bg-indigo-500/10 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                        : 'bg-transparent border-slate-200 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Cá nhân
                  </button>
                </div>
              </div>

              {/* Target Description */}
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-black/10 px-3.5 py-2.5 rounded-xl border border-slate-200/55 dark:border-white/[0.03] leading-relaxed">
                {target === 'all' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                    <strong>Cộng đồng:</strong> Thông báo sẽ được chuyển tiếp công khai tới toàn bộ thành viên hệ thống.
                  </span>
                )}
                {target === 'role' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <strong>Phân quyền:</strong> Chỉ người dùng có chức danh phù hợp mới có quyền truy xuất đọc thư.
                  </span>
                )}
                {target === 'user' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <strong>Bảo mật:</strong> Gửi đích danh trực tiếp, chỉ tài khoản được chỉ định mới thấy được.
                  </span>
                )}
              </div>

              {/* Dynamic Target Values */}
              {target === 'role' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest">
                    Chọn vai trò người nhận
                  </label>
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-zinc-200"
                  >
                    <option value="" className="text-slate-550 bg-white dark:bg-zinc-900 dark:text-zinc-400">-- Chọn vai trò nhận thông báo --</option>
                    <option value="admin" className="text-slate-900 bg-white dark:bg-zinc-900 dark:text-zinc-200">Quản lý viên (Admin)</option>
                    <option value="user" className="text-slate-900 bg-white dark:bg-zinc-900 dark:text-zinc-200">Thành viên thường (User)</option>
                  </select>
                </div>
              )}

              {target === 'user' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest">
                    Chọn tài khoản nhận
                  </label>
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 justify-center py-2 text-xs text-slate-550">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  ) : (
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-zinc-200"
                    >
                      <option value="" className="text-slate-550 bg-white dark:bg-zinc-900 dark:text-zinc-400">-- Chọn người dùng --</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid} className="text-slate-900 bg-white dark:bg-zinc-900 dark:text-zinc-200">
                          {u.displayName || 'Tên ẩn danh'} ({u.email}) - [{u.role}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  Tiêu đề thông báo
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề hoặc chủ đề..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  Nội dung thông điệp
                </label>
                <textarea
                  rows={4}
                  placeholder="Soạn thảo thông điệp hoặc nội dung báo cáo cần gửi gửi..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-98"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang phát...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Phát truyền
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
export { AdminNotificationModal };

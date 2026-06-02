import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, Lock, Laptop, Smartphone, HelpCircle, LogOut, CheckCircle2, UserCircle, Globe, Calendar, RefreshCw, AlertTriangle, X, Check, ShieldAlert, CheckSquare, Square, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import AppLogo from '../../components/ui/AppLogo';
import { useConfirmStore } from '../../store/confirmStore';
import { useAuthStore } from '../../store/authStore';
import { approveSession, logoutSessionAndBlockIp, logoutAllOtherSessions, getOrCreateSessionId } from '../../services/sessionSecurityService';

export interface AdminSession {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  device: string;
  ip: string;
  location: string;
  createdAt: number;
  lastActiveAt: number;
  active: boolean;
  approved?: boolean;
}

export default function AdminSecuritySessions() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { openConfirm } = useConfirmStore();
  const { userData } = useAuthStore();

  // For the custom logout IP ban modal
  const [revokeTargetSession, setRevokeTargetSession] = useState<AdminSession | null>(null);
  const [shouldBlockIp, setShouldBlockIp] = useState(false);
  const [customBlockReason, setCustomBlockReason] = useState('Đăng xuất từ xa / Chặn từ bảo mật quản lý thiết bị');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'admin_sessions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: AdminSession[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AdminSession);
      });
      setSessions(list);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to sessions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleSelectAll = () => {
    const list = filteredSessions.filter(s => !s.active);
    if (selectedIds.length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: 'Xóa hàng loạt lịch sử?',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi lịch sử phiên đã chọn?`,
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
      variant: 'danger',
      onConfirm: async () => {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, 'admin_sessions', id));
        });
        await batch.commit();
        setSelectedIds([]);
        toast.success(`Đã xóa ${selectedIds.length} lịch sử phiên`);
      }
    });
  };

  const handleLogoutAllOtherSessions = () => {
    if (!userData?.email) return;
    const currentSessionId = getOrCreateSessionId();

    openConfirm({
      title: 'Đăng xuất thiết bị khác?',
      message: 'Hành động này sẽ ĐĂNG XUẤT tất cả thiết bị và phiên làm việc khác của tài khoản admin này, ngoại trừ phiên hiện tại trên màn hình này. Bạn chắc chắn chứ?',
      confirmText: 'Đăng xuất tất cả',
      cancelText: 'Quay lại',
      onConfirm: async () => {
        try {
          await logoutAllOtherSessions(userData.email, currentSessionId);
          toast.success("Đã đăng xuất toàn bộ thiết bị khác của bạn thành công!");
        } catch (error: any) {
          toast.error("Gặp lỗi khi xử lý: " + error.message);
        }
      }
    });
  };

  const handleRevokeSession = (session: AdminSession) => {
    setRevokeTargetSession(session);
    setShouldBlockIp(false);
    setCustomBlockReason(`Đăng xuất từ xa do phát hiện xung đột bảo mật thiết bị [IP: ${session.ip}]`);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTargetSession) return;
    try {
      await logoutSessionAndBlockIp(
        revokeTargetSession.id,
        shouldBlockIp ? revokeTargetSession.ip : undefined,
        shouldBlockIp ? customBlockReason : undefined,
        userData?.displayName || 'Admin Security System'
      );
      toast.success(`Đã đăng xuất thiết bị ${revokeTargetSession.device} thành công!${shouldBlockIp ? ' Đồng thời đã thêm IP ' + revokeTargetSession.ip + ' vào danh sách đen.' : ''}`);
      setRevokeTargetSession(null);
    } catch (err: any) {
      toast.error('Có lỗi xảy ra: ' + (err?.message || 'Không thể đăng xuất.'));
    }
  };

  const handleApproveSession = async (session: AdminSession) => {
    try {
      await approveSession(session.id);
      toast.success(`Đã duyệt cho phép thiết bị ${session.device} (IP: ${session.ip}) hoạt động.`);
    } catch (err: any) {
      toast.error('Không phê duyệt được thiết bị: ' + (err?.message || err));
    }
  };

  const handleDeleteSessionRecord = (id: string) => {
    openConfirm({
      title: 'Xóa lịch sử phiên?',
      message: 'Hành động này sẽ xóa vĩnh viễn dòng lịch sử phiên đăng nhập này khỏi danh sách giám sát. Tiếp tục?',
      confirmText: 'Xóa lịch sử',
      cancelText: 'Quay lại',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'admin_sessions', id));
          toast.success('Đã xóa lịch sử đăng nhập.');
        } catch (error: any) {
          toast.error('Lỗi khi xóa: ' + error.message);
        }
      }
    });
  };

  const filteredSessions = sessions.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.email.toLowerCase().includes(q) ||
      (s.displayName || '').toLowerCase().includes(q) ||
      (s.ip || '').toLowerCase().includes(q) ||
      (s.device || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q)
    );
  });

  const getDeviceIcon = (deviceStr: string) => {
    const dLower = deviceStr.toLowerCase();
    if (dLower.includes('phone') || dLower.includes('android') || dLower.includes('ios') || dLower.includes('device')) {
      return <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
    return <Laptop className="w-4 h-4 text-emerald-500 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Alert Header Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 text-left relative overflow-hidden backdrop-blur-md text-left">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center relative z-10 justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1 rounded-full uppercase">Hệ thống Giám sát Bảo mật</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Giám Sát & Quản Lý Phiên Đăng Nhập</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Hệ thống tự động phát hiện và cảnh báo tức thời khi tài khoản quản trị viên đăng nhập ở vị trí khác, thiết bị khác hoặc dãy IP lạ. Bạn có thể chấm dứt phiên làm việc của bất kỳ thiết bị nào từ xa.
            </p>
          </div>
          <div className="flex gap-4 items-center bg-white/50 dark:bg-zinc-900/60 p-4 border border-indigo-500/10 rounded-2xl">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phiên hoạt động</p>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {sessions.filter(s => s.active).length}
              </p>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số phiên</p>
              <p className="text-3xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {sessions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Box */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm theo Gmail, IP, Địa điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-black/25 border border-slate-250 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto md:justify-end shrink-0">
          <button
            onClick={handleLogoutAllOtherSessions}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition shadow-md shadow-rose-600/10 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất thiết bị khác
          </button>
          
          <div className="text-[11px] text-slate-500 font-mono shrink-0">
            Live
            <RefreshCw className="w-3.5 h-3.5 ml-1.5 inline animate-spin text-indigo-500" />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold font-bold">
               {selectedIds.length}
            </div>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">phiên lịch sử đã chọn</span>
          </div>
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-colors"
          >
            <Trash size={14} /> Xóa tất cả đã chọn
          </button>
        </div>
      )}

      {/* Main Sessions Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <table className="w-full text-left border-separate border-spacing-0 table-fixed min-w-[1200px]">
            <colgroup>
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-56" />
              <col className="w-36" />
              <col className="w-56" />
              <col className="w-48" />
              <col className="w-56" />
              <col className="w-48" />
              <col className="w-48 text-right bg-slate-50/50 dark:bg-black/10 sticky right-0 z-20 shrink-0" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/70 dark:bg-white/[0.02]">
                <th className="p-4 border-b border-slate-100 dark:border-white/5">
                   <button 
                     onClick={toggleSelectAll} 
                     className="text-slate-400 hover:text-indigo-600 transition-colors"
                     disabled={filteredSessions.filter(s => !s.active).length === 0}
                   >
                      {selectedIds.length === filteredSessions.filter(s => !s.active).length && filteredSessions.filter(s => !s.active).length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                   </button>
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 capitalize border-b border-slate-100 dark:border-white/5">Logo</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 capitalize border-b border-slate-100 dark:border-white/5">Gmail</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 capitalize border-b border-slate-100 dark:border-white/5">Chức vụ</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-550 capitalize border-b border-slate-100 dark:border-white/5">Thiết bị</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-550 capitalize border-b border-slate-100 dark:border-white/5">IP (Bảo mật)</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-550 capitalize border-b border-slate-100 dark:border-white/5">Vị trí</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-550 capitalize border-b border-slate-100 dark:border-white/5">Ngày giờ đăng nhập</th>
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-550 text-right capitalize bg-slate-50/50 dark:bg-black/10 border-b border-slate-100 dark:border-white/5 sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredSessions.map((session) => {
                const isCurrentSession = localStorage.getItem('active_admin_session_id') === session.id;
                
                return (
                  <tr 
                    key={session.id} 
                    className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group ${!session.active ? 'opacity-60 bg-slate-50/10' : ''}`}
                  >
                    {/* Checkbox Column */}
                    <td className="p-4 align-middle">
                       {!session.active && (
                         <button onClick={() => toggleSelect(session.id)} className={selectedIds.includes(session.id) ? "text-indigo-600" : "text-slate-300"}>
                            {selectedIds.includes(session.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                         </button>
                       )}
                    </td>

                    {/* Logo Column */}
                    <td className="p-4 align-middle">
                      {session.photoURL ? (
                        <img 
                          src={session.photoURL} 
                          alt="" 
                          className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 object-cover shadow-sm bg-slate-100" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500">
                          <UserCircle className="w-6 h-6" />
                        </div>
                      )}
                    </td>

                    {/* Gmail Column */}
                    <td className="p-4 align-middle">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-slate-900 dark:text-stone-100 truncate">
                          {session.displayName || 'Quản trị viên'}
                        </span>
                        <span className="text-xs text-slate-400 truncate">{session.email}</span>
                      </div>
                    </td>

                    {/* Chức vụ (Role) Column */}
                    <td className="p-4 align-middle">
                      {session.role === 'superadmin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-450 border border-rose-200/50 dark:border-rose-500/20">
                          <Shield className="w-3 h-3 text-rose-500" /> Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
                          Admin
                        </span>
                      )}
                    </td>

                    {/* Thiết bị Column */}
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        {getDeviceIcon(session.device)}
                        <span className="text-xs sm:text-sm truncate font-medium max-w-[190px]" title={session.device}>
                          {session.device}
                        </span>
                      </div>
                    </td>

                    {/* IP (Bảo mật) Column */}
                    <td className="p-4 align-middle">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{session.ip}</span>
                      </div>
                    </td>

                    {/* Vị trí Column */}
                    <td className="p-4 align-middle font-medium text-slate-600 dark:text-slate-400 text-xs sm:text-sm truncate" title={session.location}>
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{session.location || 'Chưa rõ'}</span>
                      </div>
                    </td>

                    {/* Ngày giờ đăng nhập Column */}
                    <td className="p-4 align-middle font-mono text-slate-550 dark:text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{format(toSafeDate(session.createdAt), 'dd/MM/yyyy HH:mm:ss')}</span>
                      </div>
                    </td>

                    {/* Thao tác Column */}
                    <td className="p-4 align-middle text-right bg-slate-50/50 dark:bg-black/10 sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] backdrop-blur-sm">
                      {session.active ? (
                        <div className="flex items-center justify-end gap-2">
                          {isCurrentSession ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Thiết bị hiện tại
                            </span>
                          ) : session.approved ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Được tin cậy
                              </span>
                              <button
                                onClick={() => handleRevokeSession(session)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition border border-rose-200"
                              >
                                Đăng xuất
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveSession(session)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-lg transition border border-emerald-200"
                              >
                                Phê duyệt
                              </button>
                              <button
                                onClick={() => handleRevokeSession(session)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition border border-rose-200"
                              >
                                Đăng xuất
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 uppercase bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 rounded-md">
                            Đã Đăng Xuất
                          </span>
                          <button
                            onClick={() => handleDeleteSessionRecord(session.id)}
                            className="text-[11px] text-slate-400 hover:text-rose-500 font-semibold"
                          >
                            Xóa lịch sử
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredSessions.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 dark:text-slate-450 text-sm">
                    Không tìm thấy phiên đăng nhập nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 text-sm">
                    <AppLogo className="w-12 h-12 mx-auto mb-3" isLoading={true} />
                    Đang tải danh sách phiên bảo mật...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Revoke with Optional IP Block Modal */}
      <AnimatePresence>
        {revokeTargetSession && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRevokeTargetSession(null)}
              className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-[999]"
            />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl pointer-events-auto text-left"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <button
                    onClick={() => setRevokeTargetSession(null)}
                    className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                  Đăng xuất & Bảo mật thiết bị
                </h3>
                <p className="text-slate-650 dark:text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
                  Thiết bị <strong>{revokeTargetSession.device}</strong> (IP: <code className="font-mono bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded">{revokeTargetSession.ip}</code>) sẽ bị bắt buộc đăng xuất lập tức.
                </p>

                {/* Confirm with IP Banner option */}
                <div className="bg-slate-50 dark:bg-black/20 border border-slate-150 dark:border-white/5 rounded-2xl p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shouldBlockIp}
                      onChange={(e) => setShouldBlockIp(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 accent-rose-600 cursor-pointer rounded"
                    />
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Đồng thời chặn vĩnh viễn địa chỉ IP này</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs">Thêm IP {revokeTargetSession.ip} vào danh sách đen (IP Banned)</span>
                    </div>
                  </label>

                  {shouldBlockIp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 overflow-hidden"
                    >
                      <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5">Lý do chặn địa chỉ IP:</label>
                      <input
                        type="text"
                        value={customBlockReason}
                        onChange={(e) => setCustomBlockReason(e.target.value)}
                        placeholder="Lý do chặn..."
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-250 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-rose-500 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setRevokeTargetSession(null)}
                    className="flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-white/5"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmRevoke}
                    className="flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-white transition-colors bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10"
                  >
                    Phê duyệt lệnh
                  </button>
                </div>
              </motion.div>
            </div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}

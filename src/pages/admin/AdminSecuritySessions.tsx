import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, Lock, Laptop, Smartphone, HelpCircle, LogOut, CheckCircle2, UserCircle, Globe, Calendar, RefreshCw, AlertTriangle, X, Check, ShieldAlert, CheckSquare, Square, Trash, Users, Radio, CheckCircle } from 'lucide-react';
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

export interface GuestVisit {
  id: string;
  ip: string;
  device: string;
  lastActiveAt: number;
  blocked: boolean;
}

export interface AccessRequest {
  id: string;
  email: string;
  displayName: string;
  ipWifi: string;
  device: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export default function AdminSecuritySessions() {
  const [activeTab, setActiveTab] = useState<'guests' | 'auth' | 'approved' | 'pending'>('auth');
  
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [guests, setGuests] = useState<GuestVisit[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedApprovedEmails, setExpandedApprovedEmails] = useState<string[]>([]);
  const { openConfirm } = useConfirmStore();
  const { userData } = useAuthStore();

  // For the custom logout IP ban modal
  const [revokeTargetSession, setRevokeTargetSession] = useState<AdminSession | null>(null);
  const [shouldBlockIp, setShouldBlockIp] = useState(false);
  const [customBlockReason, setCustomBlockReason] = useState('Đăng xuất từ xa / Chặn từ bảo mật quản lý thiết bị');

  useEffect(() => {
    setLoading(true);
    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= 3) setLoading(false);
    };

    // Sessions listener
    const qSessions = query(collection(db, 'admin_sessions'), orderBy('createdAt', 'desc'));
    const unSubSessions = onSnapshot(qSessions, (snap) => {
      const list: AdminSession[] = [];
      snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as AdminSession));
      setSessions(list);
      checkAllLoaded();
    }, (error) => {
      console.error(error);
      checkAllLoaded();
    });

    // Guests listener
    const qGuests = query(collection(db, 'guest_visits'), orderBy('lastActiveAt', 'desc'));
    const unSubGuests = onSnapshot(qGuests, (snap) => {
      const list: GuestVisit[] = [];
      snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as GuestVisit));
      setGuests(list);
      checkAllLoaded();
    }, (error) => {
      console.error(error);
      checkAllLoaded();
    });

    // AccessRequests listener
    const qRequests = query(collection(db, 'access_requests'), orderBy('createdAt', 'desc'));
    const unSubRequests = onSnapshot(qRequests, (snap) => {
      const list: AccessRequest[] = [];
      snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as AccessRequest));
      setRequests(list);
      checkAllLoaded();
    }, (error) => {
      console.error(error);
      checkAllLoaded();
    });

    return () => {
      unSubSessions();
      unSubGuests();
      unSubRequests();
    };
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
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    setRevokeTargetSession(session);
    setShouldBlockIp(false);
    setCustomBlockReason(`Đăng xuất từ xa do phát hiện xung đột bảo mật thiết bị [IP: ${session.ip}]`);
  };

  const handleConfirmRevoke = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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

  const handleApproveRequest = async (req: AccessRequest) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    try {
      await updateDoc(doc(db, 'access_requests', req.id), { status: 'approved' });
      // Add IP to whitelist
      const sysSnap = await getDoc(doc(db, 'settings', 'system'));
      let whitelistText = '';
      if (sysSnap.exists()) {
        whitelistText = sysSnap.data().ipWhitelistText || '';
      }
      
      const ipList = whitelistText.split(/[\n,\s]+/).map(i => i.trim()).filter(i => i);
      if (!ipList.includes(req.ipWifi)) {
        ipList.push(req.ipWifi);
      }
      const newText = ipList.join('\n');
      
      await setDoc(doc(db, 'settings', 'system'), {
        ipWhitelistText: newText
      }, { merge: true });

      toast.success(`Đã duyệt IP ${req.ipWifi} cho người dùng ${req.email}`);
    } catch (e: any) {
      toast.error('Lỗi duyệt yêu cầu: ' + e.message);
    }
  };

  const handleRejectRequest = async (req: AccessRequest) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    try {
      await updateDoc(doc(db, 'access_requests', req.id), { status: 'rejected' });
      toast.success('Đã từ chối yêu cầu truy cập');
    } catch (e: any) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const handleDeleteRequest = async (id: string, ipWifi?: string, status?: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm({
      title: status === 'approved' ? 'Xóa IP khỏi danh sách đã duyệt?' : 'Xóa yêu cầu?',
      message: status === 'approved' ? 'Hành động này sẽ xóa Thiết bị/IP này khỏi danh sách cho phép. Người dùng này sẽ không thể truy cập lại. Tiếp tục?' : 'Bạn có chắc chắn muốn xóa bản ghi yêu cầu này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'access_requests', id));
          if (status === 'approved' && ipWifi) {
             const sysSnap = await getDoc(doc(db, 'settings', 'system'));
             if (sysSnap.exists()) {
                const text = sysSnap.data().ipWhitelistText || '';
                const arr = text.split(/[\n,\s]+/).map((i: string) => i.trim()).filter((i: string) => i && i !== ipWifi);
                await setDoc(doc(db, 'settings', 'system'), { ipWhitelistText: arr.join('\n') }, { merge: true });
             }
          }
          toast.success('Xóa thành công!');
        } catch(e) {}
      }
    });
  };

  const handleBlockGuestIP = async (ip: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    try {
       await setDoc(doc(db, 'blockedIps', ip), { ip, reason: 'Chặn từ Quản lý phiên khách', createdAt: Date.now() });
       await setDoc(doc(db, 'guest_visits', ip), { blocked: true }, { merge: true });
       toast.success('Đã chặn thiết bị khách ' + ip);
    } catch (e: any) {
       toast.error('Lỗi khi chặn: ' + e.message);
    }
  };

  const handleApproveSession = async (session: AdminSession) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    try {
      await approveSession(session.id);
      toast.success(`Đã duyệt cho phép thiết bị ${session.device} (IP: ${session.ip}) hoạt động.`);
    } catch (err: any) {
      toast.error('Không phê duyệt được thiết bị: ' + (err?.message || err));
    }
  };

  const handleUnblockGuestIP = async (ip: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    try {
       await deleteDoc(doc(db, 'blockedIps', ip));
       await setDoc(doc(db, 'guest_visits', ip), { blocked: false }, { merge: true });
       toast.success('Đã mở chặn thiết bị khách ' + ip);
    } catch (e: any) {
       toast.error('Lỗi khi mở chặn: ' + e.message);
    }
  };

  const handleDeleteSessionRecord = (id: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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

      {/* Unapproved Admin Sessions Security Warnings */}
      {(() => {
        const unapprovedActiveSessions = sessions.filter(
          s => s.active && !s.approved && s.id !== localStorage.getItem('active_admin_session_id')
        );
        if (unapprovedActiveSessions.length === 0) return null;
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 text-left">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-2xl">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-500 animate-bounce" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-rose-700 dark:text-rose-400">
                Lưu ý khẩn cấp: Phát hiện đăng nhập quản trị chưa phê duyệt ({unapprovedActiveSessions.length})
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {unapprovedActiveSessions.map(sess => (
                <div 
                  key={sess.id}
                  className="bg-white dark:bg-zinc-900 relative rounded-[2rem] border border-rose-500/[0.25] overflow-hidden p-6 text-left shadow-lg shadow-rose-500/5 bg-gradient-to-br from-rose-500/[0.02] to-transparent dark:from-rose-500/[0.04]"
                >
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-550/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/30">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-rose-200 truncate">{sess.displayName || 'Quản trị viên'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-mono">{sess.email}</p>
                      
                      <div className="pt-2.5 text-xs text-slate-600 dark:text-slate-350 space-y-1.5 font-medium">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-3.5 h-3.5 text-rose-550 shrink-0" />
                          <span className="truncate text-slate-705 dark:text-zinc-300">{sess.device}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-rose-550 shrink-0" />
                          <span className="font-mono text-slate-705 dark:text-zinc-350">{sess.ip}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-rose-550 shrink-0" />
                          <span className="truncate text-slate-705 dark:text-zinc-300">{sess.location || "Vị trí không rõ"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3 relative z-10">
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess)}
                      className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm hover:shadow-md active:scale-95 duration-200"
                    >
                      Từ chối / Chặn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveSession(sess)}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm hover:shadow-md active:scale-95 duration-200"
                    >
                      Duyệt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('auth')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'auth' ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Shield className="w-4 h-4" /> Phiên Đã Login ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('guests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'guests' ? 'bg-white dark:bg-zinc-800 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Users className="w-4 h-4" /> Lịch sử Khách ({guests.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'pending' ? 'bg-white dark:bg-zinc-800 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Radio className="w-4 h-4" /> Đợi Duyệt ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'approved' ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <CheckCircle className="w-4 h-4" /> Danh sách Đã Duyệt
        </button>
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
      {activeTab === 'auth' && (
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
              <col className="w-48 text-right shrink-0" />
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
                <th className="p-4 text-xs font-bold text-slate-400 dark:text-slate-550 text-right capitalize bg-slate-50/50 dark:bg-black/10 border-b border-slate-100 dark:border-white/5">Thao tác</th>
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
                    <td className="whitespace-nowrap p-4 align-middle text-right">
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
                  <td colSpan={9} className="whitespace-nowrap p-12 text-center text-slate-500 dark:text-slate-450 text-sm">
                    Không tìm thấy phiên đăng nhập nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="whitespace-nowrap p-12 text-center text-slate-400 text-sm">
                    <AppLogo className="w-12 h-12 mx-auto mb-3" isLoading={true} />
                    Đang tải danh sách phiên bảo mật...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Guest Visits Tab */}
      {activeTab === 'guests' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Lịch sử kết nối Khách
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Danh sách các thiết bị ẩn danh (chưa đăng nhập) đã truy cập vào hệ thống.
            </p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 dark:bg-zinc-900 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">IP Thiết bị / Wifi</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">Thông tin thiết bị (User Agent)</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">Hoạt động cuối</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5 text-right">Trạng thái / Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {guests.map(guest => (
                <tr key={guest.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <td className="p-4 font-mono font-bold text-slate-700 dark:text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-500" />
                      {guest.ip}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-500 truncate max-w-sm" title={guest.device}>{guest.device}</td>
                  <td className="p-4 text-xs font-mono">{format(toSafeDate(guest.lastActiveAt), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="p-4 text-right">
                    {guest.blocked ? (
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-rose-500 text-[10px] font-bold uppercase whitespace-nowrap"><ShieldAlert className="w-3 h-3 inline pb-0.5"/> Đã bị cấm</span>
                        <button onClick={() => handleUnblockGuestIP(guest.ip)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Mở truy cập</button>
                      </div>
                    ) : (
                      <button onClick={() => handleBlockGuestIP(guest.ip)} className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Cấm truy cập</button>
                    )}
                  </td>
                </tr>
              ))}
              {guests.length === 0 && (
                 <tr>
                   <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Chưa có lịch sử kết nối ẩn danh nào.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Access Requests Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-500" />
              Yêu cầu cấp quyền truy cập
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Người dùng đã đăng nhập nhưng bị chặn do giới hạn IP Wifi có thể gửi yêu cầu xin cấp quyền tại đây.
            </p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 dark:bg-zinc-900 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">Người dùng (Gmail)</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">IP / Wifi Requested</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">Thông tin máy / thiết bị</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5">Thời gian</th>
                <th className="p-4 font-bold border-b border-slate-100 dark:border-white/5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {requests.filter(r => r.status === 'pending').map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <td className="p-4 text-slate-900 dark:text-zinc-100">
                    <div className="font-bold">{req.displayName || 'User'}</div>
                    <div className="text-xs text-slate-500">{req.email}</div>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-700 dark:text-zinc-300">{req.ipWifi}</td>
                  <td className="p-4 text-xs text-slate-500 truncate max-w-xs" title={req.device}>{req.device}</td>
                  <td className="p-4 text-xs font-mono text-slate-400">{format(toSafeDate(req.createdAt), 'dd/MM HH:mm')}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleRejectRequest(req)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">Từ chối</button>
                    <button onClick={() => handleApproveRequest(req)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm drop-shadow-sm">✅ Duyệt IP</button>
                  </td>
                </tr>
              ))}
              {requests.filter(r => r.status === 'pending').length === 0 && (
                 <tr>
                   <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">Không có yêu cầu đợi duyệt.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Approved Access Requests Tab */}
      {activeTab === 'approved' && (() => {
        const approved = requests.filter(r => r.status === 'approved');
        const grouped = approved.reduce((acc, req) => {
          if (!acc[req.email]) acc[req.email] = [];
          acc[req.email].push(req);
          return acc;
        }, {} as Record<string, AccessRequest[]>);
        const entries = Object.entries(grouped);

        return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Thiết bị / IP đã được duyệt
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Danh sách các thiết bị và IP đã được phê duyệt truy cập.
            </p>
          </div>
          <div className="flex flex-col">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Chưa có thiết bị nào được duyệt từ hệ thống.
              </div>
            ) : (
              entries.map(([email, userRequests]) => {
                const isExpanded = expandedApprovedEmails.includes(email);
                return (
                  <div key={email} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-zinc-100">{email}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{userRequests.length} thiết bị/IP đã đăng ký truy cập</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedApprovedEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email])}
                        className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition whitespace-nowrap"
                      >
                        {isExpanded ? 'Đóng lại' : 'Xem chi tiết thiết bị'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 dark:bg-black/20 p-4 border-t border-slate-100 dark:border-white/5">
                        <div className="space-y-3">
                          {userRequests.map(req => (
                            <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="font-mono font-bold text-slate-700 dark:text-zinc-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded text-sm select-all">{req.ipWifi}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-450 line-clamp-1" title={req.device}>{req.device}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Duyệt lúc: {format(toSafeDate(req.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                              </div>
                              <button 
                                onClick={() => handleDeleteRequest(req.id, req.ipWifi, req.status)} 
                                className="shrink-0 max-w-fit px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-xs font-bold transition border border-rose-200 dark:border-rose-500/20"
                              >
                                Xóa bản ghi (Chặn IP)
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      );})()}

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

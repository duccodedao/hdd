import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSearchParams } from 'react-router-dom';
import { doc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { uploadToGitHub } from '../services/githubService';
import toast from 'react-hot-toast';
import { 
  Camera, User, Shield, CheckCircle2, ChevronRight, KeyRound, 
  Activity, Loader2, Settings, HelpCircle, Zap, Brush, Mail,
  Smartphone, Bell, Globe, LogOut, Clock, ArrowUpRight, MapPin
} from 'lucide-react';
import { toSafeDate, cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useConfirmStore } from '../store/confirmStore';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';
import { KeyboardShortcutsModal } from '../components/ui/KeyboardShortcutsModal';
import { TwoFactorSetupModal } from '../components/auth/TwoFactorSetupModal';
import { Helmet } from 'react-helmet-async';

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  timestamp: any;
}

export default function Profile() {
  const { user, userData } = useAuthStore();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirmStore();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'account' | 'info' | 'security' | 'activity'>((searchParams.get('tab') as any) || 'account');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentLocationName, setCurrentLocationName] = useState('Đang xác định...');

  const [permissions, setPermissions] = useState({
    geolocation: 'prompt' as PermissionState
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'activities'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setActivities(all.sort((a,b) => {
        const da = a.timestamp ? toSafeDate(a.timestamp).getTime() : 0;
        const db = b.timestamp ? toSafeDate(b.timestamp).getTime() : 0;
        return db - da;
      }).slice(0, 15));
    });

    const timer = setInterval(() => {
      setPasswordCooldown(c => Math.max(0, c - 1));
    }, 1000);

    const checkPermissions = async () => {
      try {
        if (!navigator.permissions) return;
        const [loc] = await Promise.all([
          navigator.permissions.query({ name: 'geolocation' as any })
        ]);
        const updateState = () => setPermissions({
          geolocation: loc.state
        });
        updateState();
        loc.onchange = updateState;
      } catch (e) {
        console.error("Permission check failed", e);
      }
    };
    checkPermissions();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10&addressdetails=1&email=sonlyhongduc@gmail.com`, {
            headers: { 'Accept-Language': 'vi' }
          });
          const data = await res.json();
          setCurrentLocationName(data.display_name || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        } catch (e) {
          setCurrentLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
      }, () => setCurrentLocationName('Quyền định vị bị từ chối'));
    }

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'info', 'security', 'activity'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (userData?.displayName) setDisplayName(userData.displayName);
    if (userData?.phoneNumber) setPhoneNumber(userData.phoneNumber);
  }, [userData]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Kích thước ảnh phải dưới 2MB');

    setUploading(true);
    const toastId = toast.loading('Đang tải ảnh lên...');
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      // Sync to GitHub if configured
      const githubUrl = await uploadToGitHub(file, `avatar_${user.uid}_${file.name}`, `assets/avatars/${user.uid}/${Date.now()}_${file.name}`);
      
      // Update Auth Profile and User Document
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { 
        photoURL: url,
        githubAvatarUrl: githubUrl || null
      });
      
      // Save metadata to files collection
      await addDoc(collection(db, 'files'), {
        name: `Avatar: ${file.name}`,
        url: url,
        githubUrl: githubUrl || null,
        path: snapshot.ref.fullPath,
        size: file.size,
        type: file.type,
        isAvatar: true,
        uploadedAt: serverTimestamp(),
        userId: user.uid,
        uploadedBy: user.email
      });

      await logActivity(ActivityType.UPDATE_PROFILE, 'Đã cập nhật ảnh đại diện');
      toast.success('Đã cập nhật ảnh đại diện', { id: toastId });
    } catch (error) {
      toast.error('Lỗi khi tải ảnh', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, 'users', user.uid), { displayName, phoneNumber });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Đã cập nhật thông tin tài khoản');
      toast.success('Đã lưu thông tin');
    } catch (e) { toast.error('Lỗi khi lưu dữ liệu'); } finally { setLoading(false); }
  };

  const togglePermission = async (type: 'geolocation') => {
    if (type === 'geolocation') {
      navigator.geolocation.getCurrentPosition(() => {
        toast.success('Đã nhận quyền vị trí');
      }, () => {
        toast.error('Quyền vị trí bị từ chối');
      });
    }
  };

  const handlePWAInstall = () => {
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          toast.success('Đang cài đặt ứng dụng...');
        }
        (window as any).deferredPrompt = null;
      });
    } else {
      toast.error('Thiết bị/Trình duyệt của bạn không hỗ trợ cài đặt PWA hoặc ứng dụng đã được cài đặt.');
    }
  };

  const handleLogout = async () => {
    openConfirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn kết thúc phiên làm việc này?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await signOut(auth);
        toast.success('Đã đăng xuất');
      }
    });
  };

  const handleChangePassword = () => {
    if (!user?.email || passwordCooldown > 0) return;
    openConfirm({
      title: 'Đổi mật khẩu',
      message: 'Gửi liên kết đặt lại mật khẩu đến email của bạn?',
      confirmText: 'Gửi',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await sendPasswordResetEmail(auth, user.email!);
        setPasswordCooldown(60);
        toast.success('Đã gửi email khôi phục');
      }
    });
  };

  return (
    <div className="max-w-[1920px] mx-auto py-6 lg:py-20 relative min-h-screen animate-fade-in">
      <Helmet>
        <title>Tài khoản | BMASS Dashboard</title>
        <meta name="description" content="Quản lý thông tin định danh và bảo mật cá nhân." />
      </Helmet>
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TwoFactorSetupModal isOpen={show2FAModal} onClose={() => setShow2FAModal(false)} />

      <div className="space-y-10 lg:space-y-16">
        <header className="space-y-4 lg:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-300 uppercase tracking-widest">Account Center</span>
              </div>
              <div className="space-y-1 lg:space-y-2">
                <h1 className="text-3xl lg:text-6xl font-display font-semibold tracking-tight text-slate-950 dark:text-white leading-none">Tài khoản</h1>
                <p className="text-slate-600 dark:text-zinc-400 text-sm lg:text-base font-medium max-w-xl">
                  Quản lý định danh kỹ thuật số, cài đặt bảo mật và đồng bộ hóa quyền hệ thống.
                </p>
              </div>
            </div>
            
            <button onClick={handleLogout} className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-sm active:scale-95">
               Đăng Xuất <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-4">
            {[
              { id: 'account', label: 'Cấu hình định danh', icon: User },
              { id: 'security', label: 'Trung tâm bảo mật', icon: Shield },
              { id: 'activity', label: 'Nhật ký truy cập', icon: Activity },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'}`}>
                  <tab.icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <section>
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'account' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    <div className="lg:col-span-5 space-y-8">
                      <div className="premium-card relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex flex-col items-center text-center relative z-10">
                          <div className="relative group/avatar cursor-pointer mb-6" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                            <div className="w-32 h-32 rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-zinc-900 border-2 border-slate-200 dark:border-white/10 flex items-center justify-center relative shadow-2xl transition-all duration-500 group-hover/avatar:scale-105 group-hover/avatar:rotate-3">
                              {userData?.photoURL ? (
                                <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-12 h-12 text-slate-400 dark:text-zinc-700" />
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                                <Camera className="w-8 h-8 text-white" />
                              </div>
                              {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
                                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-full border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-500 mb-4">
                            <Shield className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{userData?.role === 'superadmin' ? 'Super Admin' : userData?.role === 'admin' ? 'Administrator' : 'Thành viên'}</span>
                          </div>
                          <h3 className="text-3xl font-display font-bold text-slate-950 dark:text-white tracking-tight mb-2">{userData?.displayName || 'Chưa định danh'}</h3>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{userData?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <div className="premium-card h-full">
                        <h3 className="text-xl font-semibold text-slate-950 dark:text-white mb-8 tracking-tight">Thông tin liên lạc</h3>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Định danh hiển thị</label>
                             <input 
                               type="text" 
                               value={displayName} 
                               onChange={e => setDisplayName(e.target.value)} 
                               className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                               placeholder="Tên hoặc bí danh..."
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Kênh liên lạc chính</label>
                             <input 
                               type="tel" 
                               value={phoneNumber} 
                               onChange={e => setPhoneNumber(e.target.value)} 
                               className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                               placeholder="Số điện thoại..."
                             />
                          </div>
                          
                          <div className="pt-4">
                             <button 
                               type="submit" 
                               disabled={loading} 
                               className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
                             >
                               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                               {loading ? 'Đang Xử Lý...' : 'Đồng Bộ Hóa Dữ Liệu'}
                             </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'security' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="premium-card flex flex-col justify-between">
                     <div>
                        <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center mb-6">
                           <KeyRound className="w-7 h-7 text-indigo-600 dark:text-indigo-500" />
                        </div>
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Mã khóa</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                           Cập nhật khóa mã hóa hệ thống thông qua giao thức an toàn. Liên kết khôi phục sẽ được gửi đến kênh liên lạc chính thức.
                        </p>
                     </div>
                     <button 
                       onClick={handleChangePassword}
                       disabled={passwordCooldown > 0}
                       className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-xl disabled:opacity-50"
                     >
                       {passwordCooldown > 0 ? `Đóng băng (${passwordCooldown}s)` : 'Tái Thiết Lập'}
                     </button>
                  </div>

                  <div className="premium-card flex flex-col justify-between">
                     <div>
                        <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center mb-6">
                           <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                           <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Bảo mật đa tầng</h3>
                           {userData?.twoFactorEnabled ? (
                             <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase">Active</span>
                           ) : (
                             <span className="px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded-lg text-[10px] font-bold uppercase">Offline</span>
                           )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                           Tăng cường lá chắn phòng thủ với mã xác thực luân phiên. Khuyến nghị bắt buộc đối với cấp quản trị viên.
                        </p>
                     </div>
                     <button 
                       onClick={() => setShow2FAModal(true)}
                       className={cn(
                         "w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-xl border",
                         userData?.twoFactorEnabled 
                           ? "bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5" 
                           : "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                       )}
                     >
                       {userData?.twoFactorEnabled ? 'Cấu Hình 2FA' : 'Kích Hoạt Lá Chắn'}
                     </button>
                  </div>

                  <div className="lg:col-span-2 premium-card">
                     <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-8 tracking-tight">Thiết lập quyền thiết bị</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { key: 'geolocation', label: 'Geo Location', state: permissions.geolocation, icon: MapPin },
                          { key: 'pwa', label: 'Native App', state: 'prompt', icon: Smartphone }
                        ].map((perm, i) => (
                          <div key={perm.key} className="p-6 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 rounded-[2rem] flex flex-col justify-between gap-8 h-full">
                             <div className="flex items-start justify-between">
                                <div className={cn(
                                  "w-12 h-12 rounded-[1rem] flex items-center justify-center transition-colors shadow-sm",
                                  perm.state === 'granted' ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" : "bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400"
                                )}>
                                   <perm.icon className="w-5 h-5" />
                                </div>
                                <button 
                                  onClick={() => perm.key === 'pwa' ? handlePWAInstall() : togglePermission(perm.key as any)}
                                  className={cn(
                                    "flex items-center w-14 h-7 md:w-16 md:h-8 rounded-full relative transition-all duration-300 border focus:outline-none",
                                    perm.state === 'granted' ? "bg-blue-500 border-blue-600" : "bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-white/10"
                                  )}
                                >
                                  <div className={cn(
                                    "absolute top-[2px] md:top-[3px] w-5 h-5 md:w-6 md:h-6 rounded-full bg-white transition-all duration-300 shadow-sm",
                                    perm.state === 'granted' ? "translate-x-7 md:translate-x-8" : "translate-x-1"
                                  )} />
                                </button>
                             </div>
                             <div>
                                <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{perm.label}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                  {perm.key === 'pwa' ? 'Gắn ứng dụng' : perm.state === 'granted' ? 'Hợp lệ' : perm.state === 'denied' ? 'Từ chối' : 'Chưa thiết lập'}
                                </p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="premium-card">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                         </div>
                         <div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Audit Log</h3>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Lưu vết hoạt động hệ thống</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="relative before:absolute before:inset-0 before:ml-7 md:before:ml-8 before:-translate-x-px md:before:translate-x-0 before:w-0.5 before:bg-slate-100 dark:before:bg-white/5">
                     {activities.length > 0 ? activities.map((log, idx) => {
                         const TypeIcon = {
                           [ActivityType.LOGIN]: KeyRound,
                           [ActivityType.UPDATE_PROFILE]: User,
                           [ActivityType.SECURITY_CHANGE]: Shield,
                           [ActivityType.UPLOAD_FILE]: ArrowUpRight,
                           [ActivityType.ADMIN_ACTION]: Zap
                         }[log.type as ActivityType] || Activity;

                         return (
                           <motion.div 
                             key={log.id} 
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: idx * 0.05 }}
                             className="relative flex items-start gap-6 pb-8 last:pb-0 group"
                           >
                              <div className="relative z-10 w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1.25rem] bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:border-blue-200 dark:group-hover:border-blue-500/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all shadow-sm">
                                 <TypeIcon className="w-6 h-6" />
                              </div>
                              <div className="flex-1 pt-2 md:pt-3">
                                 <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl p-5 group-hover:border-slate-300 dark:group-hover:border-white/10 transition-colors shadow-sm">
                                    <p className="text-base font-medium text-slate-900 dark:text-white mb-3">{log.description}</p>
                                    <div className="flex flex-wrap items-center gap-3">
                                       <span className="px-2.5 py-1 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                         {log.type}
                                       </span>
                                       <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                         {log.timestamp ? format(toSafeDate(log.timestamp), 'HH:mm • dd/MM/yyyy') : 'Vừa xong'}
                                       </span>
                                    </div>
                                 </div>
                              </div>
                           </motion.div>
                         );
                     }) : (
                       <div className="p-12 text-center relative z-10">
                          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                             <Activity className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Không có dữ liệu</p>
                       </div>
                     )}
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}

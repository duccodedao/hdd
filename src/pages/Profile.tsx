import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
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

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'activity'>('general');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentLocationName, setCurrentLocationName] = useState('Đang xác định...');

  const [permissions, setPermissions] = useState({
    notifications: 'prompt' as PermissionState,
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
        const [loc, notif] = await Promise.all([
          navigator.permissions.query({ name: 'geolocation' as any }),
          navigator.permissions.query({ name: 'notifications' as any })
        ]);
        const updateState = () => setPermissions({
          geolocation: loc.state,
          notifications: notif.state
        });
        updateState();
        loc.onchange = updateState;
        notif.onchange = updateState;
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

  const togglePermission = async (type: 'notifications' | 'geolocation') => {
    if (type === 'notifications') {
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        if (res === 'granted') toast.success('Đã bật thông báo');
      } else {
        toast('Vui lòng thay đổi quyền trong cài đặt trình duyệt', { icon: 'ℹ️' });
      }
    } else {
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
    <div className="max-w-4xl mx-auto py-10 lg:py-20 animate-fade-in no-scrollbar">
      <Helmet>
        <title>Hồ sơ | BMASS Dashboard</title>
        <meta name="description" content="Quản lý thông tin định danh và bảo mật cá nhân." />
      </Helmet>
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TwoFactorSetupModal isOpen={show2FAModal} onClose={() => setShow2FAModal(false)} />

      <header className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Tài khoản xác thực</span>
           </div>
           <h1 className="text-4xl lg:text-6xl font-display font-medium tracking-tighter italic uppercase text-white leading-none">Cài đặt.</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all whitespace-nowrap">
           Đăng xuất <LogOut className="w-3.5 h-3.5" />
        </button>
      </header>
      
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-4 lg:pb-0">
            {[
              { id: 'general', label: 'Cá nhân', icon: User },
              { id: 'security', label: 'Bảo mật', icon: Shield },
              { id: 'activity', label: 'Hoạt động', icon: Activity },
            ].map((tab) => (
                  <Link key={tab.id} to={`#${tab.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(tab.id as any);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === tab.id 
                        ? "bg-white text-black shadow-xl" 
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                    )}
                  >
                    <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "text-zinc-500")} />
                    {tab.label}
                  </Link>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-12"
            >
              {activeTab === 'general' && (
                <div className="space-y-12">
                  <section className="space-y-8 bg-zinc-900/40 p-8 md:p-12 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                       <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                          <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden ring-1 ring-white/10 bg-zinc-950 flex items-center justify-center relative shadow-2xl">
                            {userData?.photoURL ? (
                              <img src={userData.photoURL} alt="Mask" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                              <User className="w-10 h-10 text-zinc-800" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <Camera className="w-8 h-8 text-white" />
                            </div>
                            {uploading && (
                               <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
                                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                               </div>
                            )}
                          </div>
                       </div>
                       <div className="flex-1 space-y-2 text-center md:text-left">
                          <h3 className="text-2xl font-display font-medium text-white italic truncate">{userData?.displayName || 'Thành viên'}</h3>
                          <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest">{userData?.email}</p>
                          <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
                             <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                             <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[200px]">{currentLocationName}</span>
                          </div>
                       </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-8 pt-8 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Tên hiển thị</label>
                          <input 
                            type="text" 
                            value={displayName} 
                            onChange={e => setDisplayName(e.target.value)} 
                            className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                            placeholder="Tên của bạn"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Số điện thoại</label>
                          <input 
                            type="tel" 
                            value={phoneNumber} 
                            onChange={e => setPhoneNumber(e.target.value)} 
                            className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                            placeholder="Ví dụ: 0xxx xxx xxx"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full md:w-auto px-10 py-4 bg-white hover:bg-zinc-200 text-black rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Lưu cài đặt'}
                      </button>
                    </form>
                  </section>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                   <section className="space-y-6">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.3em]">Cấu hình bảo mật</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-8 border border-white/5 rounded-[2rem] bg-zinc-900/40 space-y-6">
                           <div className="space-y-2">
                              <h4 className="text-lg font-medium text-white">Mật khẩu</h4>
                              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">Khởi tạo yêu cầu thay đổi khoá truy cập tài khoản qua email.</p>
                           </div>
                           <button 
                             onClick={handleChangePassword}
                             disabled={passwordCooldown > 0}
                             className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-white/10"
                           >
                             {passwordCooldown > 0 ? `Chờ ${passwordCooldown}s` : 'Gửi yêu cầu'}
                           </button>
                        </div>

                        <div className="p-8 border border-white/5 rounded-[2rem] bg-zinc-900/40 space-y-6">
                           <div className="space-y-2">
                              <h4 className="text-lg font-medium text-white">2-Factor Auth</h4>
                              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">Sử dụng ứng dụng xác thực để tăng cường lớp bảo vệ.</p>
                           </div>
                           <button 
                             onClick={() => setShow2FAModal(true)}
                             className={cn(
                               "w-full py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                               userData?.twoFactorEnabled 
                                 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                                 : "bg-white/5 text-white hover:bg-white/10 border-white/10"
                             )}
                           >
                             {userData?.twoFactorEnabled ? 'Quản lý 2FA' : 'Chưa thiết lập'}
                           </button>
                        </div>
                      </div>
                   </section>

                   <section className="space-y-8 pt-8 border-t border-white/5">
                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.3em]">Quyền truy cập</h3>
                      <div className="space-y-4">
                         {[
                           { key: 'notifications', label: 'Thông báo hệ thống', state: permissions.notifications, icon: Bell },
                           { key: 'geolocation', label: 'Dịch vụ định vị', state: permissions.geolocation, icon: MapPin },
                           { key: 'pwa', label: 'Cài đặt ứng dụng', state: 'prompt', icon: Smartphone }
                         ].map(perm => (
                           <div key={perm.key} className="p-6 md:p-8 border border-white/5 bg-zinc-900/40 rounded-[2rem] flex items-center justify-between group">
                              <div className="flex items-center gap-6">
                                 <div className={cn(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                   perm.state === 'granted' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-zinc-950 border-white/5 text-zinc-600"
                                 )}>
                                    <perm.icon className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <p className="text-[13px] font-bold text-white uppercase tracking-wider">{perm.label}</p>
                                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-[0.2em] mt-1">
                                      {perm.key === 'pwa' ? 'Native App' : perm.state === 'granted' ? 'Đã cho phép' : perm.state === 'denied' ? 'Bị chặn' : 'Chưa thiết lập'}
                                    </p>
                                 </div>
                              </div>
                              <button 
                                onClick={() => perm.key === 'pwa' ? handlePWAInstall() : togglePermission(perm.key as any)}
                                className={cn(
                                  "w-12 h-6 rounded-full relative transition-all duration-500 border",
                                  perm.state === 'granted' ? "bg-indigo-500 border-indigo-400" : "bg-zinc-800 border-white/10"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-sm",
                                  perm.state === 'granted' ? "left-7" : "left-1"
                                )} />
                              </button>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-8">
                   <section className="space-y-8">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.3em]">Lịch sử hoạt động</h3>
                         <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{activities.length} sự kiện</span>
                         </div>
                      </div>
                      <div className="space-y-4">
                        {activities.length > 0 ? (
                          <div className="space-y-4">
                            {activities.map((log, idx) => {
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
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="group p-6 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-zinc-900/60 transition-all"
                                >
                                  <div className="flex items-center gap-6">
                                     <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                                        <TypeIcon className="w-5 h-5" />
                                     </div>
                                     <div className="space-y-1">
                                        <p className="text-sm font-bold text-white tracking-tight italic uppercase">{log.description}</p>
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                                            {log.timestamp ? format(toSafeDate(log.timestamp), 'HH:mm • dd/MM/yyyy') : 'Vừa xong'}
                                          </span>
                                          <div className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                                          <span className="text-[9px] font-bold text-indigo-500/40 uppercase tracking-[0.2em]">{log.type}</span>
                                        </div>
                                     </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-32 bg-zinc-900/40 rounded-[3rem] border border-white/5">
                             <Activity className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                             <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">Không có dữ liệu lưu trữ.</p>
                          </div>
                        )}
                      </div>
                   </section>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

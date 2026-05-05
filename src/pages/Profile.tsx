import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Camera, User, Globe, Shield, CheckCircle2, ChevronRight, KeyRound, Activity, AlertTriangle, Loader2, BellRing, Smartphone, ExternalLink, LogOut, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { toSafeDate, cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useConfirmStore } from '../store/confirmStore';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  timestamp: any;
}

export default function Profile() {
  const { user, userData } = useAuthStore();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirmStore();

  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [verifyCooldown, setVerifyCooldown] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [indexError, setIndexError] = useState(false);
  const [notifPerms, setNotifPerms] = useState({ system: true, security: true, files: true });
  const [activeTab, setActiveTab] = useState<'profile' | 'social' | 'system'>('profile');
  const [socialLinks, setSocialLinks] = useState({
    google: '', facebook: '', playGames: '', gameCenter: '', apple: '', github: '', microsoft: '', twitter: '', yahoo: ''
  });

  // Permission states
  const [permissions, setPermissions] = useState({
    camera: 'prompt' as PermissionState,
    microphone: 'prompt' as PermissionState,
    notifications: 'prompt' as PermissionState,
    geolocation: 'prompt' as PermissionState
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!navigator.permissions) return;
        const cam = await navigator.permissions.query({ name: 'camera' as any });
        const mic = await navigator.permissions.query({ name: 'microphone' as any });
        const loc = await navigator.permissions.query({ name: 'geolocation' as any });
        const notif = await navigator.permissions.query({ name: 'notifications' as any });
        
        setPermissions({
          camera: cam.state,
          microphone: mic.state,
          geolocation: loc.state,
          notifications: notif.state
        });

        const handleChange = () => checkPermissions();
        cam.onchange = handleChange;
        mic.onchange = handleChange;
        loc.onchange = handleChange;
        notif.onchange = handleChange;
      } catch (e) {
        console.error("Permission check failed", e);
      }
    };

    checkPermissions();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleRequestPermission = async (type: 'camera' | 'microphone' | 'geolocation' | 'notifications') => {
    try {
      if ((permissions as any)[type] === 'granted') return;

      if (type === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true });
        toast.success(`Đã cấp quyền Camera`);
      } else if (type === 'microphone') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        toast.success(`Đã cấp quyền Micro`);
      } else if (type === 'geolocation') {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        toast.success(`Đã cấp quyền Vị trí`);
      } else if (type === 'notifications') {
        const res = await Notification.requestPermission();
        if (res === 'granted') toast.success(`Đã cấp quyền Thông báo`);
        else toast.error('Quyền thông báo bị từ chối');
      }
    } catch (err) {
      toast.error('Không thể kích hoạt quyền. Vui lòng kiểm tra cài đặt trình duyệt.');
    }
  };

  const handleAddToHomeScreen = async () => {
    if (!deferredPrompt) {
      toast.error('Tính năng này chỉ khả dụng trên trình duyệt hỗ trợ PWA');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Cảm ơn bạn đã cài đặt ứng dụng!');
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    if (userData?.notificationPreferences) {
      setNotifPerms(userData.notificationPreferences);
    }
    if (userData?.socialLinks) {
       setSocialLinks(prev => ({...prev, ...userData.socialLinks}));
    }
    if (userData?.displayName) {
      setDisplayName(userData.displayName);
    }
  }, [userData]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'activities'), 
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const allActivities = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as ActivityLog));

      const sorted = allActivities
        .sort((a, b) => {
          const dateA = a.timestamp ? toSafeDate(a.timestamp).getTime() : 0;
          const dateB = b.timestamp ? toSafeDate(b.timestamp).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10);

      setActivities(sorted);
      setIndexError(false);
    }, (error) => {
      if (error.code === 'failed-precondition') {
        setIndexError(true);
      }
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    let pTimer: any, vTimer: any;
    if (passwordCooldown > 0) pTimer = setInterval(() => setPasswordCooldown(c => c - 1), 1000);
    if (verifyCooldown > 0) vTimer = setInterval(() => setVerifyCooldown(c => c - 1), 1000);
    return () => { clearInterval(pTimer); clearInterval(vTimer); };
  }, [passwordCooldown, verifyCooldown]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Kích thước ảnh không được vượt quá 2MB');
    }

    setUploading(true);
    const toastId = toast.loading('Đang tải ảnh lên...');

    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateProfile(user, { photoURL: downloadURL });
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL
      });

      await logActivity(ActivityType.UPDATE_PROFILE, 'Đã cập nhật ảnh đại diện');
      toast.success('Cập nhật ảnh đại diện thành công', { id: toastId });
    } catch (error) {
      toast.error('Lỗi khi tải ảnh lên. Vui lòng thử lại.', { id: toastId });
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
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        notificationPreferences: notifPerms
      });
      await logActivity(ActivityType.UPDATE_PROFILE, `Cập nhật profile (${displayName})`);
      toast.success('Cập nhật thành công');
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        socialLinks
      });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Cập nhật mạng xã hội');
      toast.success('Lưu thành công');
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email || passwordCooldown > 0) return;
    openConfirm({
      title: 'Đổi mật khẩu',
      message: 'Gửi email xác nhận đổi mật khẩu?',
      confirmText: 'Gửi Email',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await sendPasswordResetEmail(auth, user.email!);
          await logActivity(ActivityType.SECURITY_CHANGE, 'Yêu cầu đổi mật khẩu');
          toast.success('Đã gửi email đổi mật khẩu.');
          setPasswordCooldown(60);
        } catch (error) {
          toast.error('Lỗi khi gửi email đổi mật khẩu.');
        }
      }
    });
  };

  const handleVerifyEmail = async () => {
    if (!user || verifyCooldown > 0) return;
    if (user.emailVerified) return toast.success('Đã xác minh.');
    openConfirm({
      title: 'Xác minh Email',
      message: 'Gửi email xác minh tài khoản?',
      confirmText: 'Xác minh',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await sendEmailVerification(user);
          await logActivity(ActivityType.SECURITY_CHANGE, 'Yêu cầu xác minh email');
          toast.success('Đã gửi email xác minh.');
          setVerifyCooldown(60);
        } catch (error) {
          toast.error('Gửi email thất bại.');
        }
      }
    });
  };

  const handleLogout = async () => {
    openConfirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await signOut(auth);
          toast.success('Đã đăng xuất');
        } catch (error) {
          toast.error('Lỗi khi đăng xuất');
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-20 selection:bg-blue-500/10">
      
      {/* Premium Profile Header */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative group lg:p-16 p-8 glass-card border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col lg:flex-row items-center gap-12"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] -mr-64 -mt-64 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
        
        <div className="relative shrink-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            className="hidden" 
            accept="image/*"
          />
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={cn(
              "w-40 h-40 md:w-56 md:h-56 rounded-[2.5rem] overflow-hidden border-8 border-white/5 dark:border-white/5 shadow-2xl bg-slate-50 dark:bg-white/[0.02] relative cursor-pointer ring-1 ring-slate-200 dark:ring-white/10",
              uploading && "opacity-50"
            )}
            onClick={handleAvatarClick}
          >
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl font-display font-medium text-slate-300 dark:text-slate-700 italic">
                {userData?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <Camera className="w-10 h-10 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex-1 text-center lg:text-left space-y-8 min-w-0">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 glass rounded-full"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Đăng ký {userData?.role || 'Thành viên'}</span>
            </motion.div>
            <h1 className="text-5xl md:text-8xl font-display font-medium tracking-tight italic leading-[0.9] text-gradient">
              {userData?.displayName || 'Khách'}
            </h1>
            <p className="text-lg md:text-xl font-medium text-slate-500 italic max-w-2xl">
              Xác thực tại <span className="text-blue-500/80">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
             <button
               onClick={handleLogout}
               className="h-14 px-8 glass-card bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all duration-500 font-bold text-[10px] tracking-widest uppercase flex items-center gap-3 border border-rose-500/20"
             >
               <LogOut className="w-4 h-4" /> Đăng xuất
             </button>
             
             {!user?.emailVerified && (
               <button 
                 onClick={handleVerifyEmail}
                 disabled={verifyCooldown > 0}
                 className="h-14 px-8 glass rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold tracking-widest uppercase flex items-center gap-3 hover:bg-amber-500/20 shadow-xl shadow-amber-500/5 transition-all"
               >
                 <AlertTriangle className="w-4 h-4" /> Bảo mật tài khoản
               </button>
             )}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        
        <div className="lg:col-span-2 space-y-12">
          {/* Navigation Tabs */}
          <nav className="flex gap-2 p-2 glass rounded-[1.5rem] border border-white/5">
            {[
              { id: 'profile', label: 'Thông tin', icon: User },
              { id: 'social', label: 'Hệ sinh thái', icon: Globe },
              { id: 'system', label: 'Quyền hạn', icon: Shield },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 h-14 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all duration-500",
                  activeTab === tab.id 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-2xl" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="glass p-10 md:p-14 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-blue-500/5"
            >
              {activeTab === 'profile' && (
                <div className="space-y-12">
                  <header>
                    <h2 className="text-3xl font-display font-medium text-slate-900 dark:text-white mb-2 italic tracking-tight">Thuộc tính cốt lõi</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Thông tin danh mục chính</p>
                  </header>

                  <form onSubmit={handleUpdateProfile} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                        <input 
                          type="text" 
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          className="w-full h-14 px-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold text-sm italic"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email đăng ký</label>
                        <input 
                          type="email" 
                          value={userData?.email || ''}
                          disabled
                          className="w-full h-14 px-6 bg-slate-100 dark:bg-white/[0.01] border border-slate-200 dark:border-white/[0.02] rounded-2xl text-slate-400 cursor-not-allowed font-semibold text-sm opacity-60"
                        />
                      </div>
                    </div>

                      <div className="space-y-6">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cấu hình bảo mật vĩ mô</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: 'system', label: 'Hệ thống', desc: 'Thông báo cốt lõi', icon: BellRing },
                            { id: 'security', label: 'Bảo mật', desc: 'Nhật ký truy cập', icon: Shield },
                            { id: 'location', label: 'Vị trí', desc: 'Chia sẻ tọa độ', icon: Globe }
                          ].map(item => (
                            <label key={item.id} className="flex flex-col items-center text-center gap-4 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 cursor-pointer group hover:border-slate-300 dark:hover:border-white/20 transition-all">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                (notifPerms as any)[item.id] ? "bg-blue-500 text-white shadow-xl shadow-blue-500/20" : "bg-white dark:bg-white/[0.03] text-slate-300 dark:text-slate-600"
                              )}>
                                 <item.icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{item.label}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.desc}</p>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={(notifPerms as any)[item.id]} 
                                onChange={(e) => setNotifPerms({...notifPerms, [item.id]: e.target.checked})} 
                                className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-white/10 text-blue-500 focus:ring-0 transition-all cursor-pointer"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                    <div className="pt-6">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="h-16 px-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Đồng bộ thông tin'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-12">
                  <header>
                    <h2 className="text-3xl font-display font-medium text-slate-900 dark:text-white mb-2 italic tracking-tight">Liên kết hệ sinh thái</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Các nút nền tảng toàn cầu</p>
                  </header>
                  <form onSubmit={handleUpdateSocialLinks} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {[
                        { id: 'google', label: 'Tài khoản Google' },
                        { id: 'facebook', label: 'Mạng xã hội' },
                        { id: 'github', label: 'Kho lưu trữ' },
                        { id: 'twitter', label: 'Giao thức X' },
                      ].map(provider => (
                        <div key={provider.id} className="space-y-3">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{provider.label}</label>
                          <input 
                            type="text" 
                            value={(socialLinks as any)[provider.id]}
                            onChange={e => setSocialLinks({...socialLinks, [provider.id]: e.target.value})}
                            className="w-full h-14 px-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold text-sm italic"
                            placeholder="Địa chỉ liên kết..."
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-6">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="h-16 px-12 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Cập nhật liên kết'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-16">
                  <div className="space-y-10">
                    <header>
                      <h2 className="text-3xl font-display font-medium text-slate-900 dark:text-white mb-2 italic tracking-tight">Quyền truy cập</h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quyền phần cứng & API</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'camera', label: 'Điều khiển Vision', desc: 'Hình ảnh bảo mật' },
                        { id: 'microphone', label: 'Cổng âm thanh', desc: 'Đồng bộ giọng nói' },
                        { id: 'geolocation', label: 'Vị trí địa lý', desc: 'Vị trí mạng' },
                        { id: 'notifications', label: 'Giao thức Push', desc: 'Truyền trực tiếp' }
                      ].map(perm => (
                        <div key={perm.id} className="flex flex-col p-8 glass-card border border-slate-100 dark:border-white/5 rounded-[1.5rem] group hover:border-blue-500/30 transition-all">
                          <div className="flex items-center justify-between mb-6">
                             <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.05] flex items-center justify-center shadow-sm group-hover:scale-110 transition-all">
                                <CheckCircle2 className={cn(
                                  "w-6 h-6",
                                  (permissions as any)[perm.id] === 'granted' ? "text-blue-500" : "text-slate-200 dark:text-slate-700"
                                )} />
                             </div>
                             <button 
                               onClick={() => handleRequestPermission(perm.id as any)}
                               className={cn(
                                 "w-14 h-7 rounded-full relative transition-all duration-700",
                                 (permissions as any)[perm.id] === 'granted' ? "bg-blue-500" : "bg-slate-200 dark:bg-white/10"
                               )}
                             >
                               <div className={cn(
                                 "absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-500",
                                 (permissions as any)[perm.id] === 'granted' ? "left-8" : "left-1"
                               )} />
                             </button>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{perm.label}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">{perm.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-12 glass rounded-[2.5rem] bg-blue-500 dark:bg-white text-white dark:text-black shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 dark:bg-blue-500/10 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:scale-150 transition-all duration-1000" />
                    <div className="relative z-10 space-y-8">
                      <Smartphone className="w-16 h-16 opacity-30" />
                      <div className="space-y-4">
                        <h2 className="text-4xl font-display font-medium tracking-tight italic leading-none">Phím tắt PWA</h2>
                        <p className="font-bold text-sm max-w-sm leading-relaxed opacity-80">
                          Cài đặt ứng dụng trực tiếp vào màn hình chính để có trải nghiệm tốt nhất.
                        </p>
                        <button 
                          onClick={handleAddToHomeScreen}
                          className="h-16 px-10 bg-white dark:bg-black text-blue-500 dark:text-white rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4"
                        >
                          Cài đặt ngay <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar Intelligence */}
        <aside className="space-y-12">
          <section className="glass p-10 rounded-[2rem] border border-slate-200 dark:border-white/5 space-y-10 shadow-xl shadow-blue-500/5">
            <header className="space-y-1">
              <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white italic tracking-tight flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-500" /> Bảo mật
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-8">Thao tác mã hóa</p>
            </header>
            
            <div className="space-y-4">
              <button 
                onClick={handleChangePassword} 
                disabled={passwordCooldown > 0}
                className="w-full flex items-center justify-between p-6 glass-card rounded-[1.5rem] hover:scale-[1.02] active:scale-[0.98] transition-all group border border-slate-200 dark:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center ring-1 ring-orange-500/20">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1 leading-none">Khóa bảo mật</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none italic">Đổi mật khẩu</p>
                  </div>
                </div>
                {passwordCooldown > 0 ? (
                  <span className="text-[10px] font-bold text-orange-500 tabular-nums">{passwordCooldown}S</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                )}
              </button>

              <button 
                onClick={handleVerifyEmail} 
                disabled={verifyCooldown > 0 || user?.emailVerified}
                className="w-full flex items-center justify-between p-6 glass-card rounded-[1.5rem] hover:scale-[1.02] active:scale-[0.98] transition-all group border border-slate-200 dark:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1 leading-none">Xác thực</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none italic">Xác minh ID</p>
                  </div>
                </div>
                {user?.emailVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : verifyCooldown > 0 ? (
                  <span className="text-[10px] font-bold text-amber-500 tabular-nums">{verifyCooldown}S</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </div>
          </section>

          <section className="bg-slate-900 dark:bg-white rounded-[2.5rem] p-10 text-white dark:text-black shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[80px] -mr-16 -mt-16 pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
            <div className="space-y-10 relative z-10">
              <header className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">Phân tích hệ thống</p>
                <div className="flex items-baseline gap-2">
                   <h4 className="text-3xl font-display font-medium italic">Phiên hoạt động</h4>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </header>
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40 leading-none">Ngày tham gia</p>
                <p className="text-xl font-bold tracking-tight italic tabular-nums">
                  {userData?.createdAt ? toSafeDate(userData.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'KHÔNG XÁC ĐỊNH'}
                </p>
              </div>
            </div>
          </section>
          
          <section className="glass p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 space-y-10 shadow-xl shadow-blue-500/5">
            <header className="space-y-1">
              <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white italic tracking-tight flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-500" /> Luồng sự kiện
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-8">Hoạt động tuần tự</p>
            </header>
            
            <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
              {activities.length > 0 ? (
                activities.map((log) => (
                  <div key={log.id} className="relative pl-8 border-l border-slate-100 dark:border-white/5 group/log space-y-2">
                    <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 group-hover/log:bg-blue-500 transition-colors" />
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover/log:translate-x-1 transition-transform uppercase tracking-wider">{log.description}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] tabular-nums">
                      {log.timestamp ? format(toSafeDate(log.timestamp), 'HH:mm | MMM dd', { locale: vi }) : 'ĐANG ĐỒNG BỘ...'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 space-y-4">
                   <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-white/5 mx-auto flex items-center justify-center">
                      <Clock className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                   </div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Danh sách trống</p>
                </div>
              )}
            </div>
          </section>
        </aside>

      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Camera, Mic, User, Mail, Shield, CheckCircle2, ChevronRight, KeyRound, Clock, Activity, AlertTriangle, Loader2, MapPin, BellRing, Smartphone, ExternalLink, Globe, Copy, Zap, Send, Trash2, LogOut } from 'lucide-react';
import { toSafeDate } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FirebaseError } from 'firebase/app';
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
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 space-y-12">
      
      {/* Header Profile Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-black rounded-2xl p-8 md:p-12 border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/[0.02] flex items-center flex-col md:flex-row gap-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative group mx-auto sm:mx-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            className="hidden" 
            accept="image/*"
          />
          <div 
            className={`w-32 h-32 md:w-44 md:h-44 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl bg-slate-50 dark:bg-slate-900 relative group/avatar cursor-pointer ${uploading ? 'opacity-50' : ''}`}
            onClick={handleAvatarClick}
          >
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-medium text-slate-300 italic group-hover/avatar:scale-110 transition-transform">
                {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="text-center md:text-left space-y-4 relative z-10 flex-1">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-medium text-slate-900 dark:text-white tracking-tight  italic leading-none">
              {userData?.displayName || 'Thành viên'}
            </h1>
            <p className="text-blue-600 font-medium italic flex items-center justify-center md:justify-start gap-2 tracking-tight opacity-70">
               {user?.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <span className="px-5 py-2 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-[10px] font-medium  tracking-[0.2em] text-slate-500 shadow-sm">
              {userData?.role?.toUpperCase() || 'THÀNH VIÊN'}
            </span>
            {user?.emailVerified ? (
              <span className="px-5 py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium  tracking-[0.2em] flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ XÁC MINH
              </span>
            ) : (
              <button 
                onClick={handleVerifyEmail}
                disabled={verifyCooldown > 0}
                className="px-5 py-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-medium  tracking-[0.2em] flex items-center gap-2 hover:bg-amber-500/20 shadow-sm transition-all disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> CHƯA XÁC MINH
              </button>
            )}
            {userData?.role === 'superadmin' && (
              <span className="px-5 py-2 rounded-2xl bg-blue-600 text-white text-[10px] font-medium  tracking-[0.2em] shadow-lg shadow-blue-500/30">
                QUYỀN TỐI CAO
              </span>
            )}
          </div>
          
          <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-2">
             <button
               onClick={handleLogout}
               className="text-[10px] font-medium  tracking-[0.1em] px-4 py-2.5 bg-rose-500 text-white rounded-2xl transition-all shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
             >
               <LogOut className="w-3.5 h-3.5" /> Đăng xuất
             </button>
             {['Bảo mật', 'Cá nhân'].map((item) => (
               <a 
                 key={item}
                 href={`https://myaccount.google.com/${item === 'Bảo mật' ? 'security' : 'personal'}`} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="text-[10px] font-medium  tracking-[0.1em] px-4 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl border border-slate-200 dark:border-white/10 transition-all text-slate-600 dark:text-slate-400 shadow-sm hover:shadow-md"
                >
                  {item} <ExternalLink className="w-3 h-3 inline-block ml-1 opacity-40" />
                </a>
             ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-4 p-2 bg-white dark:bg-white/5 rounded-2xl w-full border border-slate-100 dark:border-white/10 shadow-sm overflow-x-auto no-scrollbar">
            {[
              { id: 'profile', label: 'Tài khoản', icon: User },
              { id: 'social', label: 'Mạng xã hội', icon: Globe },
              { id: 'system', label: 'Hệ thống', icon: Shield },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex-1 flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl text-[11px] font-medium  tracking-normal transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-black rounded-2xl p-10 md:p-12 border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/[0.01]"
              >
                <h2 className="text-2xl font-medium text-slate-900 dark:text-white mb-10 flex items-center gap-4  tracking-tight italic">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  Thông tin cơ bản
                </h2>
                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Tên hiển thị</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Email (Chỉ đọc)</label>
                      <input 
                        type="email" 
                        value={userData?.email || ''}
                        disabled
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1 block mb-6">Tùy chọn nhận thông báo</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'system', label: 'Cập nhật hệ thống', desc: 'Tin tức & Thông báo' },
                        { id: 'security', label: 'Cảnh báo bảo mật', desc: 'Thông báo Đăng nhập & Xác thực' }
                      ].map(item => (
                        <label key={item.id} className="flex items-center gap-5 p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 cursor-pointer group hover:bg-white dark:hover:bg-white/10 transition-all hover:shadow-lg hover:shadow-black/[0.02]">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${(notifPerms as any)[item.id] ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-300'}`}>
                             <BellRing className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-white  tracking-tight">{item.label}</p>
                            <p className="text-[10px] text-slate-400 font-bold  tracking-normal">{item.desc}</p>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={(notifPerms as any)[item.id]} 
                            onChange={(e) => setNotifPerms({...notifPerms, [item.id]: e.target.checked})} 
                            className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-white/10 text-blue-600 focus:ring-0 transition-all cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full sm:w-auto px-10 py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/10 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Lưu Thay Đổi'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'social' && (
              <motion.div 
                key="social"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-black rounded-2xl p-10 md:p-12 border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/[0.01]"
              >
                <h2 className="text-2xl font-medium text-slate-900 dark:text-white mb-10 flex items-center gap-4  tracking-tight italic">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  Liên kết mạng xã hội
                </h2>
                <form onSubmit={handleUpdateSocialLinks} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { id: 'google', label: 'Google Profile' },
                      { id: 'facebook', label: 'Facebook' },
                      { id: 'playGames', label: 'Play Games' },
                      { id: 'github', label: 'GitHub' },
                      { id: 'twitter', label: 'Twitter (X)' },
                    ].map(provider => (
                      <div key={provider.id} className="space-y-3">
                        <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">{provider.label}</label>
                        <input 
                          type="text" 
                          value={(socialLinks as any)[provider.id]}
                          onChange={e => setSocialLinks({...socialLinks, [provider.id]: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                          placeholder={`Link ${provider.label}...`}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-6">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-indigo-600/20"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Lưu Liên Kết'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div 
                key="system"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-10"
              >
                <div className="bg-white dark:bg-black rounded-2xl p-10 md:p-12 border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/[0.01]">
                  <h2 className="text-2xl font-medium text-slate-900 dark:text-white mb-10 flex items-center gap-4  tracking-tight italic">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    Quyền hệ thống
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'camera', label: 'Camera', desc: 'Nhận diện khuôn mặt & Quét' },
                      { id: 'microphone', label: 'Microphone', desc: 'Xác thực giọng nói' },
                      { id: 'geolocation', label: 'Vị trí', desc: 'Xác thực khu vực' },
                      { id: 'notifications', label: 'Thông báo', desc: 'Thông báo tức thì' }
                    ].map(perm => (
                      <div key={perm.id} className="flex flex-col p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 group hover:bg-white dark:hover:bg-white/10 transition-all hover:shadow-lg hover:shadow-black/[0.02]">
                        <div className="flex items-center justify-between mb-4">
                           <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm group-hover:scale-110 transition-all">
                              <CheckCircle2 className={`w-5 h-5 ${(permissions as any)[perm.id] === 'granted' ? 'text-emerald-500' : 'text-slate-300'}`} />
                           </div>
                           <button 
                             onClick={() => handleRequestPermission(perm.id as any)}
                             className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${(permissions as any)[perm.id] === 'granted' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-200 dark:bg-white/10'}`}
                           >
                             <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-500 ease-in-out ${(permissions as any)[perm.id] === 'granted' ? 'left-8' : 'left-1'}`} />
                           </button>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white  tracking-tight italic">{perm.label}</p>
                          <p className="text-[10px] text-slate-400 font-bold  tracking-normal mt-1 opacity-60">{perm.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-10 md:p-14 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:scale-150 transition-all duration-1000" />
                  <div className="relative z-10 space-y-6">
                    <Smartphone className="w-14 h-14 opacity-20" />
                    <div>
                      <h2 className="text-3xl font-medium  tracking-tight italic leading-none mb-4">
                        LỐI TẮT PWA
                      </h2>
                      <p className="text-blue-100 font-bold text-sm max-w-md leading-relaxed opacity-80 mb-10">
                        Cài đặt ứng dụng trực tiếp vào màn hình chính để trải nghiệm mượt mà hơn.
                      </p>
                      <button 
                        onClick={handleAddToHomeScreen}
                        className="px-10 py-5 bg-white text-blue-600 rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl flex items-center gap-3"
                      >
                        Cài Đặt Ngay <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info Panels */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-black rounded-2xl p-8 border border-slate-200 dark:border-white/10 shadow-xl shadow-black/[0.01]">
            <h3 className="font-medium text-slate-900 dark:text-white mb-8 flex items-center gap-3  tracking-tight text-xl italic">
              <Shield className="w-6 h-6 text-indigo-500" />
              Trung tâm bảo mật
            </h3>
            
            <div className="space-y-4">
              <button 
                onClick={handleChangePassword} 
                disabled={passwordCooldown > 0}
                className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-all group border border-slate-100 dark:border-white/10 hover:shadow-lg hover:shadow-black/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-inner">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-900 dark:text-white  tracking-normal text-[10px]">MẬT KHẨU</p>
                    <p className="text-slate-400 text-[10px] font-bold  italic">Cập nhật truy cập</p>
                  </div>
                </div>
                {passwordCooldown > 0 ? (
                  <span className="text-xs font-medium text-orange-500">{passwordCooldown}s</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                )}
              </button>

              <button 
                onClick={handleVerifyEmail} 
                disabled={verifyCooldown > 0 || user?.emailVerified}
                className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-all group border border-slate-100 dark:border-white/10 hover:shadow-lg hover:shadow-black/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-900 dark:text-white  tracking-normal text-[10px]">XÁC MINH ID</p>
                    <p className="text-slate-400 text-[10px] font-bold  italic">Định danh toàn cầu</p>
                  </div>
                </div>
                {user?.emailVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : verifyCooldown > 0 ? (
                  <span className="text-xs font-medium text-amber-500">{verifyCooldown}s</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[80px] -mr-12 -mt-12 pointer-events-none transition-transform duration-700 group-hover:scale-150" />
            <h3 className="font-medium text-white/40  tracking-normal text-[10px] mb-8">Phân tích hệ thống</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-medium text-white/30  tracking-[0.2em] mb-2 leading-none">GIA NHẬP BMASS HD</p>
                <p className="text-2xl font-medium tracking-tight italic">
                  {userData?.createdAt ? toSafeDate(userData.createdAt).toLocaleDateString('vi-VN') : 'Unknown'}
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 text-[11px] font-bold text-slate-400">
                <span className="text-emerald-400 mr-2">●</span> Trạng thái: Hoạt động
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-2xl p-8 border border-slate-200 dark:border-white/10 shadow-xl shadow-black/[0.01]">
            <h3 className="font-medium text-slate-900 dark:text-white mb-8 flex items-center gap-3  tracking-tight text-xl italic">
              <Activity className="w-6 h-6 text-blue-500" />
              Nhật ký gần đây
            </h3>
            
            <div className="space-y-6">
              {activities.length > 0 ? (
                activities.map((log) => (
                  <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 dark:border-white/5 group/log space-y-1">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 transition-colors group-hover/log:bg-blue-600" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover/log:translate-x-1 transition-transform">{log.description}</p>
                    <p className="text-[9px] text-slate-400 font-medium  tracking-normal">
                      {log.timestamp ? format(toSafeDate(log.timestamp), 'HH:mm', { locale: vi }) : 'ĐANG ĐỒNG BỘ'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-medium  tracking-normal">
                   Không có sự kiện gần đây
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

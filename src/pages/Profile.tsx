import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Camera, User, Globe, Shield, CheckCircle2, ChevronRight, KeyRound, Activity, AlertTriangle, Loader2, BellRing, Smartphone, LogOut, Clock, ArrowRight } from 'lucide-react';
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
  const [notifPerms, setNotifPerms] = useState({ system: true, security: true, location: true });
  const [activeTab, setActiveTab] = useState<'profile' | 'social' | 'system'>('profile');
  const [socialLinks, setSocialLinks] = useState({
    google: '', facebook: '', github: '', twitter: ''
  });

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
        const [cam, mic, loc, notif] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as any }),
          navigator.permissions.query({ name: 'microphone' as any }),
          navigator.permissions.query({ name: 'geolocation' as any }),
          navigator.permissions.query({ name: 'notifications' as any })
        ]);
        
        const updateState = () => setPermissions({
          camera: cam.state,
          microphone: mic.state,
          geolocation: loc.state,
          notifications: notif.state
        });

        updateState();
        cam.onchange = updateState;
        mic.onchange = updateState;
        loc.onchange = updateState;
        notif.onchange = updateState;
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
      if (type === 'camera') await navigator.mediaDevices.getUserMedia({ video: true });
      else if (type === 'microphone') await navigator.mediaDevices.getUserMedia({ audio: true });
      else if (type === 'geolocation') await new Promise((r, j) => navigator.geolocation.getCurrentPosition(r, j));
      else if (type === 'notifications') await Notification.requestPermission();
      toast.success('Quyền đã được cập nhật');
    } catch (err) {
      toast.error('Không thể kích hoạt quyền. Vui lòng kiểm tra cài đặt trình duyệt.');
    }
  };

  const handleAddToHomeScreen = async () => {
    if (!deferredPrompt) return toast.error('Hệ thống không hỗ trợ PWA lúc này');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Đã cài đặt thành công!');
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    if (userData?.notificationPreferences) setNotifPerms(prev => ({ ...prev, ...userData.notificationPreferences }));
    if (userData?.socialLinks) setSocialLinks(prev => ({ ...prev, ...userData.socialLinks }));
    if (userData?.displayName) setDisplayName(userData.displayName);
  }, [userData]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'activities'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setActivities(all.sort((a,b) => {
        const da = a.timestamp ? toSafeDate(a.timestamp).getTime() : 0;
        const db = b.timestamp ? toSafeDate(b.timestamp).getTime() : 0;
        return db - da;
      }).slice(0, 10));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPasswordCooldown(c => Math.max(0, c - 1));
      setVerifyCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Ảnh không được quá 2MB');

    setUploading(true);
    const toastId = toast.loading('Đang tải lên...');
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Cập nhật ảnh đại diện');
      toast.success('Thành công', { id: toastId });
    } catch (error) {
      toast.error('Lỗi tải ảnh', { id: toastId });
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
      await updateDoc(doc(db, 'users', user.uid), { displayName, notificationPreferences: notifPerms });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Cập nhật thông tin');
      toast.success('Đã lưu');
    } catch (e) { toast.error('Lỗi'); } finally { setLoading(false); }
  };

  const handleUpdateSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { socialLinks });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Cập nhật kết nối');
      toast.success('Đã lưu');
    } catch (e) { toast.error('Lỗi'); } finally { setLoading(false); }
  };

  const handleChangePassword = () => {
    if (!user?.email || passwordCooldown > 0) return;
    openConfirm({
      title: 'Mật khẩu',
      message: 'Gửi email đặt lại mật khẩu?',
      confirmText: 'Gửi ngay',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await sendPasswordResetEmail(auth, user.email!);
        setPasswordCooldown(60);
        toast.success('Đã gửi email');
      }
    });
  };

  const handleVerifyEmail = () => {
    if (!user || verifyCooldown > 0 || user.emailVerified) return;
    openConfirm({
      title: 'Xác minh',
      message: 'Gửi email xác minh bản thân?',
      confirmText: 'Xác minh',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await sendEmailVerification(user);
        setVerifyCooldown(60);
        toast.success('Đã gửi email');
      }
    });
  };

  const handleLogout = async () => {
    openConfirm({
      title: 'Đăng xuất',
      message: 'Bạn muốn rời khỏi hệ thống?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await signOut(auth);
        toast.success('Hẹn gặp lại');
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-24">
      <div className="space-y-12">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 flex flex-col md:flex-row items-center gap-10"
        >
          <div className="relative shrink-0">
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
            <div 
              className={cn(
                "w-32 h-32 md:w-48 md:h-48 rounded-3xl overflow-hidden border-4 border-white/5 shadow-xl bg-slate-900 relative cursor-pointer",
                uploading && "opacity-50"
              )}
              onClick={handleAvatarClick}
            >
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-display font-medium text-slate-700 uppercase">
                  {userData?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              {uploading && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white animate-spin" />}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold tracking-widest uppercase text-indigo-400">
                {userData?.role || 'Member'}
              </span>
              <h1 className="text-4xl md:text-6xl font-display font-medium text-white tracking-tight">
                {userData?.displayName || 'Cư dân'}
              </h1>
              <p className="text-slate-400 font-medium">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
               <button onClick={handleLogout} className="px-6 py-3 bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/5 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase">
                 Đăng xuất
               </button>
               {!user?.emailVerified && (
                 <button onClick={handleVerifyEmail} disabled={verifyCooldown > 0} className="px-6 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-bold tracking-widest uppercase">
                   Xác minh
                 </button>
               )}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <nav className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
              {[
                { id: 'profile', label: 'Cài đặt', icon: User },
                { id: 'social', label: 'Kết nối', icon: Globe },
                { id: 'system', label: 'Quyền', icon: Shield },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)} 
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all",
                    activeTab === tab.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-8 md:p-12"
              >
                {activeTab === 'profile' && (
                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tên hiển thị</label>
                        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 font-medium text-sm text-white outline-none focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UID</label>
                        <input type="text" value={user?.uid || ''} disabled className="w-full bg-white/5 border border-white/5 rounded-xl px-5 py-3.5 font-medium text-sm text-slate-600 italic cursor-not-allowed" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Thông báo</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'system', label: 'Hệ thống', icon: BellRing },
                          { id: 'security', label: 'Bảo mật', icon: Shield },
                          { id: 'location', label: 'Vị trí', icon: Globe }
                        ].map(item => (
                          <label key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4 text-slate-500" />
                              <span className="text-xs font-bold text-slate-300 uppercase">{item.label}</span>
                            </div>
                            <div 
                              onClick={() => setNotifPerms({...notifPerms, [item.id]: !(notifPerms as any)[item.id]})}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-all duration-300",
                                (notifPerms as any)[item.id] ? "bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" : "bg-white/10"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300",
                                (notifPerms as any)[item.id] ? "left-6" : "left-1"
                              )} />
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all">
                      {loading ? 'Đang lưu...' : 'Đồng bộ'}
                    </button>
                  </form>
                )}

                {activeTab === 'social' && (
                  <form onSubmit={handleUpdateSocialLinks} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {['google', 'github', 'facebook', 'twitter'].map(id => (
                        <div key={id} className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{id}</label>
                          <input type="text" value={(socialLinks as any)[id] || ''} onChange={e => setSocialLinks({...socialLinks, [id]: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 font-medium text-sm text-white outline-none focus:border-indigo-500 transition-all" />
                        </div>
                      ))}
                    </div>
                    <button type="submit" className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Cập nhật</button>
                  </form>
                )}

                {activeTab === 'system' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['camera', 'microphone', 'geolocation', 'notifications'].map(id => (
                        <div key={id} className="flex items-center justify-between p-5 bg-white/3 border border-white/5 rounded-xl">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{id}</span>
                          <button onClick={() => handleRequestPermission(id as any)} className="text-[10px] font-bold text-indigo-400 uppercase">
                             {(permissions as any)[id] === 'granted' ? 'Enabled' : 'Click to enable'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl space-y-4">
                      <Smartphone className="w-8 h-8 text-indigo-400" />
                      <h3 className="text-lg font-display font-medium text-white uppercase">Cài đặt PWA</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Cài đặt ứng dụng vào màn hình chính để trải nghiệm mượt mà hơn.</p>
                      <button onClick={handleAddToHomeScreen} className="px-6 py-3 bg-indigo-600 text-white font-bold text-[10px] uppercase rounded-lg">Cài đặt</button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="space-y-8">
            <section className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-display font-medium text-white uppercase tracking-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" /> Bảo mật
              </h3>
              <div className="space-y-3">
                <button onClick={handleChangePassword} disabled={passwordCooldown > 0} className="w-full flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 transition-all">
                  <span className="text-xs font-bold text-slate-300 uppercase">Đổi mật khẩu</span>
                  {passwordCooldown > 0 ? <span className="text-xs text-orange-400">{passwordCooldown}s</span> : <ChevronRight className="w-4 h-4 text-slate-700" />}
                </button>
                <button onClick={handleVerifyEmail} disabled={user?.emailVerified} className="w-full flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 transition-all">
                  <span className="text-xs font-bold text-slate-300 uppercase">Xác minh ID</span>
                  {user?.emailVerified ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4 text-slate-700" />}
                </button>
              </div>
            </section>

            <section className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-display font-medium text-white uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" /> Hoạt động
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {activities.length > 0 ? activities.map(log => (
                  <div key={log.id} className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-300 uppercase">{log.description}</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase">
                      {log.timestamp ? format(toSafeDate(log.timestamp), 'HH:mm - dd/MM/yyyy') : '...'}
                    </p>
                  </div>
                )) : <p className="text-[10px] font-bold text-slate-600 uppercase text-center py-4">Trống</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

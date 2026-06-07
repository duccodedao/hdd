import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useSearchParams } from 'react-router-dom';
import { doc, updateDoc, setDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { uploadToGitHub } from '../services/githubService';
import toast from 'react-hot-toast';
import { 
  Camera, User, Shield, CheckCircle2, ChevronRight, KeyRound, 
  Activity, Loader2, Settings, HelpCircle, Zap, Brush, Mail,
  Smartphone, Bell, Globe, LogOut, Clock, ArrowUpRight, MapPin, Download,
  Check, Info, Sparkles, Sliders, Laptop, ShieldCheck, Moon, Sun, ArrowDownLeft, Trash
} from 'lucide-react';
import { toSafeDate, cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useConfirmStore } from '../store/confirmStore';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';
import { KeyboardShortcutsModal } from '../components/ui/KeyboardShortcutsModal';
import { Helmet } from 'react-helmet-async';

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  timestamp: any;
}

export default function Profile() {
  const { user, userData } = useAuthStore();
  const { darkMode, toggleDarkMode } = useAppStore();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || '');
  const [socialLinks, setSocialLinks] = useState({ github: '', twitter: '', linkedin: '', facebook: '' });
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirmStore();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentLocationName, setCurrentLocationName] = useState('Đang xác định...');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'vi');

  // Notification Preferences States
  const [notifSystem, setNotifSystem] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [notifFiles, setNotifFiles] = useState(false);

  const [permissions, setPermissions] = useState({
    geolocation: 'prompt' as PermissionState
  });

  // Sync state initially
  useEffect(() => {
    if (userData) {
      if (userData.displayName) setDisplayName(userData.displayName);
      if (userData.phoneNumber) setPhoneNumber(userData.phoneNumber);
      if (userData.notificationPreferences) {
        setNotifSystem(userData.notificationPreferences.system ?? true);
        setNotifSecurity(userData.notificationPreferences.security ?? true);
        setNotifFiles(userData.notificationPreferences.files ?? false);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch UserProfile
    const unsubProfile = onSnapshot(doc(db, 'user_profiles', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSocialLinks(data.socialLinks || { github: '', twitter: '', linkedin: '', facebook: '' });
        setBadges(data.badges || []);
      }
    });

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
        console.error("Permission check failed", e?.message || String(e));
      }
    };
    checkPermissions();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1&email=sonlyhongduc@gmail.com`, {
            headers: { 'Accept-Language': 'vi' }
          });
          const data = await res.json();
          if (data?.address) {
            const addr = data.address;
            const parts = [];
            const ward = addr.quarter || addr.suburb || addr.village || addr.hamlet || addr.neighbourhood;
            const district = addr.city_district || addr.county || addr.district || addr.town;
            const city = addr.city || addr.state || addr.province;
            if (ward) parts.push(ward);
            if (district) parts.push(district);
            if (city) parts.push(city);
            
            setCurrentLocationName(parts.length > 0 ? parts.join(', ') : (data.display_name || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`));
          } else {
            setCurrentLocationName(data.display_name || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          }
        } catch (e) {
          setCurrentLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
      }, () => setCurrentLocationName('Quyền định vị bị từ chối'));
    }

    return () => {
      unsub();
      unsubProfile();
      clearInterval(timer);
    };
  }, [user]);

  // Read URL query tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'security', 'preferences', 'activity'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Kích thước ảnh phải dưới 2MB');

    setUploading(true);
    const toastId = toast.loading('Đang tải ảnh đại diện lên...');
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const githubUrl = await uploadToGitHub(file, `avatar_${user.uid}_${file.name}`, `assets/avatars/${user.uid}/${Date.now()}_${file.name}`);
      
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { 
        photoURL: url,
        githubAvatarUrl: githubUrl || null
      });
      
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

      await logActivity(ActivityType.UPDATE_PROFILE, 'Đã cập nhật ảnh đại diện mới.');
      toast.success('Đã cập nhật ảnh đại diện thành công!', { id: toastId });
    } catch (error) {
      toast.error('Lỗi khi tải ảnh đại diện lên', { id: toastId });
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
        phoneNumber,
        notificationPreferences: {
          system: notifSystem,
          security: notifSecurity,
          files: notifFiles
        }
      });
      await setDoc(doc(db, 'user_profiles', user.uid), { 
        uid: user.uid,
        displayName,
        email: user.email,
        socialLinks 
      }, { merge: true });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Cập nhật định danh hiển thị và cài đặt cá nhân.');
      toast.success('Đã cập nhật hồ sơ & cấu hình.');
    } catch (e) { 
      console.error(e); 
      toast.error('Lỗi khi lưu dữ liệu'); 
    } finally { 
      setLoading(false); 
    }
  };

  const saveNotificationPref = async (key: 'system' | 'security' | 'files', value: boolean) => {
    if (!user) return;
    try {
      const prefs = {
        system: key === 'system' ? value : notifSystem,
        security: key === 'security' ? value : notifSecurity,
        files: key === 'files' ? value : notifFiles
      };
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: prefs
      });
      toast.success('Cập nhật quyền thông báo thành công');
    } catch (err) {
      toast.error('Không thể đồng bộ cài đặt thông báo');
    }
  };

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    localStorage.setItem('language', val);
    toast.success(val === 'vi' ? 'Đã đổi ngôn ngữ sang Tiếng Việt' : 'Language switched to English');
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Liên kết xác minh đã được gửi tới hòm thư của bạn.');
      await logActivity(ActivityType.SECURITY_CHANGE, 'Gửi yêu cầu xác minh tài khoản Email.');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi yêu cầu xác minh.');
    }
  };

  const handleLogout = async () => {
    openConfirm({
      title: 'Đăng xuất tài khoản',
      message: 'Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại trên hệ thống?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        await signOut(auth);
        toast.success('Hẹn gặp lại quý khách!');
      }
    });
  };

  const handleChangePassword = () => {
    if (!user?.email || passwordCooldown > 0) return;
    openConfirm({
      title: 'Lấy lại mật khẩu',
      message: `Hệ thống sẽ gửi một liên kết đổi mật khẩu bảo mật đến địa chỉ email: ${user.email}. Bạn có muốn tiếp tục?`,
      confirmText: 'Gửi mã bảo mật',
      cancelText: 'Quay lại',
      onConfirm: async () => {
        await sendPasswordResetEmail(auth, user.email!);
        setPasswordCooldown(60);
        toast.success('Đã gửi email khôi phục mật khẩu.');
        await logActivity(ActivityType.SECURITY_CHANGE, 'Gửi email đặt lại mật khẩu.');
      }
    });
  };

  // Convert Firebase user metadata to visual representation
  const joinDate = user?.metadata?.creationTime 
    ? format(new Date(user.metadata.creationTime), 'dd MMMM, yyyy', { locale: vi })
    : userData?.createdAt 
      ? format(toSafeDate(userData.createdAt), 'dd MMMM, yyyy', { locale: vi }) 
      : 'Không xác định';

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-12 px-4 lg:px-8 relative min-h-screen text-slate-800 dark:text-zinc-200">
      <Helmet>
        <title>Trung tâm tài khoản | BMass Ecosystem</title>
        <meta name="description" content="Quản lý định danh cá nhân số hóa chính hãng và an toàn mật vụ bảo mật." />
      </Helmet>
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Breadcrumb & Section Header */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-950 rounded-full text-indigo-600 dark:text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Account Node v5.0</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
              Cá nhân hóa
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-medium">
              Định danh chủ thể, cấu hình bảo an số và thiết lập hạ tầng tương tác.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout} 
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all flex items-center gap-2 border border-rose-100 dark:border-rose-950"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout - Bento System */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Identity Bento & Tab Controller */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Identity Glassmorphism Card */}
          <div className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-md rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl -mr-12 -mt-12 pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/3 blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center">
              
              {/* Dynamic Camera Avatar upload frame */}
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="relative group/avatar cursor-pointer mb-5"
                title="Thay đổi ảnh đại diện cá nhân"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*" 
                />
                
                {/* Visual Glass Edge Rings */}
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 rounded-[2.5rem] opacity-70 blur-xs group-hover/avatar:opacity-100 group-hover/avatar:scale-102 transition-all duration-500" />
                
                <div className="relative w-28 h-28 rounded-[2.25rem] overflow-hidden bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-inner">
                  {userData?.photoURL ? (
                    <img 
                      src={userData.photoURL} 
                      alt="User Identity Avatar" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-400 dark:text-zinc-500" />
                  )}

                  {/* Mask Layer Hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-white">
                    <Camera className="w-5 h-5 animate-pulse" />
                    <span className="text-[8px] uppercase tracking-widest font-black">Cập nhật</span>
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-[7px] uppercase tracking-widest">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges & Role Status */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                  userData?.role === 'superadmin' 
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'
                    : userData?.role === 'admin'
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                      : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20'
                )}>
                  {userData?.role === 'superadmin' ? 'Super Admin' : userData?.role === 'admin' ? 'Administrator' : 'Chủ thể'}
                </span>
                
                {user?.emailVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                    Unverified
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1 px-4 text-center truncate w-full">
                {userData?.displayName || 'Thành viên mới'}
              </h2>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mb-4 truncate w-full px-4 text-center">
                {userData?.email}
              </p>

              {/* Join Date Block */}
              <div className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-white/5 text-[11px]">
                <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-400 font-bold uppercase text-[8px] tracking-wider leading-none">Ngày tham gia</p>
                  <p className="text-slate-700 dark:text-zinc-300 font-black mt-1">{joinDate}</p>
                </div>
              </div>



            </div>
          </div>

          {/* Vertical Glass Navigation Control Tabs */}
          <div className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-md rounded-3xl p-3 border border-slate-200/50 dark:border-white/5 shadow-xl space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3 py-2">Quản trị phân mục</p>
            {[
              { id: 'profile', label: 'Hồ sơ định danh', desc: 'Chỉnh sửa danh tính số', icon: User },
              { id: 'security', label: 'Bảo mật & Xác thực', desc: 'Mật khẩu & Email', icon: Shield },
              { id: 'preferences', label: 'Thiết lập & Giao diện', desc: 'Theme, Ngôn ngữ, Thông báo', icon: Sliders },
              { id: 'activity', label: 'Nhật ký hoạt động', desc: 'Xem vết lịch sử hệ thống', icon: Activity },
            ].map(tab => (
              <button 
                key={tab.id} 
                type="button"
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-300 group cursor-pointer",
                  activeTab === tab.id 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1" 
                    : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors shrink-0",
                  activeTab === tab.id 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-50 dark:bg-zinc-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 text-slate-400 dark:text-zinc-600 group-hover:text-indigo-500"
                )}>
                  <tab.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-black tracking-tight",
                    activeTab === tab.id ? "text-white" : "text-slate-800 dark:text-zinc-200"
                  )}>{tab.label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">{tab.desc}</p>
                </div>
                <ChevronRight className={cn(
                  "w-3.5 h-3.5 transition-transform duration-300",
                  activeTab === tab.id ? "text-white translate-x-1" : "text-slate-300 group-hover:translate-x-1"
                )} />
              </button>
            ))}
          </div>

          {/* Live Geospatial Tracker Card */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-emerald-500/5 to-transparent backdrop-blur-md rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 shadow-lg relative overflow-hidden">
            <div className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-indigo-500 mt-1 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tọa độ truy cập hiện thời</h4>
                <p className="text-[11px] font-black text-slate-800 dark:text-zinc-200 leading-relaxed max-w-[240px]">
                  {currentLocationName}
                </p>
                <p className="text-[9px] text-slate-400 italic">Cập nhật tự động dựa trên Nominatim Reverse Geocoder.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Tab Panel Container with motion animations */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/5 shadow-xl min-h-[460px]"
            >
              
              {/* TAB 1: PROFILE MANAGEMENT */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-500" />
                      Thông tin hồ sơ định danh
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Cập nhật danh xưng, phương thức liên lạc viễn thông và các tài khoản xã hội đồng bộ hóa đặc quyền.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Tên hiển thị (Display Name)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={displayName} 
                            onChange={e => setDisplayName(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400" 
                            placeholder="Tên thật hoặc nghệ danh..."
                          />
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Kênh liên lạc chính (Phone Number)</label>
                        <div className="relative">
                          <input 
                            type="tel" 
                            value={phoneNumber} 
                            onChange={e => setPhoneNumber(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400" 
                            placeholder="Số liên lạc điện thoại..."
                          />
                          <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Liên kết mạng xã hội chính thức (Social links)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'github', label: 'GitHub Profile', placeholder: 'https://github.com/username' },
                          { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/username' },
                          { key: 'linkedin', label: 'LinkedIn Workspace', placeholder: 'https://linkedin.com/in/username' },
                          { key: 'facebook', label: 'Facebook Personal', placeholder: 'https://facebook.com/username' },
                        ].map((item) => (
                          <div key={item.key} className="space-y-1.5">
                            <span className="text-[9px] font-extrabold text-slate-400 pl-1 capitalize">{item.label}</span>
                            <input 
                              type="text" 
                              value={(socialLinks as any)[item.key] || ''} 
                              onChange={e => setSocialLinks({ ...socialLinks, [item.key]: e.target.value })} 
                              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-850 dark:text-zinc-200 outline-none" 
                              placeholder={item.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Huy hiệu đạt được (Earned Badges)</h4>
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        {badges.length > 0 ? badges.map(b => (
                          <span key={b} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-900/30">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            {b}
                          </span>
                        )) : (
                          <div className="text-center py-2 text-slate-400 text-[10px] font-bold w-full italic">
                            Chưa có chứng nhận huy hiệu nào được phân bổ.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Lưu thông tin định danh
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: SECURITY & VERIFICATION */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-500" />
                      Trung tâm bảo mật & Xác thực email
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Kiểm soát trạng thái xác thực Gmail, đặt lại mật khẩu và cấu hình cơ chế bảo hộ.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Gmail Verification block */}
                    <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-zinc-200">Địa chỉ Email liên kết</p>
                          <p className="text-[11px] text-slate-500 font-bold">{user?.email || 'N/A'}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {user?.emailVerified ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="w-3 h-3" /> Đã xác thực
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md">
                                Chưa xác thực
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!user?.emailVerified && (
                        <button 
                          type="button"
                          onClick={handleSendVerification}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Gửi link xác minh
                        </button>
                      )}
                    </div>

                    {/* Change Password block */}
                    <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-zinc-200">Đổi mật khẩu tài khoản</p>
                          <p className="text-[11px] text-slate-400 font-bold">Thực hiện cập nhật mật khẩu mới thông qua email khôi phục.</p>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={handleChangePassword}
                        disabled={passwordCooldown > 0}
                        className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {passwordCooldown > 0 ? `Chờ ${passwordCooldown}s` : 'Yêu cầu đổi mật khẩu'}
                      </button>
                    </div>

                    {/* Visual 2FA & advanced indicators */}
                    <div className="p-5 border border-dashed border-indigo-500/20 dark:border-indigo-500/10 bg-indigo-500/5 dark:bg-indigo-500/2 text-indigo-600 dark:text-zinc-100 rounded-3xl space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Hạ tầng bảo hộ đa nhân tố (2FA)</h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-1">
                        Tích hợp cơ chế xác minh thứ cấp thông qua mã khóa One-Time Password nhằm giảm rủi ro xâm nhập.
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 pl-1">
                        <span className="px-3 py-1 bg-white/50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400">
                          2FA OTP: Disabled
                        </span>
                        <span className="px-3 py-1 bg-white/50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-500">
                          IP Shielding: Active
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: GENERAL SETTINGS, THEME & LANGUAGE */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-500" />
                      Cài đặt hệ thống & Chủ đề giao diện
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Cân chỉnh tính năng hiển thị chủ đề tối/sáng, lọc hạ tầng ngôn ngữ ưu tiên và cấu hình tiếp nhận email báo cáo.
                    </p>
                  </div>

                  <div className="space-y-6">
                    
                    {/* Theme selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Phong cách hiển thị (Theme Setup)</label>
                      <div className="grid grid-cols-2 gap-4">
                        
                        <div 
                          onClick={() => { if (darkMode) toggleDarkMode(); }}
                          className={cn(
                            "cursor-pointer p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between",
                            !darkMode 
                              ? "bg-slate-100 dark:bg-zinc-900 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/10" 
                              : "bg-slate-50/50 dark:bg-zinc-950/35 border-slate-200/50 dark:border-white/5 text-slate-500"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold">Chủ đề Sáng</span>
                          </div>
                          {!darkMode && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>

                        <div 
                          onClick={() => { if (!darkMode) toggleDarkMode(); }}
                          className={cn(
                            "cursor-pointer p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between",
                            darkMode 
                              ? "bg-zinc-900 border-indigo-400 text-white ring-2 ring-indigo-400/10" 
                              : "bg-slate-50/50 dark:bg-zinc-950/35 border-slate-200/50 dark:border-white/5 text-slate-500"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Moon className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold">Chủ đề Tối</span>
                          </div>
                          {darkMode && <Check className="w-4 h-4 text-indigo-400" />}
                        </div>

                      </div>
                    </div>

                    {/* Language selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Ngôn ngữ ưu tiên (Language Selector)</label>
                      <div className="flex gap-2">
                        {[
                          { key: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
                          { key: 'en', label: 'English', flag: '🇺🇸' },
                        ].map((lnG) => (
                          <button
                            key={lnG.key}
                            type="button"
                            onClick={() => handleLanguageChange(lnG.key)}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 border cursor-pointer",
                              language === lnG.key
                                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-400"
                            )}
                          >
                            <span>{lnG.flag}</span>
                            <span>{lnG.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notification toggles */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Thiết lập thông báo tự động (Notifications)</label>

                      <div className="space-y-3">
                        {[
                          { 
                            id: 'system', 
                            label: 'Bản tin hệ thống & cập nhật', 
                            desc: 'Nhận báo cáo kế hoạch bảo trì nâng cấp máy chủ từ phòng kỹ thuật.',
                            val: notifSystem,
                            setter: setNotifSystem
                          },
                          { 
                            id: 'security', 
                            label: 'Cảnh báo đăng nhập & an ninh', 
                            desc: 'Cảnh báo tức thì khi tài khoản có truy cập lạ hoặc đổi mật khẩu.',
                            val: notifSecurity,
                            setter: setNotifSecurity
                          },
                          { 
                            id: 'files', 
                            label: 'Đồng bộ hóa sao lưu tệp tin', 
                            desc: 'Gửi email báo cáo chi tiết khi tài nguyên được đẩy lên kho lưu trữ GitHub.',
                            val: notifFiles,
                            setter: setNotifFiles
                          }
                        ].map((opt) => (
                          <div key={opt.id} className="p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{opt.label}</p>
                              <p className="text-[10px] text-slate-400 leading-relaxed">{opt.desc}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const nVal = !opt.val;
                                opt.setter(nVal);
                                saveNotificationPref(opt.id as any, nVal);
                              }}
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none",
                                opt.val ? "bg-indigo-600" : "bg-slate-200 dark:bg-zinc-800"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow shadow-indigo-500/25 transition duration-200 ease-in-out",
                                  opt.val ? "translate-x-5" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT LOGS */}
              {activeTab === 'activity' && (
                <div className="space-y-8">
                  
                  {/* Audit timeline logs */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 dark:border-white/5 pb-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        Lịch sử hoạt động của bạn
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Ghi nhận chi tiết lịch sử hệ thống hành vi bảo mật & thao tác.</p>
                    </div>

                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-100 dark:before:bg-white/5 pt-4">
                      {activities.slice(0, 5).map((log, idx) => {
                        const TypeIcon = {
                          [ActivityType.LOGIN]: KeyRound,
                          [ActivityType.UPDATE_PROFILE]: User,
                          [ActivityType.SECURITY_CHANGE]: Shield,
                          [ActivityType.UPLOAD_FILE]: ArrowUpRight,
                          [ActivityType.ADMIN_ACTION]: Zap
                        }[log.type as ActivityType] || Activity;

                        return (
                          <div key={log.id} className="flex gap-4 items-start relative z-10">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 shadow flex items-center justify-center shrink-0">
                              <TypeIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                            </div>
                            <div className="bg-slate-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex-1 space-y-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{log.description}</p>
                              <div className="flex items-center gap-2 text-[9px] text-slate-400 justify-between">
                                <span className="font-mono bg-white dark:bg-black/30 px-1 py-0.5 rounded border border-slate-100 dark:border-white/5">{log.type}</span>
                                <span>{log.timestamp ? format(toSafeDate(log.timestamp), 'HH:mm • dd/MM/yyyy') : 'Vừa xong'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

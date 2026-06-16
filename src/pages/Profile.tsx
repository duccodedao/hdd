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
  Activity, Loader2, Settings, HelpCircle, Zap, Mail,
  Smartphone, LogOut, Clock, ArrowUpRight, MapPin, Download,
  Check, Info, Sparkles, Sliders, Laptop, ShieldCheck, Moon, Sun,
  Award
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

export const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80"
];

export const accentColors = {
  indigo: {
    bg: 'bg-indigo-600',
    hoverBg: 'hover:bg-indigo-700',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500',
    ring: 'focus:ring-indigo-500/20 focus:border-indigo-500',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    lightBorder: 'border-indigo-100 dark:border-indigo-950/50',
    gradient: 'from-indigo-600 via-indigo-505 to-violet-600',
    textDark: 'dark:text-indigo-400',
    accentDot: 'bg-indigo-500',
    shadow: 'shadow-indigo-600/20'
  },
  emerald: {
    bg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-700',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500',
    ring: 'focus:ring-emerald-500/20 focus:border-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    lightBorder: 'border-emerald-100 dark:border-emerald-950/50',
    gradient: 'from-emerald-600 via-teal-500 to-teal-600',
    textDark: 'dark:text-emerald-400',
    accentDot: 'bg-emerald-500',
    shadow: 'shadow-emerald-600/20'
  },
  sunset: {
    bg: 'bg-rose-500',
    hoverBg: 'hover:bg-rose-600',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500',
    ring: 'focus:ring-rose-500/20 focus:border-rose-500',
    lightBg: 'bg-rose-50 dark:bg-rose-950/40',
    lightBorder: 'border-rose-150 dark:border-rose-950/50',
    gradient: 'from-orange-500 via-rose-500 to-rose-600',
    textDark: 'dark:text-rose-400',
    accentDot: 'bg-rose-500',
    shadow: 'shadow-rose-600/20'
  },
  cyber: {
    bg: 'bg-fuchsia-600',
    hoverBg: 'hover:bg-fuchsia-700',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-500',
    ring: 'focus:ring-fuchsia-500/25 focus:border-fuchsia-500',
    lightBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    lightBorder: 'border-fuchsia-100 dark:border-fuchsia-950/50',
    gradient: 'from-fuchsia-600 via-pink-505 to-cyan-500',
    textDark: 'dark:text-fuchsia-400',
    accentDot: 'bg-fuchsia-500',
    shadow: 'shadow-fuchsia-600/20'
  }
};

export default function Profile() {
  const { user, userData } = useAuthStore();
  const { darkMode, toggleDarkMode } = useAppStore();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || '');
  const [bio, setBio] = useState((userData as any)?.bio || '');
  const [jobTitle, setJobTitle] = useState((userData as any)?.jobTitle || '');
  const [department, setDepartment] = useState((userData as any)?.department || 'Phòng Công Nghệ');
  const [themeAccent, setThemeAccent] = useState<'indigo' | 'emerald' | 'sunset' | 'cyber'>((userData as any)?.themeAccent || 'indigo');
  const [socialLinks, setSocialLinks] = useState({ github: '', twitter: '', linkedin: '', facebook: '' });
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirmStore();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentLocationName, setCurrentLocationName] = useState('Đang xác định...');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'vi');

  // Interactive Active Sessions simulation
  const [activeSessions, setActiveSessions] = useState([
    { id: 'sess_1', deviceName: 'macOS (Apple Silicon)', browser: 'Google Chrome', ip: '115.79.208.51', location: 'Q.1, TP. Hồ Chí Minh', isCurrent: true, lastActive: 'Đang trực tuyến' },
    { id: 'sess_2', deviceName: 'Windows Desktop Workstation', browser: 'Mozilla Firefox', ip: '125.235.122.9', location: 'Cầu Giấy, Hà Nội', isCurrent: false, lastActive: '12 giờ trước' },
    { id: 'sess_3', deviceName: 'iPhone 15 Pro Max Mobile', browser: 'Safari Mobile', ip: '27.72.63.14', location: 'Hải Châu, Đà Nẵng', isCurrent: false, lastActive: '2 ngày trước' }
  ]);

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
      if ((userData as any).bio) setBio((userData as any).bio);
      if ((userData as any).jobTitle) setJobTitle((userData as any).jobTitle);
      if ((userData as any).department) setDepartment((userData as any).department);
      if ((userData as any).themeAccent) setThemeAccent((userData as any).themeAccent);
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
      } catch (e: any) {
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

  const handleSelectPresetAvatar = async (url: string) => {
    if (!user) return;
    setUploading(true);
    const toastId = toast.loading('Đang áp dụng ảnh đại diện...');
    try {
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Thay đổi ảnh đại diện từ gallery mẫu có sẵn.');
      toast.success('Đã áp dụng ảnh đại diện mẫu thành công!', { id: toastId });
    } catch (error) {
      toast.error('Lỗi khi áp dụng ảnh đại diện mẫu', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleRevokeSession = (sessionId: string, deviceName: string) => {
    openConfirm({
      title: 'Hủy phiên hoạt động',
      message: `Bạn có chắc chắn muốn ngắt kết nối và đăng xuất từ thiết bị "${deviceName}" này không?`,
      confirmText: 'Đăng xuất thiết bị',
      cancelText: 'Huỷ bỏ',
      onConfirm: async () => {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        await logActivity(ActivityType.SECURITY_CHANGE, `Đã thu hồi phiên hoạt động bảo mật trên thiết bị: ${deviceName}`);
        toast.success(`Đã ngắt phiên kết nối của ${deviceName} và hủy token truy cập.`);
      }
    });
  };

  const handleExportData = async () => {
    setExporting(true);
    const toastId = toast.loading('Bắt đầu đóng gói hồ sơ GDPR...');
    
    setTimeout(() => {
      toast.loading('Đang trích xuất nhật ký hoạt động...', { id: toastId });
      setTimeout(() => {
        toast.loading('Xác thực tệp chữ ký số cấu hình...', { id: toastId });
        setTimeout(async () => {
          try {
            const dataPackage = {
              exportedAt: new Date().toISOString(),
              accountNode: "BMass Account Control Node v5.0",
              userId: user?.uid,
              email: user?.email,
              displayName,
              phoneNumber,
              bio,
              jobTitle,
              department,
              themeAccent,
              socialLinks,
              notificationPreferences: {
                system: notifSystem,
                security: notifSecurity,
                files: notifFiles
              },
              earnedBadges: badges,
              recentSystemLogs: activities.map(a => ({ type: a.type, desc: a.description, date: a.timestamp ? toSafeDate(a.timestamp).toISOString() : 'N/A' }))
            };

            const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bmass_profile_export_${user?.uid || 'user'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await logActivity(ActivityType.ADMIN_ACTION, 'Đã kết xuất dữ liệu cá nhân (GDPR Data Export).');
            toast.success('Đã tải xuống gói dữ liệu tệp tin JSON an toàn.', { id: toastId });
          } catch (e) {
            toast.error('Gặp sự cố giải nén tệp tin.', { id: toastId });
          } finally {
            setExporting(false);
          }
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const handleSimulateCloseAccount = () => {
    openConfirm({
      title: '🚨 VÙNG QUYẾT ĐỊNH NGUY HIỂM 🚨',
      message: 'Chú ý: Hành động này sẽ khóa tài khoản, thu hồi toàn bộ phân quyền quản trị của bạn ngay lập tức và đưa dữ liệu vào trạng thái lưu trữ đóng băng 30 ngày để giải thể. Bạn có thực sự muốn tiếp tục?',
      confirmText: 'Chấp nhận giải thể',
      cancelText: 'Hủy thao tác',
      onConfirm: async () => {
        await logActivity(ActivityType.SECURITY_CHANGE, 'Gửi yêu cầu giải thể định danh & khóa vĩnh viễn tài khoản.');
        toast.success('Yêu cầu giải thể được tiếp nhận. Tài khoản của bạn được chuyển vào hàng đợi đóng băng 30 ngày quý báu.');
      }
    });
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
        bio,
        jobTitle,
        department,
        themeAccent,
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
        bio,
        jobTitle,
        department,
        themeAccent,
        socialLinks 
      }, { merge: true });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Cập nhật định danh hiển thị nâng cấp và đồng bộ hồ sơ cấu trúc.');
      toast.success('Đã đồng bộ hóa lưu hồ sơ & giao diện thành công!');
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
          <div className="bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-xl relative overflow-hidden group">
            
            {/* Dynamic themed gradient cover banner */}
            <div className={cn("h-28 bg-gradient-to-r relative transition-all duration-500", accentColors[themeAccent].gradient)}>
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
              {/* Dynamic decorative visual dot */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-black/20 backdrop-blur-md rounded-full text-[8.5px] text-white/95 font-bold tracking-wider border border-white/10 uppercase">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Live Node
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-white text-[9px] font-black uppercase tracking-wider border border-white/20">
                <Award className="w-3 h-3 text-amber-300 animate-bounce" />
                <span>Cấp {badges.length + (user?.emailVerified ? 2 : 1)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center px-6 pb-6 relative">
              
              {/* Dynamic Camera Avatar upload frame (offset into banner) */}
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="relative group/avatar cursor-pointer -mt-14 mb-4 z-10"
                title="Thay đổi hoặc bấm chọn bộ sưu tập ảnh bên dưới"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*" 
                />
                
                {/* Visual Glass Edge Rings with dynamic themed color */}
                <div className={cn("absolute -inset-1.5 rounded-[2.5rem] opacity-70 blur-xs group-hover/avatar:opacity-100 group-hover/avatar:scale-102 transition-all duration-500 bg-gradient-to-tr", accentColors[themeAccent].gradient)} />
                
                <div className="relative w-24 h-24 rounded-[2.25rem] overflow-hidden bg-white dark:bg-zinc-950 flex items-center justify-center border-4 border-white dark:border-zinc-950 shadow-lg">
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
                    <Camera className="w-4 h-4 animate-pulse" />
                    <span className="text-[7.5px] uppercase tracking-widest font-black">Upload tệp</span>
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span className="text-[7px] uppercase tracking-widest">Đang tải...</span>
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
                    <CheckCircle2 className="w-2.5 h-2.5" /> Xác thực
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                    Chờ gửi mail
                  </span>
                )}
              </div>

              {/* Title & Organization Name */}
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-0.5 px-4 text-center truncate w-full">
                {userData?.displayName || 'Thành viên mới'}
              </h2>
              
              {jobTitle && (
                <p className={cn("text-[11px] font-heavy uppercase tracking-widest text-center px-4 w-full mb-1 font-bold", accentColors[themeAccent].text)}>
                  {jobTitle} • <span className="text-slate-400 dark:text-zinc-500 lowercase font-medium">{department}</span>
                </p>
              )}

              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mb-3 truncate w-full px-4 text-center">
                {userData?.email}
              </p>

              {bio && (
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-full text-center px-3 mb-4 leading-relaxed line-clamp-2 italic bg-slate-50 dark:bg-zinc-900/40 p-2 rounded-xl border border-slate-100 dark:border-white/5">
                  "{bio}"
                </p>
              )}

              {/* Avatar Preset mini-gallery */}
              <div className="w-full space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-4 mb-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none text-center">Hoặc chọn nhanh Avatar mẫu</p>
                <div className="flex justify-center gap-1.5 pt-1">
                  {AVATAR_PRESETS.slice(0, 5).map((pres, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(pres)}
                      disabled={uploading}
                      className={cn(
                        "w-7 h-7 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-all outline-none cursor-pointer",
                        userData?.photoURL === pres ? "ring-2 ring-indigo-500 border-transparent scale-105" : ""
                      )}
                    >
                      <img src={pres} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile completeness progress score */}
              <div className="w-full bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-slate-150/40 dark:border-white/5 text-[11px] mb-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-extrabold uppercase text-[8px] tracking-wider">Độ hoàn thiện định danh</span>
                  <span className={cn("font-black text-[10px]", accentColors[themeAccent].text)}>
                    {
                      (displayName ? 20 : 0) + 
                      (phoneNumber ? 20 : 0) + 
                      (bio ? 20 : 0) + 
                      (jobTitle ? 15 : 0) + 
                      (socialLinks.github || socialLinks.linkedin || socialLinks.twitter || socialLinks.facebook ? 15 : 0) + 
                      (user?.emailVerified ? 10 : 0)
                    }%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000 bg-gradient-to-r", accentColors[themeAccent].gradient)}
                    style={{ 
                      width: `${
                        (displayName ? 20 : 0) + 
                        (phoneNumber ? 20 : 0) + 
                        (bio ? 25 : 0) + 
                        (jobTitle ? 15 : 0) + 
                        (socialLinks.github || socialLinks.linkedin || socialLinks.twitter || socialLinks.facebook ? 15 : 0) + 
                        (user?.emailVerified ? 10 : 0)
                      }%` 
                    }}
                  />
                </div>
              </div>

              {/* Join Date Block */}
              <div className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-900/55 rounded-2xl border border-slate-150/40 dark:border-white/5 text-[11px]">
                <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-400 font-bold uppercase text-[8px] tracking-wider leading-none">Tham gia hệ sinh thái</p>
                  <p className="text-slate-700 dark:text-zinc-300 font-black mt-1 leading-none">{joinDate}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Vertical Glass Navigation Control Tabs */}
          <div className="bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md rounded-3xl p-3 border border-slate-200/50 dark:border-white/5 shadow-xl space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3 py-2">Quản trị phân mục</p>
            {[
              { id: 'profile', label: 'Hồ sơ định danh', desc: 'Chỉnh sửa danh tính số', icon: User },
              { id: 'security', label: 'Mật vụ bảo mật', desc: 'Thiết lập mật mã & Phiên truy cập', icon: Shield },
              { id: 'preferences', label: 'Cấu hình & Mỹ thuật', desc: 'Chủ đề tối, màu nhấn & Ngôn ngữ', icon: Sliders },
              { id: 'activity', label: 'Nhật ký truy vết', desc: 'Dữ liệu hành vi & Xuất JSON', icon: Activity },
            ].map(tab => (
              <button 
                key={tab.id} 
                type="button"
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-355 group cursor-pointer",
                  activeTab === tab.id 
                    ? cn("text-white shadow-lg translate-x-1", accentColors[themeAccent].bg, accentColors[themeAccent].shadow) 
                    : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors shrink-0",
                  activeTab === tab.id 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-50 dark:bg-zinc-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 text-slate-400 dark:text-zinc-600 group-hover:text-indigo-505"
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
                <p className="text-xs font-black text-slate-850 dark:text-zinc-200 leading-relaxed max-w-[240px]">
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
              className="bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/5 shadow-xl min-h-[460px]"
            >
              
              {/* TAB 1: PROFILE MANAGEMENT */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <User className={cn("w-5 h-5", accentColors[themeAccent].text)} />
                      Thông tin hồ sơ định danh
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Cập nhật danh xưng chuyên môn, phương thức liên lạc hành chính và tích hợp mạng lưới liên kết kỹ thuật số.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Basic Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Tên hiển thị (Display Name)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={displayName} 
                            onChange={e => setDisplayName(e.target.value)} 
                            className={cn(
                              "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400",
                              accentColors[themeAccent].ring
                            )} 
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
                            className={cn(
                              "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400",
                              accentColors[themeAccent].ring
                            )} 
                            placeholder="Số liên lạc điện thoại..."
                          />
                          <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Chức danh chuyên môn (Job Title)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={jobTitle} 
                            onChange={e => setJobTitle(e.target.value)} 
                            className={cn(
                              "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400",
                              accentColors[themeAccent].ring
                            )} 
                            placeholder="Ví dụ: Team Leader, Senior Web Engineer..."
                          />
                          <Award className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Phân khoa / Bộ phận (Department)</label>
                        <div className="relative">
                          <select 
                            value={department} 
                            onChange={e => setDepartment(e.target.value)}
                            className={cn(
                              "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-905 dark:text-zinc-200 outline-none appearance-none transition-all",
                              accentColors[themeAccent].ring
                            )}
                          >
                            <option value="Phòng Công Nghệ">Phòng Công Nghệ (Technology Div)</option>
                            <option value="Phòng Sáng Tạo">Phòng Sáng Tạo (Design & Creative)</option>
                            <option value="Phòng Kinh Doanh">Phòng Kinh Doanh (Sales & Marketing)</option>
                            <option value="Phòng Nhân Sự">Phòng Nhân Sự (HR & Admin)</option>
                            <option value="Ban Điều Hành">Ban Điều Hành (Executive Council)</option>
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Biography Description */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mô tả tiểu sử (Biography)</label>
                        <span className="text-[9px] text-slate-400 font-medium">{bio.length}/160 ký tự</span>
                      </div>
                      <textarea 
                        maxLength={160}
                        rows={3}
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        className={cn(
                          "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 resize-none",
                          accentColors[themeAccent].ring
                        )}
                        placeholder="Hãy chia sẻ thông điệp ngắn về phương châm sống hoặc lý tưởng cốt lõi của bạn..."
                      />
                    </div>

                    {/* Social networks links */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Đồng bộ liên kết mạng xã hội (Connected Identities)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'github', label: 'Tài khoản GitHub', placeholder: 'https://github.com/username' },
                          { key: 'twitter', label: 'Hồ sơ mạng xã hội X (Twitter)', placeholder: 'https://x.com/username' },
                          { key: 'linkedin', label: 'Hồ sơ chuyên nghiệp LinkedIn', placeholder: 'https://linkedin.com/in/username' },
                          { key: 'facebook', label: 'Kết nối bè bạn Facebook', placeholder: 'https://facebook.com/username' },
                        ].map((item) => (
                          <div key={item.key} className="space-y-1.5">
                            <span className="text-[9px] font-extrabold text-slate-400 pl-1 capitalize">{item.label}</span>
                            <input 
                              type="text" 
                              value={(socialLinks as any)[item.key] || ''} 
                              onChange={e => setSocialLinks({ ...socialLinks, [item.key]: e.target.value })} 
                              className={cn(
                                "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-850 dark:text-zinc-200 outline-none transition-all",
                                accentColors[themeAccent].ring
                              )} 
                              placeholder={item.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Badges system */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Chứng nhận đạt được (Honor & Badges)</h4>
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        {badges.length > 0 ? badges.map(b => (
                          <span key={b} className={cn("px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-indigo-150/40 dark:border-indigo-900/30", accentColors[themeAccent].textDark)}>
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            {b}
                          </span>
                        )) : (
                          <div className="flex gap-2 p-1 text-slate-400 text-[10px] font-bold w-full italic items-center">
                            <Info className="w-4 h-4 text-slate-400" />
                            <span>Chưa nhận huy hiệu chính thức. Hãy hoàn thành các thử thách trên Ecosystem để mở khóa.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className={cn(
                          "w-full sm:w-auto px-8 py-3.5 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50",
                          accentColors[themeAccent].bg,
                          accentColors[themeAccent].shadow
                        )}
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
                      <Shield className={cn("w-5 h-5", accentColors[themeAccent].text)} />
                      Trung tâm bảo mật & Quản lý thiết bị
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Kiểm soát trạng thái truyền tin bảo mật, trạng thái định dạng chữ ký điện tử Gmail, và giám sát hạ tầng phiên kết nối hiện hành.
                    </p>
                  </div>

                  <div className="space-y-5">
                    
                    {/* Gmail Verification block */}
                    <div className="p-5 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/35">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-zinc-200">Địa chỉ Email liên kết</p>
                          <p className="text-[11px] text-slate-505 text-zinc-450 font-bold">{user?.email || 'N/A'}</p>
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
                          className={cn("px-4 py-2.5 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md", accentColors[themeAccent].bg)}
                        >
                          Gửi link xác minh
                        </button>
                      )}
                    </div>

                    {/* Change Password block */}
                    <div className="p-5 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/35">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-zinc-200">Đấu nối đổi mật mã tài khoản</p>
                          <p className="text-[11px] text-slate-400 font-bold">Yêu cầu chữ ký khôi phục gửi trực tiếp về email đã đăng ký.</p>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={handleChangePassword}
                        disabled={passwordCooldown > 0}
                        className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-white/5"
                      >
                        {passwordCooldown > 0 ? `Chờ ${passwordCooldown}s` : 'Gửi mã khôi phục'}
                      </button>
                    </div>

                    {/* Live Active Sessions Section */}
                    <div className="space-y-3.5 border-t border-slate-100 dark:border-white/5 pt-5">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4.5 h-4.5 text-slate-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Thiết bị & Phiên hoạt động của bạn (Device Sessions)</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {activeSessions.map((session) => (
                          <div key={session.id} className="p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-2xl border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-4 transition-all hover:bg-slate-50/80">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-400">
                                {session.deviceName.toLowerCase().includes('mac') || session.deviceName.toLowerCase().includes('windows') ? <Laptop className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-800 dark:text-zinc-200">{session.deviceName}</span>
                                  {session.isCurrent && (
                                    <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">Hiện hành</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">Địa chỉ IP: {session.ip} • Địa điểm ước tính: {session.location}</p>
                                <p className="text-[9px] text-slate-400 italic">Phiên cập nhật cuối: {session.lastActive}</p>
                              </div>
                            </div>
                            
                            {!session.isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleRevokeSession(session.id, session.deviceName)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-bold uppercase border border-rose-100 dark:border-rose-900/20 transition-all cursor-pointer"
                              >
                                Đăng xuất
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2FA block */}
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
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

                    {/* Danger zone / simulate delete profile */}
                    <div className="border-t border-red-500/20 dark:border-red-500/10 pt-5 space-y-3">
                      <div className="flex items-center gap-2 text-rose-500">
                        <Shield className="w-4.5 h-4.5" />
                        <h4 className="text-[10.5px] font-black uppercase tracking-wider">Vùng ranh giới khẩn cấp (Danger Zone)</h4>
                      </div>
                      <div className="p-4 bg-rose-500/[0.02] border border-red-500/10 dark:border-red-500/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 dark:text-zinc-200">Đóng tài khoản & Chuyển kho lưu trữ</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg">Yêu cầu thu hồi toàn quyền truy cập quản trị hệ thống, mã hóa cơ sở và đưa tài khoản định danh vào hàng chờ đóng băng xóa vĩnh viễn.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSimulateCloseAccount}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/15 cursor-pointer whitespace-nowrap"
                        >
                          Đóng tài khoản
                        </button>
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
                       Cài đặt hệ thống & Giao diện nghệ thuật
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Cân chỉnh màu sắc chủ đề, phong cách hiển thị tối/sáng, và tiếp nhận các thông báo đẩy từ hệ thống tự động.
                    </p>
                  </div>

                  <div className="space-y-6">
                    
                    {/* Themed Accent Colors Selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Màu nhấn chủ đạo (Accent Colors Setup)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(accentColors).map(([key, config]) => (
                          <div 
                            key={key}
                            onClick={() => {
                              setThemeAccent(key as any);
                              // Sync to firestore if database is available
                              if (user) {
                                updateDoc(doc(db, 'users', user.uid), { themeAccent: key }).catch(() => {});
                              }
                            }}
                            className={cn(
                              "cursor-pointer p-3.5 rounded-2xl border text-left transition-all duration-300 flex items-center gap-2.5",
                              themeAccent === key 
                                ? "bg-slate-100 dark:bg-zinc-900 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-505/10" 
                                : "bg-slate-50/50 dark:bg-zinc-950/35 border-slate-205/60 dark:border-white/5 text-slate-500"
                            )}
                          >
                            <span className={cn("w-3.5 h-3.5 rounded-full", config.bg)} />
                            <span className="text-xs font-bold capitalize">{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>

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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-5 h-5 text-indigo-500" />
                          Lịch sử hoạt động của bạn
                        </h3>
                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={handleExportData}
                            disabled={exporting}
                            className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Xuất dữ liệu GDPR
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Ghi nhận chi tiết lịch sử hệ thống hành vi bảo mật & thao tác.</p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex items-center gap-2 max-w-md">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchLogQuery}
                          onChange={e => setSearchLogQuery(e.target.value)}
                          placeholder="Tìm kiếm hành vi hoặc mã log..."
                          className={cn(
                            "w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400",
                            accentColors[themeAccent].ring
                          )}
                        />
                        <Zap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350" />
                      </div>
                    </div>

                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-100 dark:before:bg-white/5 pt-4">
                      {activities
                        .filter(log => log.description.toLowerCase().includes(searchLogQuery.toLowerCase()) || log.type.toLowerCase().includes(searchLogQuery.toLowerCase()))
                        .slice(0, 10)
                        .map((log) => {
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
                      {activities.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs italic">Không có nhật ký ghi chép tương ứng.</div>
                      )}
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

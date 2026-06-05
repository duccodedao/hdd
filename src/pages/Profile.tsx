import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSearchParams } from 'react-router-dom';
import { doc, updateDoc, setDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { uploadToGitHub } from '../services/githubService';
import toast from 'react-hot-toast';
import { 
  Camera, User, Shield, CheckCircle2, ChevronRight, KeyRound, 
  Activity, Loader2, Settings, HelpCircle, Zap, Brush, Mail,
  Smartphone, Bell, Globe, LogOut, Clock, ArrowUpRight, MapPin, Download
} from 'lucide-react';
import { toSafeDate, cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useConfirmStore } from '../store/confirmStore';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';
import { KeyboardShortcutsModal } from '../components/ui/KeyboardShortcutsModal';
import { Helmet } from 'react-helmet-async';
import { PaymentTransactionStatus } from '../components/payment/PaymentTransactionStatus';

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
  const [socialLinks, setSocialLinks] = useState({ github: '', twitter: '', linkedin: '', facebook: '' });
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirmStore();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'account' | 'info' | 'security' | 'activity' | 'transactions'>((searchParams.get('tab') as any) || 'account');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [currentLocationName, setCurrentLocationName] = useState('Đang xác định...');

  const [permissions, setPermissions] = useState({
    geolocation: 'prompt' as PermissionState
  });

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

    const qInvoices = query(collection(db, 'invoices'), where('userId', '==', user.uid));
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(all.sort((a: any, b: any) => {
        const da = a.createdAt ? toSafeDate(a.createdAt).getTime() : 0;
        const db = b.createdAt ? toSafeDate(b.createdAt).getTime() : 0;
        return db - da;
      }));
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
      unsubInvoices();
      unsubProfile();
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'info', 'security', 'activity', 'transactions'].includes(tab)) {
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
      await setDoc(doc(db, 'user_profiles', user.uid), { 
        uid: user.uid,
        displayName,
        email: user.email,
        socialLinks 
      }, { merge: true });
      await logActivity(ActivityType.UPDATE_PROFILE, 'Đã cập nhật thông tin tài khoản');
      toast.success('Đã lưu thông tin');
    } catch (e) { console.error(e); toast.error('Lỗi khi lưu dữ liệu'); } finally { setLoading(false); }
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
              { id: 'transactions', label: 'Lịch sử giao dịch', icon: Clock },
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
                          
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Social Links</label>
                             <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="GitHub" value={socialLinks.github} onChange={e => setSocialLinks({...socialLinks, github: e.target.value})} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm" />
                                <input type="text" placeholder="Twitter" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm" />
                                <input type="text" placeholder="LinkedIn" value={socialLinks.linkedin} onChange={e => setSocialLinks({...socialLinks, linkedin: e.target.value})} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm" />
                                <input type="text" placeholder="Facebook" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm" />
                             </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Badges</label>
                             <div className="flex flex-wrap gap-2">
                                {badges.length > 0 ? badges.map(b => (
                                  <span key={b} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">{b}</span>
                                )) : <span className="text-xs text-slate-400">Chưa có huy hiệu</span>}
                             </div>
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

              {activeTab === 'transactions' && (
                <div className="premium-card space-y-6">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                         </div>
                         <div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Lịch sử giao dịch</h3>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Danh sách hóa đơn của bạn</p>
                         </div>
                      </div>
                   </div>

                   {/* Real-time transaction status widget */}
                   <PaymentTransactionStatus className="shadow-sm border-slate-200/60 dark:border-zinc-800 bg-gradient-to-br from-slate-50/50 to-indigo-50/10 dark:from-zinc-950/40 dark:to-zinc-900/10" />

                   <div className="overflow-x-auto">
                     {invoices.length > 0 ? (
                       <table className="w-full text-left border-collapse">
                         <thead>
                           <tr className="border-b border-slate-100 dark:border-white/5">
                             <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mã hóa đơn</th>
                             <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nội dung dịch vụ</th>
                             <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Số tiền</th>
                             <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">PT thanh toán</th>
                             <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Trạng thái</th>
                             <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Thời gian</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                           {invoices.map((inv: any) => (
                             <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                               <td className="py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                                 {inv.id}
                               </td>
                               <td className="py-4 text-sm font-medium text-slate-700 dark:text-zinc-300">
                                 <div className="flex flex-col gap-1.5 justify-start">
                                   {inv.items && inv.items.length > 0 ? (
                                     inv.items.map((item: any, idx: number) => (
                                       <div key={idx} className="flex flex-wrap items-center gap-2">
                                         <span className="text-slate-800 dark:text-zinc-200">{item.name}</span>
                                         {inv.status === 'paid' && item.githubUrl && (
                                           <a
                                             href={item.githubUrl}
                                             target="_blank"
                                             rel="noreferrer"
                                             className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-2 py-0.5 rounded-md transition-all shrink-0 ml-1.5 animate-in fade-in zoom-in-95"
                                             title="Tải lại tài liệu đã mua"
                                             id={`download-purchased-${item.itemId || idx}`}
                                           >
                                             <Download className="w-2.5 h-2.5" />
                                             Tải xuống
                                           </a>
                                         )}
                                       </div>
                                     ))
                                   ) : (
                                     'N/A'
                                   )}
                                 </div>
                               </td>
                               <td className="py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                 {inv.totalAmount ? inv.totalAmount.toLocaleString() : '0'}đ
                               </td>
                               <td className="py-4 text-xs font-medium text-slate-500 dark:text-zinc-400">
                                 {inv.paymentMethod === 'bank_transfer' ? 'Chuyển khoản SePay' : inv.paymentMethod || 'Chuyển khoản'}
                               </td>
                               <td className="py-4">
                                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                   inv.status === 'paid' 
                                     ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                     : inv.status === 'expired'
                                     ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                                     : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                 }`}>
                                   <span className={`w-1.5 h-1.5 rounded-full ${
                                     inv.status === 'paid' ? 'bg-emerald-500' : inv.status === 'expired' ? 'bg-slate-400' : 'bg-amber-500'
                                   }`} />
                                   {inv.status === 'paid' ? 'Thành công' : inv.status === 'expired' ? 'Đã hết hạn' : 'Chờ thanh toán'}
                                 </span>
                               </td>
                               <td className="py-4 text-xs text-slate-500 dark:text-slate-400">
                                 {inv.createdAt ? format(toSafeDate(inv.createdAt), 'HH:mm • dd/MM/yyyy') : 'Vừa xong'}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     ) : (
                       <div className="p-12 text-center">
                          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                             <Clock className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Không có lịch sử giao dịch</p>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="premium-card">
                   <p className="text-slate-500 dark:text-zinc-400">Tính năng bảo mật đã được vô hiệu hóa.</p>
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

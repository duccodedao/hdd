import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, Users, Activity, Settings, Trash2, StopCircle, RefreshCcw, Lock, Box, Wrench, AppWindow, Gamepad2, FileText, Newspaper, Code, Info, Mail, MessageSquare, ShieldAlert, Gift, Landmark, LineChart, Bell, Globe, Server, MapPin, UserCircle, CheckSquare, Play, Phone, Apple, MonitorSmartphone, Files, Clock, Layout, Scan, FileImage } from 'lucide-react';
import { useAuthStore, UserData } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { vi } from 'date-fns/locale';

import AdminUtilities from './AdminUtilities';
import AdminIpBlocking from './AdminIpBlocking';
import AdminLogins from './AdminLogins';
import AdminApiKeys from './AdminApiKeys';
import AdminForms from './AdminForms';
import { useConfirmStore } from '../../store/confirmStore';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export default function AdminDashboard() {
  const { isSuperAdmin, userData } = useAuthStore();
  const { maintenanceMode, setMaintenanceMode, maintenanceTabs, setMaintenanceTabs, maintenanceDevices, setMaintenanceDevices, blockedDevices, setBlockedDevices } = useAppStore();
  const { openConfirm } = useConfirmStore();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'banned' | 'utilities' | 'logins' | 'contacts' | 'about' | 'stats' | 'apikeys' | 'forms'>('stats');

  const [contacts, setContacts] = useState<any[]>([]);
  const [allUtilities, setAllUtilities] = useState<any[]>([]);
  let [stats, setStats] = useState({
    users: 0,
    blockedIps: 0,
    utilities: 0,
    forms: 0
  });
  const [aboutConfig, setAboutConfig] = useState({
    introTitle: 'Hệ thống - Nền tảng công nghệ toàn diện',
    introDesc: 'Trải nghiệm không gian công nghệ số hiện đại. Tích hợp các công cụ quản lý và tiện ích thông minh, mang đến trải nghiệm tinh tế cho người dùng.',
    adminName: 'Quản trị viên',
    adminBio: 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.',
    adminPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    facebook: 'https://facebook.com/your-username',
    github: 'https://github.com/your-username',
    youtube: 'https://youtube.com/@your-channel',
    email: 'contact@system.com'
  });

  useEffect(() => {

    const unsubContacts = onSnapshot(query(collection(db, 'contact_requests'), orderBy('createdAt', 'desc')), (snap) => {
      setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubSystem = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.blockedDevices) setBlockedDevices(data.blockedDevices);
      }
    });

    const fetchAbout = async () => {
      const snap = await getDoc(doc(db, 'settings', 'about'));
      if (snap.exists()) setAboutConfig(prev => ({ ...prev, ...snap.data() }));
    };
    fetchAbout();

    // Stats listeners
    const unsubStatsUsers = onSnapshot(collection(db, 'users'), s => setStats(prev => ({ ...prev, users: s.size })));
    const unsubStatsIps = onSnapshot(collection(db, 'blockedIps'), s => setStats(prev => ({ ...prev, blockedIps: s.size })));
    const unsubStatsUtils = onSnapshot(collection(db, 'utilities'), s => setStats(prev => ({ ...prev, utilities: s.size })));
    const unsubStatsForms = onSnapshot(collection(db, 'forms'), s => setStats(prev => ({ ...prev, forms: s.size })));

    const unsubAllUtils = onSnapshot(collection(db, 'utilities'), (snapshot) => {
      setAllUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubContacts();
      unsubSystem();
      unsubStatsUsers();
      unsubStatsIps();
      unsubStatsUtils();
      unsubStatsForms();
      unsubAllUtils();
    };
  }, []);

  const saveAboutConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'about'), aboutConfig);
      toast.success('Đã cập nhật thông tin giới thiệu');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình');
    }
  };

  const deleteContact = async (id: string) => {
    openConfirm({
      title: 'Xóa yêu cầu hỗ trợ',
      message: 'Bạn có chắc chắn muốn xóa yêu cầu này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'contact_requests', id));
          toast.success('Đã xóa yêu cầu');
        } catch (e) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const handleReply = (email: string) => {
    window.location.href = `mailto:${email}?subject=Phản hồi yêu cầu hỗ trợ từ Đội ngũ Quản trị`;
  };

  const fetchUsers = async () => {
    setLoading(true);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      setUsers(usersData);
      setLoading(false);
    });
    return unsubscribe;
  };

  useEffect(() => {
    const unsub = fetchUsers();
    return () => { unsub.then(fn => fn && fn()) };
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) {
      toast.error('Chỉ Super Admin mới có quyền đổi Role');
      return;
    }
    openConfirm({
      title: 'Xác nhận đổi quyền',
      message: `Bạn có chắc chắn muốn phong thành viên này làm ${newRole.toUpperCase()} không?`,
      confirmText: 'Xác nhận',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', userId), { role: newRole });
          toast.success('Đã cập nhật role thành công');
        } catch (error) {
          toast.error('Có lỗi xảy ra, vui lòng thử lại');
        }
      }
    });
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (!isSuperAdmin) {
      toast.error('Bạn không có quyền thực hiện hành động này');
      return;
    }
    const actionText = isBanned ? 'Gỡ Ban (Unban)' : 'Khóa (Ban)';
    openConfirm({
      title: 'Xác nhận ' + actionText,
      message: `Bạn có chắc chắn muốn ${actionText} thành viên này?`,
      confirmText: actionText,
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', userId), {
            isBanned: !isBanned,
            status: !isBanned ? 'inactive' : 'active'
          });
          toast.success(`Đã ${actionText} thành công`);
        } catch(e) {
          toast.error('Lỗi khi thực hiện. Hãy thử lại');
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isSuperAdmin) {
      toast.error('Bạn không có quyền xóa User');
      return;
    }
    openConfirm({
      title: 'Xóa người dùng',
      message: 'Chắc chắn muốn xóa user này khỏi Database? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', userId));
          toast.success('Đã xoá tài khoản hoàn toàn.');
        } catch (error) {
          toast.error('Không thể xoá tài khoản lúc này.');
        }
      }
    });
  };

  const toggleBlockedDevice = async (type: 'ios' | 'android') => {
    const newBlocked = {
      ...blockedDevices,
      [type]: !blockedDevices[type]
    };
    setBlockedDevices(newBlocked);
    try {
      await setDoc(doc(db, 'settings', 'system'), { blockedDevices: newBlocked }, { merge: true });
      toast.success(`Đã cập nhật trạng thái cấm cho thiết bị ${type.toUpperCase()}.`);
    } catch (e) {
      toast.error('Lỗi cập nhật cấu hình cấm thiết bị.');
    }
  };

  const toggleMaintenance = async () => {
    if (!isSuperAdmin) return toast.error('Quyền truy cập bị từ chối.');
    openConfirm({
      title: 'Bảo trì hệ thống',
      message: `Bạn có chắc chắn muốn ${maintenanceMode ? 'tắt' : 'bật'} chế độ bảo trì toàn cục?`,
      confirmText: 'Xác nhận',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          const newVal = !maintenanceMode;
          await setDoc(doc(db, 'settings', 'system'), { maintenanceMode: newVal }, { merge: true });
          setMaintenanceMode(newVal);
          toast.success(`Đã ${newVal ? 'BẬT' : 'TẮT'} bảo trì.`);
        } catch (e) {
          toast.error('Lỗi cập nhật cấu hình.');
        }
      }
    });
  };

  const toggleTabMaintenance = async (tabKey: string) => {
    const newTabs = {
      ...maintenanceTabs,
      [tabKey]: !maintenanceTabs[tabKey]
    };
    setMaintenanceTabs(newTabs);
    try {
      await setDoc(doc(db, 'settings', 'system'), { maintenanceTabs: newTabs }, { merge: true });
      toast.success(`Đã cập nhật trạng thái bảo trì cho tính năng.`);
    } catch (e) {
      toast.error('Lỗi cập nhật cấu hình tab.');
    }
  };

  const toggleDeviceMaintenance = async (deviceKey: keyof typeof maintenanceDevices) => {
    const newDevices = {
      ...maintenanceDevices,
      [deviceKey]: !maintenanceDevices[deviceKey]
    };
    setMaintenanceDevices(newDevices);
    try {
      await setDoc(doc(db, 'settings', 'system'), { maintenanceDevices: newDevices }, { merge: true });
      toast.success(`Đã cập nhật trạng thái bảo trì cho thiết bị ${deviceKey.toUpperCase()}.`);
    } catch (e) {
      toast.error('Lỗi cập nhật cấu hình thiết bị.');
    }
  };

  const [activityData, setActivityData] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'activities'), orderBy('timestamp', 'desc')), (snapshot) => {
      const activities = snapshot.docs.map(doc => doc.data());
      // Process activity for a simple daily chart
      const dailyMap: any = {};
      activities.forEach((act: any) => {
        const date = format(toSafeDate(act.timestamp), 'dd/MM');
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      });
      const chartData = Object.keys(dailyMap).map(date => ({ date, count: dailyMap[date] })).reverse().slice(-14);
      setActivityData(chartData);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const roles: any = {};
      snapshot.docs.forEach(doc => {
        const role = doc.data().role || 'user';
        roles[role] = (roles[role] || 0) + 1;
      });
      setRoleDistribution(Object.keys(roles).map(name => ({ name, value: roles[name] })));
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'];

  return (
    <div className="flex flex-col lg:flex-row min-h-[80vh] bg-transparent">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 p-4 lg:p-6 flex flex-col gap-4 lg:gap-8 bg-transparent">
        <h1 className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-500" />
            Quản trị Hệ thống
        </h1>
        
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
          {[
            { id: 'stats', label: 'Thống kê', icon: LineChart },
            { id: 'users', label: 'Người dùng', icon: Users },
            { id: 'forms', label: 'Folders/Form', icon: Files },
            { id: 'banned', label: 'IP Banned', icon: ShieldAlert },
            { id: 'system', label: 'Hệ thống', icon: Settings },
            { id: 'apikeys', label: 'API Keys', icon: Code },
            { id: 'utilities', label: 'Tiện ích', icon: Wrench },
            { id: 'contacts', label: 'Yêu cầu hỗ trợ', icon: Mail },
            { id: 'about', label: 'Mạng xã hội & Giới thiệu', icon: Info }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition shrink-0 lg:shrink ${activeTab === tab.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                <tab.icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 md:p-6 lg:p-10 overflow-x-auto w-full">
        <h1 className="text-2xl lg:text-3xl font-medium text-slate-950 dark:text-white mb-6 lg:mb-8 tracking-tight">
            Quản lý { {stats: 'Thống kê', users: 'Người dùng', banned: 'IP Banned', system: 'Hệ thống', utilities: 'Tiện ích', contacts: 'Yêu cầu hỗ trợ', forms: 'Form & Folders', about: 'Mạng xã hội & Giới thiệu'}[activeTab as any] }
        </h1>

      {activeTab === 'stats' && (
        <div className="space-y-6 lg:space-y-8 pb-10">
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-8">
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 lg:p-8 rounded-2xl shadow-sm">
                 <h3 className="text-sm lg:text-lg font-medium mb-4 lg:mb-6 tracking-normal text-slate-500 dark:text-slate-400">Hoạt động hệ thống (14 ngày qua)</h3>
                 <div className="h-[250px] lg:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={activityData}>
                          <defs>
                             <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 lg:p-8 rounded-2xl shadow-sm">
                 <h3 className="text-sm lg:text-lg font-medium mb-4 lg:mb-6 tracking-normal text-slate-500 dark:text-slate-400">Cơ cấu người dùng</h3>
                 <div className="h-[250px] lg:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={roleDistribution}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             paddingAngle={5}
                             dataKey="value"
                          >
                             {roleDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-2xl shadow-sm">
              <h3 className="text-lg font-medium mb-6  tracking-normal text-slate-500 dark:text-slate-400">Dữ liệu tổng quát</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-5 gap-6">
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-normal mb-1">Tổng thành viên</p>
                    <p className="text-3xl font-medium text-slate-900 dark:text-white">{stats.users}</p>
                 </div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-normal mb-1">IP bị chặn</p>
                    <p className="text-3xl font-medium text-rose-500">{stats.blockedIps}</p>
                 </div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-normal mb-1">Hệ thống</p>
                    <p className="text-3xl font-medium text-emerald-500">{stats.utilities}</p>
                 </div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-normal mb-1">Folders/Form</p>
                    <p className="text-3xl font-medium text-purple-500">{stats.forms}</p>
                 </div>
              </div>
           </div>
        </div>
      )}


      {activeTab === 'about' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Info className="w-6 h-6 text-blue-500" /> Cấu hình trang Giới thiệu (About)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
               {/* Left: Thông tin chung */}
               <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Thông tin chung website</h4>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Tiêu đề Intro</label>
                    <input 
                      type="text" 
                      value={aboutConfig.introTitle}
                      onChange={(e) => setAboutConfig({...aboutConfig, introTitle: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Mô tả intro</label>
                    <textarea 
                      rows={6}
                      value={aboutConfig.introDesc}
                      onChange={(e) => setAboutConfig({...aboutConfig, introDesc: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                    />
                  </div>
               </div>

               {/* Right: Thông tin Chúng tôi */}
               <div className="space-y-4">
                  <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Thông tin Chúng tôi</h4>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Tên Chúng tôi / Title</label>
                    <input 
                      type="text" 
                      value={aboutConfig.adminName}
                      onChange={(e) => setAboutConfig({...aboutConfig, adminName: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Ảnh (URL)</label>
                    <input 
                      type="text" 
                      value={aboutConfig.adminPhoto}
                      onChange={(e) => setAboutConfig({...aboutConfig, adminPhoto: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Bio (Giới thiệu bản thân)</label>
                    <textarea 
                      rows={4}
                      value={aboutConfig.adminBio}
                      onChange={(e) => setAboutConfig({...aboutConfig, adminBio: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                    />
                  </div>
               </div>
            </div>

            {/* Bottom: Mạng xã hội */}
            <div className="mt-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase tracking-wider">Mạng xã hội & Liên hệ (Contact Page)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Facebook URL</label>
                    <input 
                      type="url" 
                      value={aboutConfig.facebook}
                      onChange={(e) => setAboutConfig({...aboutConfig, facebook: e.target.value})}
                      className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">GitHub URL</label>
                    <input 
                      type="url" 
                      value={aboutConfig.github}
                      onChange={(e) => setAboutConfig({...aboutConfig, github: e.target.value})}
                      className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Email</label>
                    <input 
                      type="email" 
                      value={aboutConfig.email}
                      onChange={(e) => setAboutConfig({...aboutConfig, email: e.target.value})}
                      className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
               <button 
                onClick={saveAboutConfig}
                className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95"
               >
                 Lưu thay đổi
               </button>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'banned' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminIpBlocking />
        </motion.div>
      )}

      {activeTab === 'contacts' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="w-5 h-5 text-rose-500" /> Hệ thống Phản hồi & Liên hệ
              </h2>
              <div className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase rounded-full">
                {contacts.length} hội thoại
              </div>
            </div>
            
            <div className="p-6">
              {contacts.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {contacts.map((req) => (
                    <div key={req.id} className="group relative bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 transition-all hover:bg-slate-100 dark:hover:bg-white-[0.07] overflow-hidden">
                      {/* Decorative gradient */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                      
                      <div className="flex items-start justify-between relative z-10 gap-4">
                        <div className="flex gap-4">
                           <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-xl text-indigo-500 shadow-sm">
                             {req.name.charAt(0)}
                           </div>
                           <div className="space-y-1">
                             <h4 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">{req.name}</h4>
                             <div className="flex items-center gap-2">
                               <p className="text-xs text-slate-500 font-medium">{req.email}</p>
                               <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                               <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{format(toSafeDate(req.createdAt), 'dd/MM/yyyy')}</span>
                             </div>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleReply(req.email)}
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                            title="Phản hồi Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteContact(req.id)}
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 relative">
                         <div className="absolute left-[-10px] top-4 bottom-4 w-[2px] bg-indigo-500/20" />
                         <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5 relative">
                            {/* Message bubble tail */}
                            <div className="absolute left-[-6px] top-6 w-3 h-3 bg-white dark:bg-[#1a1a1e] border-l border-b border-slate-100 dark:border-white/5 rotate-45" />
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {req.message}
                            </p>
                         </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {format(toSafeDate(req.createdAt), 'HH:mm')}
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Encrypted Channel
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center">
                   <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-8 h-8 text-slate-300 dark:text-white/10" />
                   </div>
                   <p className="text-slate-500 font-medium">Hộp thư đang trống</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'utilities' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminUtilities />
        </motion.div>
      )}

      {activeTab === 'forms' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminForms />
        </motion.div>
      )}

      {activeTab === 'apikeys' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminApiKeys />
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-blue-500" /> Quản lý danh sách User
            </h2>
            <div className="text-sm text-slate-500 font-medium">Tổng số: {users.length} user</div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 pl-6 pr-6 text-center text-slate-500">Đang tải biểu dữ liệu...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal">Tài khoản</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal">Số điện thoại</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal">Vai trò</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal">Trạng thái</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal">Đăng nhập lần cuối</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal">IP / Vị trí</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal text-right">Quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 border border-slate-300 dark:border-white/20">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="font-bold text-slate-500 dark:text-white">{u.displayName?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{u.displayName}</div>
                            <div className="text-xs text-slate-500 max-w-[150px] truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {u.phoneNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px]  font-bold rounded-full ${u.role?.includes('admin') ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${u.isBanned ? 'bg-red-500' : (u.status === 'active' ? 'bg-green-500' : 'bg-amber-500')}`}></div>
                          <span className={u.isBanned ? 'text-red-500 font-medium' : 'text-slate-600 dark:text-slate-300'}>
                            {u.isBanned ? 'Khóa' : (u.status === 'active' ? 'Trực tuyến' : 'Ngoại tuyến')}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 min-w-[160px]">
                        <div className="text-xs">
                          {u.lastLoginAt ? format(toSafeDate(u.lastLoginAt), 'HH:mm - dd/MM/yyyy') : (u.createdAt ? format(toSafeDate(u.createdAt), 'HH:mm - dd/MM/yyyy') : 'N/A')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 min-w-[200px]">
                        <div className="text-[11px] leading-relaxed">
                          <div className="flex items-center gap-1.5 text-blue-500 font-bold mb-0.5">
                            <Globe className="w-3 h-3" />
                            <span>{(u as any).lastIpAddress || 'Hidden'}</span>
                          </div>
                          {u.location ? (
                            <a 
                              href={`https://www.google.com/maps?q=${u.location.lat},${u.location.lng}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex flex-col gap-0.5 p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-500/20 transition-all group/loc"
                            >
                              <div className="flex items-center gap-1.5 text-slate-400 group-hover/loc:text-blue-500 font-mono transition-colors">
                                <MapPin className="w-3 h-3" />
                                <span>{u.location.lat.toFixed(6)}, {u.location.lng.toFixed(6)}</span>
                              </div>
                              {u.location.address ? (
                                <div className="text-[10px] text-slate-600 mt-1 line-clamp-2 italic leading-tight">
                                  {u.location.address}
                                </div>
                              ) : (
                                <div className="text-[10px] text-blue-500/70 font-medium mt-1">
                                   Xem trên bản đồ →
                                </div>
                              )}
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono italic">
                              <MapPin className="w-3 h-3" />
                              <span>Chưa có dữ liệu</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                          <button
                            onClick={() => handleBanUser(u.uid, !!u.isBanned)}
                            disabled={!isSuperAdmin || u.role === 'superadmin'}
                            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center shrink-0 w-9 h-9"
                            title={u.isBanned ? 'Gỡ Ban' : 'Cấm tài khoản'}
                          >
                            <Lock className="w-5 h-5" />
                          </button>
                          <select
                            disabled={!isSuperAdmin}
                          value={u.role || 'user'}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Quản trị viên</option>
                            <option value="superadmin">Tổng Quản trị</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(u.uid)}
                            disabled={!isSuperAdmin}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-500 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'system' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Người dùng', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'IP Bị chặn', value: stats.blockedIps, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                { label: 'Tiện ích', value: stats.utilities, icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500  tracking-wider leading-none mb-1">{s.label}</p>
                  <h4 className="text-lg font-medium text-slate-900 dark:text-white leading-none">{s.value}</h4>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 ${maintenanceMode ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-green-500/20 text-green-500 border-green-500/30'}`}>
                {maintenanceMode ? <StopCircle className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{maintenanceMode ? 'Chế độ Bảo trì Tổng' : 'Hệ thống Đang chạy'}</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Kiểm soát truy cập toàn bộ ứng dụng đối với người dùng cuối.</p>
              </div>
            </div>
            <button
               onClick={toggleMaintenance}
               disabled={!isSuperAdmin}
               className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold  tracking-wider text-sm transition-colors flex items-center gap-2 ${
                 maintenanceMode ? 'bg-white border hover:bg-slate-50 text-slate-700 dark:border-none dark:bg-white/10 dark:text-white dark:hover:bg-white/20' : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
               } disabled:opacity-50`}
            >
              <RefreshCcw className="w-4 h-4" />
              {maintenanceMode ? 'Khôi phục Web' : 'Bật Bảo trì Tổng'}
            </button>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <AppWindow className="w-6 h-6 text-indigo-500" />
              Bảo trì theo thiết bị
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'pc', label: 'Máy tính (PC/Laptop)', icon: Server },
                { key: 'mobile', label: 'Điện thoại (Mobile)', icon: Phone },
                { key: 'tablet', label: 'Máy tính bảng (Tablet)', icon: AppWindow }
              ].map((dev) => (
                <div key={dev.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900/10 dark:bg-white/10 flex items-center justify-center">
                      <dev.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{dev.label}</h4>
                  </div>
                  <button 
                    onClick={() => toggleDeviceMaintenance(dev.key as any)}
                    disabled={!isSuperAdmin}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${maintenanceDevices[dev.key as keyof typeof maintenanceDevices] ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceDevices[dev.key as keyof typeof maintenanceDevices] ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-500" />
              Bảo trì từng tính năng
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {[
                { key: 'dashboard', label: 'Trang Tổng quan', icon: Layout, page: 'Trang chủ' },
                { key: 'profile', label: 'Hồ sơ / Tài khoản', icon: UserCircle, page: 'Hệ thống' },
                { key: 'utilities', label: 'Trang Tiện ích', icon: Wrench, page: 'Hệ thống' },
              ].map((tab) => (
                <div key={tab.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <tab.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{tab.label}</h4>
                      <p className="text-[10px] text-slate-500 italic">{tab.page}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleTabMaintenance(tab.key)}
                    disabled={!isSuperAdmin}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${maintenanceTabs[tab.key] ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs[tab.key] ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 mb-4 flex items-center gap-2">
               <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
               <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Tiện ích hệ thống (Mặc định)</span>
               <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {[
                { id: 'ai-scanner', title: 'Quét Văn Bản AI', icon: Scan },
                { id: 'image-to-pdf', title: 'Ảnh sang PDF', icon: FileImage },
                { id: 'pdf-to-word', title: 'PDF sang Word', icon: FileText },
                { id: 'find-my-device', title: 'Định Vị Thiết Bị', icon: Box }
              ].map((util) => (
                <div key={util.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <util.icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{util.title}</h4>
                      <p className="text-[9px] text-slate-500 italic">Core Utility</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleTabMaintenance(`utility_${util.id}`)}
                    disabled={!isSuperAdmin}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${maintenanceTabs[`utility_${util.id}`] ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceTabs[`utility_${util.id}`] ? 'translate-x-5' : 'translate-x-1'}`}/>
                  </button>
                </div>
              ))}
            </div>

            {allUtilities.length > 0 && (
              <>
                <div className="mt-8 mb-4 flex items-center gap-2">
                   <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                   <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Tiện ích mở rộng (Cài đặt)</span>
                   <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                   {allUtilities.map((util) => (
                      <div key={util.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <Box className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{util.title}</h4>
                            <p className="text-[9px] text-slate-500 italic">ID: {util.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleTabMaintenance(`utility_${util.id}`)}
                          disabled={!isSuperAdmin}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${maintenanceTabs[`utility_${util.id}`] ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceTabs[`utility_${util.id}`] ? 'translate-x-5' : 'translate-x-1'}`}/>
                        </button>
                      </div>
                   ))}
                </div>
              </>
            )}
            
            <p className="text-xs text-slate-500 mt-6 md:flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              Khi bật bảo trì, chỉ có tài khoản Quản trị viên mới truy cập được tab tương ứng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
                Cấm sử dụng theo Hệ điều hành
                </h3>
                <p className="text-xs text-slate-500 mb-6 italic">* Lưu ý: Khi bật, thiết bị sử dụng HĐH tương ứng sẽ bị chặn truy cập hoàn toàn.</p>
                <div className="space-y-4">
                {[
                    { key: 'ios', label: 'Điện thoại iOS (iPhone)', icon: Apple },
                    { key: 'android', label: 'Điện thoại Android', icon: MonitorSmartphone },
                ].map((dev) => (
                    <div key={dev.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <dev.icon className="w-5 h-5 text-rose-600" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{dev.label}</h4>
                    </div>
                    <button 
                        onClick={() => toggleBlockedDevice(dev.key as any)}
                        disabled={!isSuperAdmin}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${blockedDevices[dev.key as keyof typeof blockedDevices] ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${blockedDevices[dev.key as keyof typeof blockedDevices] ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    </div>
                ))}
                </div>
            </div>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}

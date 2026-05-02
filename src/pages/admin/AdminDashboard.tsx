import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, Users, Activity, Settings, Trash2, StopCircle, RefreshCcw, Lock, Box, Wrench, AppWindow, Gamepad2, FileText, Newspaper, Code, Info, Mail, MessageSquare, ShieldAlert, Gift, Landmark, LineChart, Bell, Globe, Server } from 'lucide-react';
import { useAuthStore, UserData } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { vi } from 'date-fns/locale';

import AdminProducts from './AdminProducts';
import AdminUtilities from './AdminUtilities';
import AdminNotifications from './AdminNotifications';
import AdminAirdrop from './AdminAirdrop';
import AdminIpBlocking from './AdminIpBlocking';
import AdminLogins from './AdminLogins';
import AdminBanks from './AdminBanks';
import AdminExchanges from './AdminExchanges';
import AdminDnsRequests from './AdminDnsRequests';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminDashboard() {
  const { isSuperAdmin } = useAuthStore();
  const { maintenanceMode, setMaintenanceMode, maintenanceTabs, setMaintenanceTabs } = useAppStore();
  const { openConfirm } = useConfirmStore();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'banned' | 'products' | 'utilities' | 'notifications' | 'github' | 'about' | 'contacts' | 'airdrop' | 'logins' | 'banks' | 'exchanges' | 'dns'>('users');
  const [domainExpiryInput, setDomainExpiryInput] = useState('');
  const { domainExpiryDate } = useAppStore();
  
  useEffect(() => {
    if (domainExpiryDate) {
      setDomainExpiryInput(domainExpiryDate);
    }
  }, [domainExpiryDate]);

  const handleSaveDomainExpiry = async () => {
    if (!isSuperAdmin) return toast.error('Quyền truy cập bị từ chối.');
    if (!domainExpiryInput) return toast.error('Vui lòng chọn ngày!');
    
    try {
      await setDoc(doc(db, 'settings', 'system'), { domainExpiryDate: domainExpiryInput }, { merge: true });
      toast.success('Đã cập nhật thời hạn domain chung');
    } catch (e) {
      toast.error('Lỗi thiết lập!');
    }
  };

  const [contacts, setContacts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    blockedIps: 0,
    files: 0,
    notifications: 0,
    airdrops: 0,
    utilities: 0
  });
  const [aboutConfig, setAboutConfig] = useState({
    introTitle: '',
    introDesc: '',
    adminName: '',
    adminBio: '',
    adminPhoto: '',
    facebook: '',
    github: '',
    zalo: '',
    youtube: '',
    email: ''
  });
  const [githubConfig, setGithubConfig] = useState({
    username: '',
    repo: '',
    token: ''
  });

  useEffect(() => {
    const unsubGithub = onSnapshot(doc(db, 'settings', 'github'), (doc) => {
      if (doc.exists()) {
        setGithubConfig(doc.data() as any);
      }
    });

    const unsubContacts = onSnapshot(query(collection(db, 'contact_requests'), orderBy('createdAt', 'desc')), (snap) => {
      setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchAbout = async () => {
      const snap = await getDoc(doc(db, 'settings', 'about'));
      if (snap.exists()) setAboutConfig(snap.data() as any);
    };
    fetchAbout();

    // Stats listeners
    const unsubStatsUsers = onSnapshot(collection(db, 'users'), s => setStats(prev => ({ ...prev, users: s.size })));
    const unsubStatsIps = onSnapshot(collection(db, 'blockedIps'), s => setStats(prev => ({ ...prev, blockedIps: s.size })));
    const unsubStatsFiles = onSnapshot(collection(db, 'files'), s => setStats(prev => ({ ...prev, files: s.size })));
    const unsubStatsNotifs = onSnapshot(collection(db, 'notifications'), s => setStats(prev => ({ ...prev, notifications: s.size })));
    const unsubStatsAirdrops = onSnapshot(collection(db, 'airdrops'), s => setStats(prev => ({ ...prev, airdrops: s.size })));
    const unsubStatsUtils = onSnapshot(collection(db, 'utilities'), s => setStats(prev => ({ ...prev, utilities: s.size })));

    return () => {
      unsubGithub();
      unsubContacts();
      unsubStatsUsers();
      unsubStatsIps();
      unsubStatsFiles();
      unsubStatsNotifs();
      unsubStatsAirdrops();
      unsubStatsUtils();
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
    window.location.href = `mailto:${email}?subject=Phản hồi yêu cầu hỗ trợ từ Admin Pro Ecosystem`;
  };

  const saveGithubConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'github'), githubConfig);
      toast.success('Đã lưu cấu hình GitHub');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình GitHub');
    }
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

  const toggleTabMaintenance = async (tabKey: keyof typeof maintenanceTabs) => {
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 p-4 lg:p-6 flex flex-col gap-4 lg:gap-8 bg-white dark:bg-slate-900 lg:bg-transparent">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-500" />
            Control Panel 
        </h1>
        
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
          {[
            { id: 'users', label: 'Người dùng', icon: Users },
            { id: 'banned', label: 'IP Banned', icon: ShieldAlert },
            { id: 'system', label: 'Hệ thống', icon: Settings },
            { id: 'products', label: 'Sản phẩm', icon: Box },
            { id: 'notifications', label: 'Thông báo', icon: MessageSquare },
            { id: 'utilities', label: 'Tiện ích', icon: Wrench },
            { id: 'banks', label: 'Ngân hàng ĐT', icon: Landmark },
            { id: 'exchanges', label: 'Sàn GT ĐT', icon: LineChart },
            { id: 'logins', label: 'Tài khoản ĐN', icon: Users },
            { id: 'github', label: 'GitHub Setup', icon: Code },
            { id: 'about', label: 'About Setup', icon: Info },
            { id: 'contacts', label: 'Yêu cầu hỗ trợ', icon: Mail },
            { id: 'airdrop', label: 'Quản lý Airdrop', icon: Gift },
            { id: 'dns', label: 'DNS Subdomain', icon: Server },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition shrink-0 lg:shrink ${activeTab === tab.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                <tab.icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-10 overflow-x-auto w-full">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter">
            Quản lý { {users: 'Người dùng', banned: 'IP Banned', system: 'Hệ thống', products: 'Sản phẩm', notifications: 'Thông báo', utilities: 'Tiện ích', github: 'GitHub', about: 'About', contacts: 'Yêu cầu hỗ trợ', airdrop: 'Quản lý Airdrop', logins: 'Tài khoản đăng nhập', banks: 'Ngân hàng đối tác', exchanges: 'Sàn giao dịch đối tác', dns: 'Bản ghi DNS Subdomain'}[activeTab] }
        </h1>


      {activeTab === 'about' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Info className="w-6 h-6 text-blue-500" /> Cấu hình trang Giới thiệu (About)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase text-slate-500">Thông tin chung website</h4>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Tiêu đề Intro</label>
                    <input 
                      type="text" 
                      value={aboutConfig.introTitle}
                      onChange={(e) => setAboutConfig({...aboutConfig, introTitle: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="Hệ Sinh Thái Personal Profile"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Mô tả intro</label>
                    <textarea 
                      rows={4}
                      value={aboutConfig.introDesc}
                      onChange={(e) => setAboutConfig({...aboutConfig, introDesc: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                    />
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="font-bold text-sm uppercase text-slate-500">Thông tin Admin</h4>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Tên Admin / Tittle</label>
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
               
               <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm w-full">
                  <h4 className="font-bold text-sm uppercase text-slate-500">Mạng xã hội & Liên hệ (Contact Page)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 ml-1">Facebook URL</label>
                      <input 
                        type="url" 
                        value={aboutConfig.facebook}
                        onChange={(e) => setAboutConfig({...aboutConfig, facebook: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 ml-1">GitHub URL</label>
                      <input 
                        type="url" 
                        value={aboutConfig.github}
                        onChange={(e) => setAboutConfig({...aboutConfig, github: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 ml-1">Zalo Phone/URL</label>
                      <input 
                        type="text" 
                        value={aboutConfig.zalo}
                        onChange={(e) => setAboutConfig({...aboutConfig, zalo: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 ml-1">Email</label>
                      <input 
                        type="email" 
                        value={aboutConfig.email}
                        onChange={(e) => setAboutConfig({...aboutConfig, email: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  </div>
               </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
               <button 
                onClick={saveAboutConfig}
                className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
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
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="w-5 h-5 text-rose-500" /> Danh sách yêu cầu hỗ trợ
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contacts.length > 0 ? contacts.map((req) => (
                <div key={req.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl relative group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                           {req.name.charAt(0)}
                         </div>
                         <div>
                           <h4 className="font-bold text-slate-900 dark:text-white">{req.name}</h4>
                           <p className="text-xs text-slate-500">{req.email}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleReply(req.email)}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Trả lời qua Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteContact(req.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-white/5 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic border border-slate-100 dark:border-white/5 mb-3">
                      "{req.message}"
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium pt-3 border-t border-slate-100 dark:border-white/5">
                    Gửi lúc: {format(toSafeDate(req.createdAt), 'HH:mm - dd/MM/yyyy')}
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center text-slate-500">Chưa có yêu cầu nào.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'products' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminProducts />
        </motion.div>
      )}

      {activeTab === 'utilities' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminUtilities />
        </motion.div>
      )}

      {activeTab === 'banks' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminBanks />
        </motion.div>
      )}

      {activeTab === 'exchanges' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminExchanges />
        </motion.div>
      )}

      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminNotifications />
        </motion.div>
      )}

      {activeTab === 'github' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Code className="w-6 h-6 text-slate-800 dark:text-white" />
              GitHub Repository Setup
            </h3>
            
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GitHub Username</label>
                <input 
                  type="text" 
                  value={githubConfig.username}
                  onChange={(e) => setGithubConfig({...githubConfig, username: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. duclsh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Repository Name</label>
                <input 
                  type="text" 
                  value={githubConfig.repo}
                  onChange={(e) => setGithubConfig({...githubConfig, repo: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. cdn-storage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Personal Access Token (PAT)</label>
                <input 
                  type="password" 
                  value={githubConfig.token}
                  onChange={(e) => setGithubConfig({...githubConfig, token: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <p className="text-[11px] text-slate-500 mt-2 italic">
                  Token này được dùng để upload ảnh (Avatar, Banner) và Files lên GitHub làm CDN.
                </p>
              </div>
              
              <button 
                onClick={saveGithubConfig}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'airdrop' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminAirdrop />
        </motion.div>
      )}

      {activeTab === 'dns' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminDnsRequests />
        </motion.div>
      )}

      {activeTab === 'logins' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminLogins />
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm">
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
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Tài khoản</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Vai trò</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Trạng thái</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Đăng nhập lần cuối</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">IP / Vị trí</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Quản trị</th>
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
                        <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full ${u.role?.includes('admin') ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${u.isBanned ? 'bg-red-500' : (u.status === 'active' ? 'bg-green-500' : 'bg-amber-500')}`}></div>
                          <span className={u.isBanned ? 'text-red-500 font-medium' : 'text-slate-600 dark:text-slate-300'}>{u.isBanned ? 'Banned' : (u.status === 'active' ? 'Online' : 'Offline')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 min-w-[160px]">
                        <div className="text-xs">
                          {u.lastLoginAt ? format(toSafeDate(u.lastLoginAt), 'HH:mm - dd/MM/yyyy') : (u.createdAt ? format(toSafeDate(u.createdAt), 'HH:mm - dd/MM/yyyy') : 'N/A')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 min-w-[160px]">
                        <div className="text-[11px] leading-relaxed">
                          <div>IP: {(u as any).lastIpAddress || 'Auto'}</div>
                          <div className="text-slate-400">
                            {typeof (u as any).lastLocation === 'object' && (u as any).lastLocation !== null 
                              ? `${(u as any).lastLocation.latitude}, ${(u as any).lastLocation.longitude}`
                              : ((u as any).lastLocation || 'Vietnam')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
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
              { label: 'Tài liệu', value: stats.files, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Thông báo', value: stats.notifications, icon: Bell, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { label: 'Airdrops', value: stats.airdrops, icon: Gift, color: 'text-pink-500', bg: 'bg-pink-500/10' },
              { label: 'Tiện ích', value: stats.utilities, icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">{s.label}</p>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none">{s.value}</h4>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
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
               className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors flex items-center gap-2 ${
                 maintenanceMode ? 'bg-white border hover:bg-slate-50 text-slate-700 dark:border-none dark:bg-white/10 dark:text-white dark:hover:bg-white/20' : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
               } disabled:opacity-50`}
            >
              <RefreshCcw className="w-4 h-4" />
              {maintenanceMode ? 'Khôi phục Web' : 'Bật Bảo trì Tổng'}
            </button>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center border-4 bg-indigo-500/20 text-indigo-500 border-indigo-500/30">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thiết lập Hạn sử dụng Subdomain</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Người dùng sẽ không thấy ngày hết hạn thực tế của domain mà chỉ thấy số ngày còn lại theo cài đặt này.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                <input 
                  type="date"
                  value={domainExpiryInput}
                  onChange={(e) => setDomainExpiryInput(e.target.value)}
                  className="w-full sm:w-48 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 ring-indigo-500/20 transition-all dark:text-white"
                />
              </div>
              <button
                onClick={handleSaveDomainExpiry}
                disabled={!isSuperAdmin}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-500" />
              Bảo trì từng tính năng
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Cửa hàng Sản phẩm</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì ProductsPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('products')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.products ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.products ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Tiện ích Web</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì UtilitiesPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('utilities')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.utilities ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.utilities ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Thị trường</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì MarketPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('market')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.market ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.market ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Chia sẻ File</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì FilesPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('files')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.files ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.files ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Ngân hàng</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì BanksPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('banks')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.banks ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.banks ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Sàn giao dịch</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì ExchangesPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('exchanges')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.exchanges ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.exchanges ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Tin tức</h4>
                    <p className="text-[10px] text-slate-500">Bảo trì NewsPage</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTabMaintenance('news')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceTabs.news ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceTabs.news ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

            </div>
            
            <p className="text-xs text-slate-500 mt-6">
              Khi bật bảo trì, chỉ có tài khoản Quản trị viên mới truy cập được tab tương ứng.
            </p>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}

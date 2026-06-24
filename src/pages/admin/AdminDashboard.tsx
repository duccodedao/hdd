import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../lib/firebase';
import { Shield, Sparkles, Users, Activity, Settings, BookOpen, FilePlus, FileArchive, Scissors, Trash2, StopCircle, Copy, X, RefreshCcw, Lock, Box, Wrench, AppWindow, Gamepad2, FileText, Newspaper, Code, Info, Mail, MessageSquare, ShieldAlert, Gift, Landmark, LineChart, Bell, Globe, Server, MapPin, UserCircle, CheckSquare, Play, Phone, Apple, MonitorSmartphone, Files, Clock, Layout, Scan, FileImage, FolderOpen, Laptop, Save, Github, ExternalLink, Download, Upload, Edit2, Image as ImageIcon, Music, ChevronDown, Lightbulb, Calendar, Plus, ShoppingBag, FileSpreadsheet, Heart } from 'lucide-react';
import { useAuthStore, UserData } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { format, subDays } from 'date-fns';
import { toSafeDate, cn } from '../../lib/utils';
import { vi } from 'date-fns/locale';

import AdminUtilities from './AdminUtilities';
import AdminIpBlocking from './AdminIpBlocking';
import AdminApiKeys from './AdminApiKeys';
import AdminForms from './AdminForms';
import AdminDocumentVault from './AdminDocumentVault';
import AdminSystem from './AdminSystem';
import AdminPartners from './AdminPartners';
import AdminOverview from './AdminOverview';
import AdminAiTools from './AdminAiTools';
import AdminSecuritySessions from './AdminSecuritySessions';
import AdminAffiliate from './AdminAffiliate';
import { useConfirmStore } from '../../store/confirmStore';
import { useAudioStore } from '../../store/audioStore';
import { githubService } from '../../services/githubService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export default function AdminDashboard() {
  const { isSuperAdmin, userData } = useAuthStore();
  const [showReviewUserModal, setShowReviewUserModal] = useState(false);
  const [reviewModalMode, setReviewModalMode] = useState<'auto'|'manual'>('auto');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewPassword, setReviewPassword] = useState('');
  const [reviewCreatedInfo, setReviewCreatedInfo] = useState<{email:string, password:string}|null>(null);
  const [showPasswordForUser, setShowPasswordForUser] = useState<any>(null);
  const { maintenanceMode, setMaintenanceMode, maintenanceTabs, setMaintenanceTabs, maintenanceDevices, setMaintenanceDevices, blockedDevices, setBlockedDevices, hasUnapprovedSessions } = useAppStore();
  const { openConfirm } = useConfirmStore();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [userFilter, setUserFilter] = useState<'all' | 'review'>('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'apps' | 'system' | 'banned' | 'utilities' | 'contacts' | 'about' | 'apikeys' | 'forms' | 'document_vault' | 'admin_system' | 'versions' | 'partners' | 'ai_tools' | 'security_sessions' | 'affiliate' | 'health'>('dashboard');

  const [contacts, setContacts] = useState<any[]>([]);
  const [allUtilities, setAllUtilities] = useState<any[]>([]);
  const [siteStats, setSiteStats] = useState({
    today: 0,
    month: 0,
    year: 0,
    total: 0,
    last7Days: [] as { date: string, visits: number, devices: number }[]
  });
  
  const [aboutConfig, setAboutConfig] = useState({
    introTitle: 'Hệ thống - Nền tảng công nghệ toàn diện',
    introDesc: 'Trải nghiệm không gian công nghệ số hiện đại. Tích hợp các công cụ quản lý và tiện ích thông minh, mang đến trải nghiệm tinh tế cho người dùng.',
    heroBanner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
    adminName: 'Quản trị viên',
    adminBio: 'Đam mê phát triển các nền tảng số hiện đại. Tập trung xây dựng giải pháp tối ưu và trải nghiệm người dùng tinh tế thông qua công nghệ.',
    adminPhoto: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
    webLogo: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
    facebook: 'https://facebook.com/your-username',
    github: 'https://github.com/your-username',
    youtube: 'https://youtube.com/@your-channel',
    email: 'contact@system.com',
    phone: '',
    zalo: '',
    address: ''
  });

  const [notificationConfig, setNotificationConfig] = useState({
    active: false,
    message: '',
    isEmergency: false,
    popupActive: false,
    popupTitle: '',
    popupMessage: ''
  });

  const [googleClientId, setGoogleClientIdState] = useState('');
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [ipWhitelistText, setIpWhitelistText] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [adminPin, setAdminPin] = useState('1234');
  const [bankingConfig, setBankingConfig] = useState({
    bankCode: 'MB',
    bankAccount: '00010302003',
    ownerName: 'Vũ Minh Đức'
  });

  const [fileManagerConfig, setFileManagerConfig] = useState({
    username: '',
    repo: '',
    token: '',
    branch: 'main'
  });

  const [githubGlobalConfig, setGithubGlobalConfig] = useState({
    username: '',
    token: ''
  });

  const [imageUploadConfig, setImageUploadConfig] = useState({
    username: '',
    repo: '',
    token: '',
    branch: 'main',
    path: 'assets/uploads'
  });

  const [githubIntegrationConfig, setGithubIntegrationConfig] = useState({
    username: '',
    repo: '',
    token: '',
    branch: 'main',
    path: 'assets/uploads'
  });

  const [audioConfig, setAudioConfig] = useState({
    musicUrl: '',
    title: 'Nhạc nền hệ thống BMass',
    repo: '',
    branch: 'main',
    path: 'assets/audio'
  });

  const [stampConfig, setStampConfig] = useState({
    active: false,
    imageUrl: '',
    opacity: 50,
    position: 'bottom-right',
    width: 120,
    zIndex: 9999
  });

  const [maintenanceStampConfig, setMaintenanceStampConfig] = useState({
    imageUrl: '',
    opacity: 80,
    width: 80,
  });

  const [audioUploading, setAudioUploading] = useState(false);
  const [isUploadingWebLogo, setIsUploadingWebLogo] = useState(false);
  const [isUploadingHeroBanner, setIsUploadingHeroBanner] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [isUploadingMaintenanceStamp, setIsUploadingMaintenanceStamp] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const [seoConfig, setSeoConfig] = useState({
    title: '',
    description: '',
    imageUrl: '',
    faviconUrl: ''
  });
  const [isUploadingSeoImg, setIsUploadingSeoImg] = useState(false);
  const [isUploadingSeoIcon, setIsUploadingSeoIcon] = useState(false);

  const [expandedSetting, setExpandedSetting] = useState<string | null>('global');

  // States for dynamic application portal setup
  const [adminApps, setAdminApps] = useState<any[]>([]);
  const [appCategories, setAppCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [appForm, setAppForm] = useState({
    title: '',
    description: '',
    logoUrl: '',
    appUrl: '',
    categoryId: ''
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [systemTools, setSystemTools] = useState<any>({});

  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isImportingUsers, setIsImportingUsers] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllApps = () => {
    if (selectedAppIds.length === adminApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(adminApps.map(a => a.id));
    }
  };

  const handleBulkDeleteApps = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm({
      title: 'Xác nhận xóa hàng loạt ứng dụng',
      message: `Bạn có chắc chắn muốn xóa ${selectedAppIds.length} ứng dụng đã chọn? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          const { writeBatch } = await import('firebase/firestore');
          const batch = writeBatch(db);
          selectedAppIds.forEach(id => {
            batch.delete(doc(db, 'apps', id));
          });
          await batch.commit();
          setSelectedAppIds([]);
          toast.success('Đã xóa các ứng dụng được chọn');
        } catch (e) {
          toast.error('Lỗi khi xóa hàng loạt ứng dụng');
        }
      }
    });
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUserUids(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid]);
  };

  const toggleSelectAllUsers = () => {
    const filteredUsers = userFilter === 'all' ? users : users.filter(u => u.role === 'review');
    if (selectedUserUids.length === filteredUsers.length) {
      setSelectedUserUids([]);
    } else {
      setSelectedUserUids(filteredUsers.map(u => u.uid));
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    if (!isSuperAdmin) {
      toast.error('Bạn không có quyền thực hiện hành động này');
      return;
    }
    openConfirm({
      title: 'Xác nhận xóa hàng loạt người dùng',
      message: `Bạn có chắc chắn muốn xóa ${selectedUserUids.length} người dùng đã chọn? Thao tác này sẽ xóa vĩnh viễn dữ liệu người dùng khỏi Database.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          const { writeBatch } = await import('firebase/firestore');
          const batch = writeBatch(db);
          selectedUserUids.forEach(uid => {
            batch.delete(doc(db, 'users', uid));
          });
          await batch.commit();
          setSelectedUserUids([]);
          toast.success('Đã xóa các người dùng được chọn');
        } catch (e) {
          toast.error('Lỗi khi xóa hàng loạt người dùng');
        }
      }
    });
  };

  const toggleSelectContact = (id: string) => {
    setSelectedContactIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllContacts = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map(c => c.id));
    }
  };

  const handleBulkDeleteContacts = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    openConfirm({
      title: 'Xác nhận xóa hàng loạt yêu cầu',
      message: `Bạn có chắc chắn muốn xóa ${selectedContactIds.length} yêu cầu hỗ trợ đã chọn?`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          const { writeBatch } = await import('firebase/firestore');
          const batch = writeBatch(db);
          selectedContactIds.forEach(id => {
            batch.delete(doc(db, 'contact_requests', id));
          });
          await batch.commit();
          setSelectedContactIds([]);
          toast.success('Đã xóa các yêu cầu được chọn');
        } catch (e) {
          toast.error('Lỗi khi xóa hàng loạt yêu cầu');
        }
      }
    });
  };

  useEffect(() => {
    setSelectedAppIds([]);
    setSelectedUserUids([]);
    setSelectedContactIds([]);
  }, [activeTab, userFilter]);

  useEffect(() => {
    if (!userData) return;

    if (userData.role === 'review') {
      setContacts([]);
      setAllUtilities([]);
      setAdminApps([]);
      setAppCategories([]);
      setUsers([]);
      setActivityData([]);
      setRoleDistribution([]);
      setSiteStats({ today: 0, month: 0, year: 0, total: 0, last7Days: [] });
      setAboutConfig({
        introTitle: '', introDesc: '', heroBanner: '', adminName: '', adminBio: '', adminPhoto: '', webLogo: '',
        facebook: '', github: '', youtube: '', email: '', phone: '', zalo: '', address: ''
      });
      setSeoConfig({ title: '', description: '', imageUrl: '', faviconUrl: '' });
      setGoogleClientIdState('');
      setIpWhitelistText('');
      setAppVersion('');
      setAdminPin('');
      setLoading(false);
      return;
    }

    const isAdmin = userData.role === 'admin' || userData.role === 'superadmin' || userData.email === 'sonlyhongduc@gmail.com' || userData.email === 'sonlyhongduc1@ghn.vn';

    const unsubToolPerms = onSnapshot(doc(db, 'settings', 'tool_permissions'), (docSnap) => {
      if (docSnap.exists()) {
        setSystemTools(docSnap.data());
      }
    }, (err) => console.error("Admin: tool_permissions listener error:", err?.message || String(err)));

    let unsubContacts = () => {};
    if (isAdmin) {
      unsubContacts = onSnapshot(query(collection(db, 'contact_requests'), orderBy('createdAt', 'desc')), (snap) => {
        setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => console.error("Admin: contact_requests listener error:", err?.message || String(err)));
    }
    
    // Fetch settings ONCE to avoid overwriting admin inputs while typing
    const fetchSettings = async () => {
      try {
        const sysSnap = await getDoc(doc(db, 'settings', 'system'));
        if (sysSnap.exists()) {
          const data = sysSnap.data();
          if (data.googleClientId) setGoogleClientIdState(data.googleClientId);
          if (data.ipWhitelistEnabled !== undefined) setIpWhitelistEnabled(data.ipWhitelistEnabled);
          if (data.ipWhitelistText !== undefined) setIpWhitelistText(data.ipWhitelistText);
          if (data.appVersion) setAppVersion(data.appVersion);
          if (data.adminPin) setAdminPin(data.adminPin);
          if (data.blockedDevices) setBlockedDevices(data.blockedDevices);
          if (data.notificationConfig) setNotificationConfig(data.notificationConfig);
          if (data.fileManagerConfig) setFileManagerConfig(data.fileManagerConfig);
          if (data.githubGlobalConfig) setGithubGlobalConfig(data.githubGlobalConfig);
          if (data.imageUploadConfig) setImageUploadConfig(data.imageUploadConfig);
          if (data.stampConfig) setStampConfig(prev => ({ ...prev, ...data.stampConfig }));
          if (data.maintenanceStampConfig) setMaintenanceStampConfig(prev => ({ ...prev, ...data.maintenanceStampConfig }));
          if (data.bankingConfig) {
            setBankingConfig(prev => ({ ...prev, ...data.bankingConfig }));
          }
        }

        try {
          const ghSnap = await getDoc(doc(db, 'settings', 'github_integration'));
          if (ghSnap.exists()) {
            const data = ghSnap.data();
            const fetchedUsername = data.username || data.owner || '';
            const fetchedToken = data.token || '';
            setGithubIntegrationConfig({
              username: fetchedUsername,
              repo: data.repo || '',
              token: fetchedToken,
              branch: data.branch || 'main',
              path: data.path || 'assets/uploads'
            });
            setGithubGlobalConfig(prev => ({
              username: prev.username || fetchedUsername,
              token: prev.token || fetchedToken
            }));
          }
        } catch (err) {
          console.warn("Could not fetch github_integration settings (may not be admin or missing collection):", err);
        }

        const audioSnap = await getDoc(doc(db, 'settings', 'audio'));
        if (audioSnap.exists()) {
          const data = audioSnap.data();
          setAudioConfig({
            musicUrl: data.musicUrl || '',
            title: data.title || 'Nhạc nền hệ thống BMass',
            repo: data.repo || '',
            branch: data.branch || 'main',
            path: data.path || 'assets/audio'
          });
        }

        const seoSnap = await getDoc(doc(db, 'settings', 'seo'));
        if (seoSnap.exists()) {
          const data = seoSnap.data();
          setSeoConfig({
            title: data.title || '',
            description: data.description || '',
            imageUrl: data.imageUrl || '',
            faviconUrl: data.faviconUrl || ''
          });
        }
      } catch (err) {
        console.error("Error fetching settings:", err?.message || String(err));
      }
    };
    
    const fetchAbout = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'about'));
        if (snap.exists()) setAboutConfig(prev => ({ ...prev, ...snap.data() }));
      } catch (e) {
        console.error("Admin: fetchAbout error:", e?.message || String(e));
      }
    };

    if (isAdmin) {
      fetchSettings();
      fetchAbout();
    }

    const unsubAllUtils = onSnapshot(collection(db, 'utilities'), (snapshot) => {
      setAllUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Admin: utilities listener error:", err?.message || String(err)));

    const unsubApps = onSnapshot(query(collection(db, 'apps'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAdminApps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Admin: apps listener error:", err?.message || String(err)));

    const unsubCategories = onSnapshot(collection(db, 'app_categories'), (snapshot) => {
      const cats: any = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppCategories(cats.sort((a: any, b: any) => a.createdAt?.toMillis() - b.createdAt?.toMillis() || 0));
    }, (err) => console.error("Admin: categories listener error:", err?.message || String(err)));

    // Listen to site stats
    const now = new Date();
    const todayId = `day_${format(now, 'yyyy-MM-dd')}`;
    const monthId = `month_${format(now, 'yyyy-MM')}`;
    const yearId = `year_${format(now, 'yyyy')}`;

    const unsubStats = onSnapshot(collection(db, 'site_visitation_stats'), (snapshot) => {
      const stats: any = { today: 0, month: 0, year: 0, total: 0, last7Days: [] };
      const docData: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        docData[doc.id] = doc.data().count || 0;
      });

      stats.total = docData['total'] || 0;
      stats.today = docData[todayId] || 0;
      stats.month = docData[monthId] || 0;
      stats.year = docData[yearId] || 0;

      // Calculate last 7 days stats
      for (let i = 6; i >= 0; i--) {
        const d = subDays(now, i);
        const dayStr = format(d, 'yyyy-MM-dd');
        const displayStr = format(d, 'dd/MM');
        
        stats.last7Days.push({
          date: displayStr,
          visits: docData[`day_${dayStr}`] || 0,
          devices: docData[`devices_day_${dayStr}`] || 0,
        });
      }

      setSiteStats(stats);
    }, (error) => {
      console.error("Error listening to site stats:", error?.message || String(error));
    });

    return () => {
      unsubToolPerms();
      unsubContacts();
      unsubAllUtils();
      unsubApps();
      unsubCategories();
      unsubStats();
    };
  }, []);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleUploadAvatarToGithub = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || githubIntegrationConfig.username || '';
    const token = githubGlobalConfig.token || githubIntegrationConfig.token || '';
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Chưa hoàn tất Cấu hình tài khoản hoặc Kho lưu trữ Hình ảnh ở tab Hệ thống');
      return;
    }

    setIsUploadingAvatar(true);
    setUploadProgress(prev => ({ ...prev, avatar: 0 }));
    const toastId = toast.loading('Đang tải ảnh đại diện lên GitHub...');

    try {
      const ghConfig = {
        owner: username,
        repo: repo,
        token: token,
        branch: branch
      };
      
      const filename = `avatar_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = `avatars/${filename}`;
      
      const result = await githubService.uploadFile(
        ghConfig, 
        file, 
        uploadPath, 
        `Update admin avatar ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, avatar: Math.round(progress) }))
      );

      setAboutConfig(prev => ({ ...prev, adminPhoto: result.url }));
      toast.success('Đã tải lên ảnh đại diện thành công!', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi tải ảnh: ${e.message}`, { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.avatar;
        return next;
      });
      e.target.value = '';
    }
  };

  const handleUploadWebLogoToGithub = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || githubIntegrationConfig.username || '';
    const token = githubGlobalConfig.token || githubIntegrationConfig.token || '';
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Chưa hoàn tất Cấu hình tài khoản hoặc Kho lưu trữ Hình ảnh ở tab Hệ thống');
      return;
    }

    const ghConfig = { owner: username, token, repo, branch };
    
    setIsUploadingWebLogo(true);
    const toastId = toast.loading('Đang tải lên logo web...');
    
    try {
      const ext = file.name.split('.').pop();
      const filename = `logo-${Date.now()}.${ext}`;
      const uploadPath = `system/${filename}`;
      
      const result = await githubService.uploadFile(
        ghConfig, 
        file, 
        uploadPath, 
        `Update system web logo ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, webLogo: Math.round(progress) }))
      );

      setAboutConfig(prev => ({ ...prev, webLogo: result.url }));
      toast.success('Đã tải lên logo thành công!', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi tải logo: ${e.message}`, { id: toastId });
    } finally {
      setIsUploadingWebLogo(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.webLogo;
        return next;
      });
      e.target.value = '';
    }
  };

  const handleUploadHeroBannerToGithub = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || githubIntegrationConfig.username || '';
    const token = githubGlobalConfig.token || githubIntegrationConfig.token || '';
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Chưa hoàn tất Cấu hình tài khoản hoặc Kho lưu trữ Hình ảnh ở tab Hệ thống');
      return;
    }

    const ghConfig = { owner: username, token, repo, branch };
    
    setIsUploadingHeroBanner(true);
    const toastId = toast.loading('Đang tải lên ảnh bìa Intro...');
    
    try {
      const ext = file.name.split('.').pop();
      const filename = `hero-${Date.now()}.${ext}`;
      const uploadPath = `system/${filename}`;
      
      const result = await githubService.uploadFile(
        ghConfig, 
        file, 
        uploadPath, 
        `Update system hero banner ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, heroBanner: Math.round(progress) }))
      );

      setAboutConfig(prev => ({ ...prev, heroBanner: result.url }));
      toast.success('Đã tải lên ảnh bìa thành công!', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi tải ảnh bìa: ${e.message}`, { id: toastId });
    } finally {
      setIsUploadingHeroBanner(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.heroBanner;
        return next;
      });
      e.target.value = '';
    }
  };

  const saveAboutConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'about'), aboutConfig);
      toast.success('Đã cập nhật thông tin giới thiệu');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình');
    }
  };

  const handleSaveNotification = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await updateDoc(doc(db, 'settings', 'system'), {
        notificationConfig
      });
      toast.success('Đã cập nhật thông báo vòng lặp website');
    } catch (e) {
      toast.error('Lỗi khi lưu thiết lập thông báo');
    }
  };

  const handleSaveAdminPin = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      if (adminPin.length !== 4 || !/^\d+$/.test(adminPin)) {
        toast.error('Mã PIN bảo mật phải chứa đúng 4 chữ số (0-9)!');
        return;
      }
      await updateDoc(doc(db, 'settings', 'system'), {
        adminPin
      });
      toast.success('Cập nhật mã PIN bảo mật hệ thống thành công!');
    } catch (e: any) {
      toast.error('Lỗi khi lưu mã PIN: ' + e.message);
    }
  };

  const handleSaveFileManager = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await updateDoc(doc(db, 'settings', 'system'), {
        fileManagerConfig: {
          ...fileManagerConfig,
          username: githubGlobalConfig.username,
          token: githubGlobalConfig.token
        }
      });
      toast.success('Đã cập nhật cấu hình Quản lý File cá nhân');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình Quản lý File');
    }
  };

  const handleSaveGithubGlobal = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      // Save global & auto sync to fileManager & imageUpload configs in standard systems doc
      await setDoc(doc(db, 'settings', 'system'), {
        githubGlobalConfig,
        fileManagerConfig: {
          ...fileManagerConfig,
          username: githubGlobalConfig.username,
          token: githubGlobalConfig.token
        },
        imageUploadConfig: {
          ...imageUploadConfig,
          username: githubGlobalConfig.username,
          token: githubGlobalConfig.token
        }
      }, { merge: true });

      // Synchronize key to github_integration settings as well
      await setDoc(doc(db, 'settings', 'github_integration'), {
        username: githubGlobalConfig.username,
        owner: githubGlobalConfig.username,
        token: githubGlobalConfig.token,
      }, { merge: true });

      toast.success('Đã cập nhật cấu hình GitHub trung tâm & đồng bộ tất cả phân hệ');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình GitHub trung tâm');
    }
  };

  const handleSaveImageUploadConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        imageUploadConfig: {
          ...imageUploadConfig,
          username: githubGlobalConfig.username || imageUploadConfig.username || '',
          token: githubGlobalConfig.token || imageUploadConfig.token || ''
        }
      }, { merge: true });
      toast.success('Đã cập nhật cấu hình kho lưu trữ hình ảnh');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình kho hình ảnh');
    }
  };

  const handleSaveStampConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        stampConfig
      }, { merge: true });
      toast.success('Đã cập nhật cấu hình con dấu bản quyền thành công!');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình con dấu');
    }
  };

  const handleSaveMaintenanceStampConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        maintenanceStampConfig
      }, { merge: true });
      toast.success('Đã cập nhật cấu hình con dấu bảo trì thành công!');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình con dấu bảo trì');
    }
  };

  const handleSaveBankingConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        bankingConfig
      }, { merge: true });
      toast.success('Cập nhật tài khoản ngân hàng thụ thưởng VietQR thành công!');
    } catch (e: any) {
      toast.error('Lỗi khi lưu tài khoản ngân hàng: ' + e.message);
    }
  };

  const handleUploadStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || imageUploadConfig.username;
    const token = githubGlobalConfig.token || imageUploadConfig.token;
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Vui lòng hoàn thành Cấu hình GitHub trung tâm / Kho hình ảnh trước khi tải ảnh lên.');
      return;
    }

    setIsUploadingStamp(true);
    const originalId = toast.loading('Đang tải ảnh con dấu lên GitHub...');
    try {
      const ghConfig = {
        owner: username,
        repo: repo,
        token: token,
        branch: branch
      };

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uploadPath = `system/stamp_${Date.now()}_${cleanFileName}`;

      const githubData = await githubService.uploadFile(
        ghConfig,
        file,
        uploadPath,
        `Upload System Stamp: ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, stampImage: Math.round(progress) }))
      );

      setStampConfig(prev => ({
        ...prev,
        imageUrl: githubData.url
      }));

      toast.success('Đã tải con dấu lên thành công!', { id: originalId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi tải con dấu: ${err.message}`, { id: originalId });
    } finally {
      setIsUploadingStamp(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.stampImage;
        return next;
      });
    }
  };

  const handleUploadMaintenanceStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || imageUploadConfig.username;
    const token = githubGlobalConfig.token || imageUploadConfig.token;
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Vui lòng hoàn thành Cấu hình GitHub trung tâm / Kho hình ảnh trước khi tải ảnh lên.');
      return;
    }

    setIsUploadingMaintenanceStamp(true);
    const originalId = toast.loading('Đang tải ảnh con dấu bảo trì lên GitHub...');
    try {
      const ghConfig = { owner: username, repo, token, branch };
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uploadPath = `system/maintenance_stamp_${Date.now()}_${cleanFileName}`;

      const githubData = await githubService.uploadFile(
        ghConfig,
        file,
        uploadPath,
        `Upload System Maintenance Stamp: ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, maintenanceStamp: Math.round(progress) }))
      );

      setMaintenanceStampConfig(prev => ({ ...prev, imageUrl: githubData.url }));
      toast.success('Đã tải con dấu bảo trì lên thành công!', { id: originalId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi tải con dấu: ${err.message}`, { id: originalId });
    } finally {
      setIsUploadingMaintenanceStamp(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.maintenanceStamp;
        return next;
      });
    }
  };

  const handleSaveGithubIntegration = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      const mergedUsername = githubGlobalConfig.username || githubIntegrationConfig.username || '';
      const mergedToken = githubGlobalConfig.token || githubIntegrationConfig.token || '';
      await setDoc(doc(db, 'settings', 'github_integration'), {
        username: mergedUsername,
        owner: mergedUsername,
        token: mergedToken,
        repo: githubIntegrationConfig.repo,
        branch: githubIntegrationConfig.branch || 'main',
        path: githubIntegrationConfig.path || 'assets/uploads'
      }, { merge: true });
      toast.success('Đã cấu hình Quản lý Kho văn bản thành công');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình Kho văn bản');
    }
  };

  const handleSaveGoogleConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), { googleClientId }, { merge: true });
      toast.success('Cập nhật Google One Tap Client ID thành công!');
    } catch (e: any) {
      toast.error('Lỗi khi lưu Client ID');
    }
  };

  const handleSaveIpWhitelist = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), { 
        ipWhitelistEnabled, 
        ipWhitelistText: ipWhitelistText.trim()
      }, { merge: true });
      toast.success('Đã cấu hình thiết bị chỉ định IP/Wifi thành công!');
    } catch (e: any) {
      toast.error('Lỗi khi lưu cấu hình Whitelist IP');
    }
  };

  const handleSaveAppVersion = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'system'), { appVersion }, { merge: true });
      toast.success('Đã lưu phiên bản hệ thống thành công');
    } catch (e) {
      toast.error('Lỗi khi lưu phiên bản');
    }
  };

  const handleSaveAudioConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'audio'), {
        musicUrl: audioConfig.musicUrl,
        title: audioConfig.title,
        repo: audioConfig.repo,
        branch: audioConfig.branch || 'main',
        path: audioConfig.path || 'assets/audio'
      }, { merge: true });
      toast.success('Đã lưu cấu hình Nhạc nền hệ thống thành công');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình nhạc nền');
    }
  };

  const handleSaveSeoConfig = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'seo'), seoConfig, { merge: true });
      toast.success('Đã lưu cấu hình SEO thành công');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình SEO');
    }
  };

  const handleUploadSeoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || imageUploadConfig.username;
    const token = githubGlobalConfig.token || imageUploadConfig.token;
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Chưa hoàn tất cấu hình tài khoản hoặc Kho lưu trữ Hình ảnh ở tab Hệ thống');
      return;
    }

    setIsUploadingSeoImg(true);
    setUploadProgress(prev => ({ ...prev, seoImage: 0 }));
    const originalId = toast.loading(`Đang tải ảnh SEO "${file.name}" lên GitHub...`);

    try {
      const ghConfig = {
        owner: username,
        repo: repo,
        token: token,
        branch: branch
      };

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uploadPath = `seo/${Date.now()}_${cleanFileName}`;

      const githubData = await githubService.uploadFile(
        ghConfig,
        file,
        uploadPath,
        `Upload SEO Cover Image: ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, seoImage: Math.round(progress) }))
      );

      setSeoConfig(prev => ({
        ...prev,
        imageUrl: githubData.url
      }));

      toast.success('Đã tải lên ảnh SEO thành công!', { id: originalId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi tải ảnh SEO: ${err.message}`, { id: originalId });
    } finally {
      setIsUploadingSeoImg(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.seoImage;
        return next;
      });
    }
  };

  const handleUploadSeoIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = githubGlobalConfig.username || imageUploadConfig.username;
    const token = githubGlobalConfig.token || imageUploadConfig.token;
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Chưa hoàn tất cấu hình tài khoản hoặc Kho lưu trữ Hình ảnh ở tab Hệ thống');
      return;
    }

    setIsUploadingSeoIcon(true);
    setUploadProgress(prev => ({ ...prev, seoIcon: 0 }));
    const originalId = toast.loading(`Đang tải Icon/Favicon "${file.name}" lên GitHub...`);

    try {
      const ghConfig = {
        owner: username,
        repo: repo,
        token: token,
        branch: branch
      };

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uploadPath = `seo/${Date.now()}_icon_${cleanFileName}`;

      const githubData = await githubService.uploadFile(
        ghConfig,
        file,
        uploadPath,
        `Upload SEO Favicon: ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, seoIcon: Math.round(progress) }))
      );

      setSeoConfig(prev => ({
        ...prev,
        faviconUrl: githubData.url
      }));

      toast.success('Đã tải lên Icon/Favicon SEO thành công!', { id: originalId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi tải Icon/Favicon SEO: ${err.message}`, { id: originalId });
    } finally {
      setIsUploadingSeoIcon(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.seoIcon;
        return next;
      });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!githubGlobalConfig.username || !githubGlobalConfig.token) {
      toast.error('Vui lòng hoàn tất cấu hình GitHub trung tâm (Tài khoản và Token) trước!');
      return;
    }

    if (!audioConfig.repo) {
      toast.error('Vui lòng nhập tên Repository lưu trữ tệp nhạc nền!');
      return;
    }

    setAudioUploading(true);
    setUploadProgress(prev => ({ ...prev, audio: 0 }));
    const originalId = toast.loading(`Đang tải lên tệp âm thanh "${file.name}" lên GitHub...`);
    
    try {
      const ghConfig = {
        owner: githubGlobalConfig.username,
        repo: audioConfig.repo,
        token: githubGlobalConfig.token,
        branch: audioConfig.branch || 'main',
        path: audioConfig.path || 'assets/audio'
      };

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uploadPath = `${audioConfig.path || 'assets/audio'}/${Date.now()}_${cleanFileName}`;

      const githubData = await githubService.uploadFile(
        ghConfig, 
        file, 
        uploadPath, 
        `Upload MP3 audio file: ${file.name}`,
        (progress) => setUploadProgress(prev => ({ ...prev, audio: Math.round(progress) }))
      );

      setAudioConfig(prev => ({
        ...prev,
        musicUrl: githubData.url
      }));

      // Auto save to settings/audio in Firestore!
      await setDoc(doc(db, 'settings', 'audio'), {
        musicUrl: githubData.url,
        title: audioConfig.title || file.name.substring(0, file.name.lastIndexOf('.')),
        repo: audioConfig.repo,
        branch: audioConfig.branch || 'main',
        path: audioConfig.path || 'assets/audio'
      }, { merge: true });

      toast.success('Đã tải lên nhập file MP3 thành công và đồng bộ nhạc nền hệ thống!', { id: originalId });
    } catch (err: any) {
      console.error('Audio upload error:', err?.message || String(err));
      toast.error('Lỗi khi tải nhạc lên GitHub: ' + (err.message || 'Thất bại'), { id: originalId });
    } finally {
      setAudioUploading(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.audio;
        return next;
      });
      e.target.value = '';
    }
  };

  const handleSaveApp = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    if (!appForm.title || !appForm.appUrl) {
      toast.error('Vui lòng nhập Tên và Link ứng dụng');
      return;
    }
    try {
      if (editingAppId) {
        await updateDoc(doc(db, 'apps', editingAppId), {
          ...appForm
        });
        toast.success('Đã cập nhật ứng dụng thành công');
      } else {
        await addDoc(collection(db, 'apps'), {
          ...appForm,
          createdAt: serverTimestamp()
        });
        toast.success('Đã đăng ký ứng dụng mới thành công');
      }
      setAppForm({ title: '', description: '', logoUrl: '', appUrl: '', categoryId: '' });
      setEditingAppId(null);
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi lưu thông tin ứng dụng');
    }
  };

  const handleEditApp = (app: any) => {
    setEditingAppId(app.id);
    setAppForm({
      title: app.title || '',
      description: app.description || '',
      logoUrl: app.logoUrl || '',
      appUrl: app.appUrl || '',
      categoryId: app.categoryId || ''
    });
  };

  const handleAddCategory = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    if (!newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, 'app_categories'), {
        name: newCategoryName.trim(),
        createdAt: serverTimestamp()
      });
      setNewCategoryName('');
      toast.success('Đã thêm danh mục mới');
    } catch (e) {
      toast.error('Lỗi khi thêm danh mục');
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    openConfirm({
      title: 'Xóa danh mục ứng dụng',
      message: 'Xóa danh mục này? Các ứng dụng trong danh mục sẽ không còn thuộc danh mục nào.',
      confirmText: 'Xóa ngay',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'app_categories', id));
          toast.success('Đã xóa danh mục');
        } catch (e) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const handleEditCategory = async (id: string, currentName: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const newName = window.prompt('Nhập tên danh mục mới:', currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;
    try {
      await updateDoc(doc(db, 'app_categories', id), { name: newName.trim() });
      toast.success('Đã cập nhật tên danh mục');
    } catch (e) {
      toast.error('Lỗi khi cập nhật danh mục');
    }
  };

  const handleDeleteApp = (id: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    openConfirm({
      title: 'Xóa ứng dụng liên kết',
      message: 'Bạn có chắc chắn muốn xóa liên kết ứng dụng này không? Thao tác này không thể hoàn tác.',
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'apps', id));
          toast.success('Xóa ứng dụng thành công');
        } catch (e) {
          toast.error('Lỗi khi xóa ứng dụng');
        }
      }
    });
  };

  const handleDownloadTemplate = () => {
    try {
      const data = [
        {
          "Tên ứng dụng": "Gmail Portal",
          "Link logo": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
          "Link ứng dụng": "https://gmail.google.com",
          "Mô tả": "Cổng kết nối thư điện tử Google Workspace."
        },
        {
          "Tên ứng dụng": "Google Calendar",
          "Link logo": "",
          "Link ứng dụng": "https://calendar.google.com",
          "Mô tả": "Lịch hẹn và quản lý thời gian biểu quốc tế."
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSach");
      XLSX.writeFile(workbook, "mau_import_ung_dung.xlsx");
      toast.success("Tải tệp mẫu Excel thành công!");
    } catch (err: any) {
      console.error("Lỗi tạo file mẫu:", err?.message || String(err));
      toast.error("Lỗi khi tạo file mẫu Excel: " + err.message);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (data.length === 0) {
          toast.error("File Excel không có dữ liệu!");
          return;
        }

        let successCount = 0;
        let failCount = 0;

        const toastId = toast.loading(`Đang nhập ${data.length} ứng dụng...`);

        for (const row of data) {
          const title = row["Tên ứng dụng"] || row["title"] || row["Name"] || row["Tên"];
          const logoUrl = row["Link logo"] || row["logoUrl"] || row["Logo"] || row["Link ảnh logo"];
          const appUrl = row["Link ứng dụng"] || row["appUrl"] || row["Url"] || row["Đường dẫn"];
          const description = row["Mô tả"] || row["description"] || row["Mô tả ứng dụng"] || "";

          if (!title || !appUrl) {
            failCount++;
            continue;
          }

          try {
            await addDoc(collection(db, 'apps'), {
              title: String(title).trim(),
              logoUrl: logoUrl ? String(logoUrl).trim() : '',
              appUrl: String(appUrl).trim(),
              description: String(description).trim(),
              createdAt: serverTimestamp()
            });
            successCount++;
          } catch (error) {
            console.error("Lỗi import hàng:", row, error);
            failCount++;
          }
        }

        toast.success(`Nhập Excel hoàn tất! Đã đăng ký: ${successCount} ứng dụng. Thất bại: ${failCount}`, { id: toastId });
        e.target.value = '';
      } catch (error: any) {
        console.error(error);
        toast.error(`Lỗi đọc file Excel: ${error.message || error}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUploadLogoToGithub = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const username = imageUploadConfig.username || githubGlobalConfig.username;
    const token = imageUploadConfig.token || githubGlobalConfig.token;
    const repo = imageUploadConfig.repo;
    const branch = imageUploadConfig.branch || 'main';

    if (!username || !token || !repo) {
      toast.error('Chưa hoàn tất Cấu hình tài khoản hoặc Kho lưu trữ Hình ảnh ở tab Hệ thống');
      return;
    }

    setIsUploadingLogo(true);
    setUploadProgress(prev => ({ ...prev, logo: 0 }));
    const toastId = toast.loading('Đang xử lý tải tệp lên GitHub...');

    try {
      const ghConfig = {
        owner: username,
        repo: repo,
        token: token,
        branch: branch
      };
      
      const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = `logos/${filename}`;
      
      const result = await githubService.uploadFile(
        ghConfig, 
        file, 
        uploadPath, 
        `Upload logo ${file.name} from admin UI`,
        (progress) => setUploadProgress(prev => ({ ...prev, logo: Math.round(progress) }))
      );

      setAppForm(prev => ({ ...prev, logoUrl: result.url }));
      toast.success('Đã tải lên logo thành công!', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi: ${e.message}`, { id: toastId });
    } finally {
      setIsUploadingLogo(false);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next.logo;
        return next;
      });
      e.target.value = '';
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
    if (userData?.role === 'review') {
      setUsers([]);
      setLoading(false);
      return () => {};
    }
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error("Admin: fetchUsers listener error:", err?.message || String(err));
      setLoading(false);
    });
    return unsubscribe;
  };

  useEffect(() => {
    const unsub = fetchUsers();
    return () => { unsub.then(fn => fn && fn()) };
  }, []);

    const handleCreateReviewUser = async () => {
    if (!isSuperAdmin) {
      toast.error('Chỉ Super Admin mới có quyền tạo Review User');
      return;
    }
    setShowReviewUserModal(true);
    setReviewModalMode('auto');
    setReviewEmail('');
    setReviewPassword('');
    setReviewCreatedInfo(null);
  };

  const executeCreateReviewUser = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    let finalEmail = reviewEmail;
    let finalPassword = reviewPassword;

    if (reviewModalMode === 'auto') {
      finalEmail = `review_${Math.random().toString(36).substring(2, 8)}@bmass.review`;
      finalPassword = Math.random().toString(36).substring(2, 10).toLowerCase() + Math.random().toString().substring(2, 4);
    } else {
      if (!finalEmail || !finalPassword) {
        toast.error('Vui lòng nhập đầy đủ Gmail và Mật khẩu.');
        return;
      }
    }

    try {
      toast.loading('Đang khởi tạo tài khoản...', { id: 'create_review' });

      let secApp;
      try {
        secApp = getApp('SecondaryApp');
      } catch (e) {
        secApp = initializeApp(firebaseConfig, 'SecondaryApp');
      }
      const secAuth = getAuth(secApp);
      
      const cred = await createUserWithEmailAndPassword(secAuth, finalEmail, finalPassword);
      
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: finalEmail,
        displayName: 'Reviewer Mode',
        role: 'review',
        status: 'active',
        reviewPassword: finalPassword,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      });

      await secAuth.signOut();

      toast.success('Tạo tài khoản Review thành công!', { id: 'create_review', duration: 3000 });
      setReviewCreatedInfo({ email: finalEmail, password: finalPassword });

    } catch (e: any) {
      toast.error('Lỗi khi tạo tài khoản (Có thể bị trùng Gmail): ' + e.message, { id: 'create_review' });
      console.error(e);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
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
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
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

  const handleDownloadUserTemplate = () => {
    const templateData = [
      {
        'Gmail': 'example@gmail.com',
        'Mật khẩu': '123456',
        'Số điện thoại': '0901234567',
        'Vai trò': 'user',
        'Trạng thái': 'active',
        'Họ tên': 'Nguyễn Văn A',
        'Đăng nhập lần cuối': format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
        'IP': 'Auto',
        'Vị trí': 'Auto'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Mau_Import_Tai_Khoan.xlsx");
  };

  const handleImportUsersExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingUsers(true);
    const tid = toast.loading('Đang xử lý dữ liệu Excel...');

    try {
      // Get Importer IP and Location
      let importerIp = 'Unknown';
      let importerLocation = 'Unknown';
      try {
        const [ipRes, locRes] = await Promise.all([
          fetch('https://api64.ipify.org?format=json').then(r => r.json()),
          fetch('https://ipapi.co/json/').then(r => r.json())
        ]);
        importerIp = ipRes.ip || 'Unknown';
        importerLocation = `${locRes.city || ''}, ${locRes.region || ''}, ${locRes.country_name || ''}`.replace(/^, /, '');
      } catch (err) {
        console.warn('Could not fetch importer info:', err);
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const bstr = event.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          if (data.length === 0) {
            toast.error('File Excel không có dữ liệu.', { id: tid });
            setIsImportingUsers(false);
            return;
          }

          // Step 1: Create accounts in Firebase Auth via Proxy API
          toast.loading('Đang khởi tạo tài khoản trên hệ thống Auth...', { id: tid });
          const usersToAuth = data.map(row => ({
            email: row['Gmail'] || row['gmail'] || row['Email'] || '',
            password: String(row['Mật khẩu'] || row['password'] || '123456'),
            displayName: row['Họ tên'] || row['name'] || '',
            phoneNumber: row['Số điện thoại'] || row['phone'] ? String(row['Số điện thoại'] || row['phone']) : ''
          })).filter(u => u.email);

          const apiRes = await fetch('/api/admin/bulk-create-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: usersToAuth })
          });

          if (!apiRes.ok) throw new Error('Máy chủ Auth không phản hồi. Vui lòng thử lại sau.');
          const authData = await apiRes.json();
          const authResults = authData.results || [];

          // Step 2: Sync successfully created/updated users to Firestore
          toast.loading('Đang đồng bộ dữ liệu người dùng vào Database...', { id: tid });
          const { writeBatch } = await import('firebase/firestore');
          const batchSize = 100; // Small batch for clarity
          let importedCount = 0;
          let failedCount = 0;

          for (let i = 0; i < authResults.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = authResults.slice(i, i + batchSize);

            chunk.forEach((result: any) => {
              if (result.status === 'success') {
                const row = data.find(r => (r['Gmail'] || r['gmail'] || r['Email'] || '') === result.email);
                if (!row) return;

                const userId = result.uid;
                const userRef = doc(db, 'users', userId);
                
                const phone = row['Số điện thoại'] || row['phone'] || '';
                const role = row['Vai trò'] || row['role'] || 'user';
                const status = row['Trạng thái'] || row['status'] || 'active';
                const rowLastLogin = row['Đăng nhập lần cuối'] || row['lastLoginAt'];
                const rowIp = row['IP'] || row['ip'];
                const rowLocation = row['Vị trí'] || row['location'];

                batch.set(userRef, {
                  uid: userId,
                  email: result.email,
                  phoneNumber: phone || null,
                  displayName: row['Họ tên'] || row['name'] || result.email.split('@')[0],
                  role: role.toLowerCase(),
                  status: status.toLowerCase(),
                  lastLoginAt: rowLastLogin ? (isNaN(Date.parse(rowLastLogin)) ? Date.now() : Date.parse(rowLastLogin)) : Date.now(),
                  importIp: (rowIp && rowIp !== 'Auto') ? rowIp : importerIp,
                  importLocation: (rowLocation && rowLocation !== 'Auto') ? rowLocation : importerLocation,
                  createdAt: Date.now(),
                  isImported: true
                }, { merge: true });
                importedCount++;
              } else {
                failedCount++;
                console.error(`Auth creation failed: ${result.email}`, result.message);
              }
            });

            await batch.commit();
          }

          if (importedCount > 0) {
            toast.success(`Đã chuẩn bị thành công ${importedCount} tài khoản! ${failedCount > 0 ? `(${failedCount} thất bại)` : ''}`, { id: tid });
          } else {
            toast.error(`Không có tài khoản nào được tạo. Có ${failedCount} lỗi xảy ra.`, { id: tid });
          }
        } catch (err: any) {
          toast.error(`Lỗi xử lý file: ${err.message}`, { id: tid });
        } finally {
          setIsImportingUsers(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      toast.error(`Lỗi chuẩn bị: ${err.message}`, { id: tid });
      setIsImportingUsers(false);
    }
  };
  const handleQuickBanIp = async (ip: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    if (!isSuperAdmin) {
      toast.error('Chỉ Super Admin mới có quyền chặn IP');
      return;
    }
    openConfirm({
      title: 'Khóa IP người dùng',
      message: `Bạn có chắc chắn muốn CHẶN TOÀN BỘ truy cập từ IP ${ip} này không?`,
      confirmText: 'Chặn IP này',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await addDoc(collection(db, 'blockedIps'), {
            ip,
            reason: 'Khóa nhanh từ danh mục quản lý User',
            blockedAt: serverTimestamp(),
            blockedBy: userData?.displayName || 'Quản trị'
          });
          toast.success(`Đã chặn IP ${ip} thành công`);
        } catch (e) {
          toast.error('Lỗi khi chặn IP');
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
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

  const toggleSystemTool = async (id: string) => {
    try {
      const current = systemTools[id] || { public: true, internal: false };
      const currentlyPublic = current.public !== false;
      const nextPublic = !currentlyPublic;
      const nextConfig = { public: nextPublic, internal: !nextPublic };

      await updateDoc(doc(db, 'settings', 'tool_permissions'), {
        [id]: nextConfig
      });
      toast.success('Đã cập nhật quyền hạn');
    } catch (e) {
      try {
        const current = systemTools[id] || { public: true, internal: false };
        const currentlyPublic = current.public !== false;
        const nextPublic = !currentlyPublic;
        const nextConfig = { public: nextPublic, internal: !nextPublic };

        await setDoc(doc(db, 'settings', 'tool_permissions'), {
          [id]: nextConfig
        }, { merge: true });
        toast.success('Đã cập nhật quyền hạn');
      } catch (err) {
        toast.error('Lỗi khi cập nhật');
      }
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
    if (userData?.role === 'review') {
      setActivityData([]);
      setRoleDistribution([]);
      return;
    }
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

  // Categorized Tab Groups for UI/UX 5.0 Redesign
  const tabGroups = [
    {
      id: 'finance',
      title: 'Thương mại & Quỹ tài chính',
      shortTitle: 'Thương mại',
      icon: Landmark,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      items: [
        { id: 'dashboard', label: 'Bảng tổng quan', icon: Activity },
      ]
    },
    {
      id: 'security',
      title: 'Quản lý Người dùng & An ninh',
      shortTitle: 'An ninh',
      icon: Shield,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      items: [
        { id: 'users', label: 'Tài khoản người dùng', icon: Users },
        { id: 'banned', label: 'Bộ lọc IP Banned', icon: ShieldAlert },
        { id: 'security_sessions', label: 'Bảo mật Đăng nhập', icon: Lock },
        { id: 'partners', label: 'Đối tác liên kết', icon: Users },
      ]
    },
    {
      id: 'data',
      title: 'Dữ liệu số & Tiện ích ứng dụng',
      shortTitle: 'Tiện ích',
      icon: FolderOpen,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      items: [
        { id: 'apps', label: 'Ứng dụng Link', icon: AppWindow },
        { id: 'document_vault', label: 'Kho Văn Bản', icon: FolderOpen },
        { id: 'forms', label: 'Folders & Biểu mẫu', icon: Files },
        { id: 'utilities', label: 'Cộng cụ Tiện ích', icon: Wrench },
        { id: 'ai_tools', label: 'AI Tools', icon: Sparkles },
      ]
    },
    {
      id: 'marketing',
      title: 'Marketing & Quảng cáo',
      shortTitle: 'Marketing',
      icon: Gift,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      items: [
        { id: 'affiliate', label: 'Cấu hình Affiliate', icon: Gift },
      ]
    },
    {
      id: 'system',
      title: 'Hạ tầng hệ thống số',
      shortTitle: 'Hệ thống',
      icon: Server,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      items: [
        { id: 'system', label: 'Hệ thống cốt lõi', icon: Settings },
        { id: 'apikeys', label: 'Khóa API Keys', icon: Code },
        { id: 'contacts', label: 'Yêu cầu hỗ trợ', icon: Mail },
        { id: 'versions', label: 'Phiên bản máy chủ', icon: RefreshCcw },
        { id: 'about', label: 'Cấu hình Giới thiệu', icon: Info },
        { id: 'admin_system', label: 'Hệ thống System Data', icon: Server }
      ]
    }
  ];

  // Helper check active tab category map
  const activeGroupIdx = tabGroups.findIndex(g => g.items.some(item => item.id === activeTab));
  const [mobileCategoryIdx, setMobileCategoryIdx] = useState(activeGroupIdx !== -1 ? activeGroupIdx : 0);

  // Sync category selection on activeTab changes
  useEffect(() => {
    const idx = tabGroups.findIndex(g => g.items.some(item => item.id === activeTab));
    if (idx !== -1) {
      setMobileCategoryIdx(idx);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-transparent">
      {/* Sidebar Navigation - UI/UX 5.0 Glassmorphism */}
      <div className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/5 p-4 lg:p-6 flex flex-col gap-4 lg:gap-6 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md">
        
        {/* Sidebar Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">
                Quản lý hệ thống
              </h1>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 block">ADMIN CONSOLE v5.0</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="hidden lg:block w-full h-[1px] bg-slate-200/50 dark:bg-white/5" />

        {/* MOBILE VIEW CATEGORIES SLIDER */}
        <div className="lg:hidden">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Phân mục quản trị</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scroll-smooth no-scrollbar">
            {tabGroups.map((group, grpIdx) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setMobileCategoryIdx(grpIdx)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5",
                  mobileCategoryIdx === grpIdx
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                    : "bg-slate-50 dark:bg-zinc-900 border-slate-200/30 dark:border-white/5 text-slate-500"
                )}
              >
                <group.icon className="w-3.5 h-3.5" />
                <span>{group.shortTitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MOBILE NAVIGATION GRID (Triggered by active mobileCategoryIdx) */}
        <nav className="lg:hidden grid grid-cols-2 gap-2 p-2 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-200/50 dark:border-white/5">
          {tabGroups[mobileCategoryIdx].items.map(tab => {
            const isUnapprovedSecurityTab = hasUnapprovedSessions && tab.id === 'security_sessions';
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 rounded-xl text-[11px] font-bold transition-all relative overflow-hidden",
                  isActive
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/10 shadow-sm"
                    : "text-slate-500 hover:text-slate-950 dark:hover:text-white",
                  isUnapprovedSecurityTab && "animate-pulse bg-red-500/10 text-red-500 border border-red-500"
                )}
              >
                <tab.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {isUnapprovedSecurityTab && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-550 animate-ping absolute right-2 top-2" />
                )}
              </button>
            );
          })}
        </nav>

        {/* DESKTOP VIEW SIDEBAR (Categorized Stack) */}
        <div className="hidden lg:flex flex-col gap-5 overflow-y-auto no-scrollbar max-h-[80vh] pr-1">
          {tabGroups.map((group) => (
            <div key={group.id} className="space-y-1.5">
              {/* Group Banner Header */}
              <div className="flex items-center gap-2 px-2.5 py-1 w-full bg-slate-100/50 dark:bg-zinc-900/50 rounded-xl border border-slate-200/20 dark:border-white/5">
                <group.icon className="w-3.5 h-3.5 text-indigo-500/80" />
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                  {group.title}
                </span>
              </div>
              
              {/* Group Buttons Stack */}
              <div className="space-y-0.5 pl-1.5 border-l-2 border-slate-100 dark:border-white/5 ml-4">
                {group.items.map((tab) => {
                  const isUnapprovedSecurityTab = hasUnapprovedSessions && tab.id === 'security_sessions';
                  const isActive = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id} 
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)} 
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 relative overflow-hidden group/btn cursor-pointer",
                        isActive 
                          ? "bg-indigo-600/15 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400" 
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <tab.icon className={cn(
                          "w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110",
                          isActive ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 group-hover/btn:text-slate-700 dark:group-hover/btn:text-white"
                        )} />
                        <span className="whitespace-nowrap">{tab.label}</span>
                      </div>
                      
                      {isUnapprovedSecurityTab && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-3 md:p-6 lg:p-8 overflow-x-auto w-full transition-all duration-300">
        {userData?.role === 'review' && (
          <div className="mb-6 bg-slate-900 border border-amber-500/30 px-6 py-4 rounded-[1.5rem] flex items-center gap-3 text-amber-500 animate-pulse shadow-xl select-none">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
            <div className="text-left">
              <strong className="text-sm block text-amber-400 font-bold uppercase tracking-wider">CHẾ ĐỘ REVIEWER (CHỈ XEM THÔNG TIN)</strong>
              <span className="text-xs text-slate-400 mt-1 block leading-relaxed">Bạn đang trải nghiệm Admin Center dưới quyền của Tài khoản Reviewer. Tất cả các dữ liệu hiển thị là thật, nhưng mọi hành động cập nhật, lưu trữ, chỉnh sửa hoặc xóa dữ liệu đều bị vô hiệu hóa để bảo đảm toàn vẹn cơ sở dữ liệu.</span>
            </div>
          </div>
        )}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight capitalize">
              { activeTab === 'dashboard' ? 'Tổng quan hệ thống' : `Quản trị ${ {users: 'Người dùng', apps: 'Ứng dụng Link', banned: 'IP Banned', security_sessions: 'Bảo mật Đăng nhập', system: 'Hệ thống System', versions: 'Phiên bản máy chủ', partners: 'Đối tác liên kết', utilities: 'Tiện ích', document_vault: 'Kho Văn Bản', contacts: 'Yêu cầu hỗ trợ', forms: 'Form & Folders Biểu mẫu', about: 'About Setup', admin_system: 'Hệ thống Data', ai_tools: 'AI Tools', affiliate: 'Quản lý Quảng cáo'}[activeTab as any] }` }
            </h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Khối xử lý: {activeTab} • Trạng thái sẵn sàng
            </p>
          </div>
        </div>

        {activeTab === 'dashboard' && (
           <AdminOverview 
             siteStats={siteStats} 
             users={users} 
             allUtilities={allUtilities} 
             activityData={activityData} 
             roleDistribution={roleDistribution} 
             contacts={contacts} 
             adminAppsCount={adminApps.length}
           />
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
                    <label className="block text-xs font-bold mb-1 ml-1 flex items-center justify-between">
                      <span>Ảnh bìa Intro (Banner)</span>
                      <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        <Upload size={12} />
                        <span className="text-[10px]">Tải lên Banner</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadHeroBannerToGithub} disabled={isUploadingHeroBanner} />
                      </label>
                    </label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={aboutConfig.heroBanner}
                        onChange={(e) => setAboutConfig({...aboutConfig, heroBanner: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white pr-12"
                        placeholder="Link ảnh bìa hệ thống..."
                      />
                      {aboutConfig.heroBanner && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm pointer-events-none p-0.5 bg-white">
                          <img src={aboutConfig.heroBanner} alt="Banner Prev" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {isUploadingHeroBanner && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
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
                    <label className="block text-xs font-bold mb-1 ml-1 flex items-center justify-between">
                      <span>Ảnh (URL)</span>
                      <label className="cursor-pointer text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Upload size={12} />
                        <span className="text-[10px]">Tải lên GitHub</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatarToGithub} disabled={isUploadingAvatar} />
                      </label>
                    </label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={aboutConfig.adminPhoto}
                        onChange={(e) => setAboutConfig({...aboutConfig, adminPhoto: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white pr-12"
                        placeholder="Link ảnh đại diện..."
                      />
                      {aboutConfig.adminPhoto && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm pointer-events-none">
                          <img src={aboutConfig.adminPhoto} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1 flex items-center justify-between">
                      <span>Logo Hệ thống (Web Logo)</span>
                      <label className="cursor-pointer text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        <Upload size={12} />
                        <span className="text-[10px]">Tải lên Logo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadWebLogoToGithub} disabled={isUploadingWebLogo} />
                      </label>
                    </label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={aboutConfig.webLogo}
                        onChange={(e) => setAboutConfig({...aboutConfig, webLogo: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white pr-12"
                        placeholder="Link logo hệ thống..."
                      />
                      {aboutConfig.webLogo && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm pointer-events-none p-1 bg-white/50">
                          <img src={aboutConfig.webLogo} alt="Logo Prev" className="w-full h-full object-contain" />
                        </div>
                      )}
                      {isUploadingWebLogo && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
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
                      placeholder="vd: contact@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Số điện thoại</label>
                    <input 
                      type="tel" 
                      value={aboutConfig.phone}
                      onChange={(e) => setAboutConfig({...aboutConfig, phone: e.target.value})}
                      className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="vd: 09xx.xxx.xxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1">Zalo Link / Số Zalo</label>
                    <input 
                      type="text" 
                      value={aboutConfig.zalo}
                      onChange={(e) => setAboutConfig({...aboutConfig, zalo: e.target.value})}
                      className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="vd: https://zalo.me/..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold mb-1 ml-1">Địa chỉ (Trụ sở/Văn phòng) - Xã/Phường, Quận/Huyện, Tỉnh/TP</label>
                    <input 
                      type="text" 
                      value={aboutConfig.address}
                      onChange={(e) => setAboutConfig({...aboutConfig, address: e.target.value})}
                      className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="vd: 123 Đường ABC, Phường X, Quận Y, Tỉnh Z"
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
              <div className="flex items-center gap-4">
                {contacts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAllContacts}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      {selectedContactIds.length === contacts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    {selectedContactIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteContacts}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa ({selectedContactIds.length})
                      </button>
                    )}
                  </div>
                )}
                <div className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase rounded-full">
                  {contacts.length} hội thoại
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {contacts.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {contacts.map((req) => (
                    <div key={req.id} className={cn(
                      "group relative bg-slate-50 dark:bg-white/5 border rounded-3xl p-8 transition-all hover:bg-slate-100 dark:hover:bg-white-[0.07] overflow-hidden",
                      selectedContactIds.includes(req.id) ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-lg" : "border-slate-200 dark:border-white/10"
                    )}>
                      {/* Select Checkbox */}
                      <div className="absolute top-4 left-4 z-20">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(req.id)}
                          onChange={() => toggleSelectContact(req.id)}
                          className="w-5 h-5 rounded-lg accent-indigo-600 border border-slate-300 dark:border-white/10 cursor-pointer"
                        />
                      </div>
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

      {activeTab === 'document_vault' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminDocumentVault />
        </motion.div>
      )}

      {activeTab === 'admin_system' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminSystem />
        </motion.div>
      )}

      {activeTab === 'ai_tools' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminAiTools />
        </motion.div>
      )}

      {activeTab === 'partners' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminPartners ghConfig={{ owner: githubGlobalConfig.username || imageUploadConfig.username, repo: imageUploadConfig.repo, token: githubGlobalConfig.token || imageUploadConfig.token, branch: imageUploadConfig.branch || 'main' }} />
        </motion.div>
      )}

      {activeTab === 'affiliate' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminAffiliate />
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Users className="w-5 h-5 text-blue-500" /> Quản lý danh sách User
                </h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleDownloadUserTemplate}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Mẫu Excel
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImportingUsers}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {isImportingUsers ? 'Đang nhập...' : 'Nhập Excel Tài khoản'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportUsersExcel} 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                  />
                  <select 
                    value={userFilter} 
                    onChange={(e: any) => setUserFilter(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="all">Tất cả tài khoản</option>
                    <option value="review">Tài khoản Reviewer (Chỉ xem)</option>
                  </select>
                  <div className="text-sm text-slate-500 font-medium">Tổng số: {(userFilter === 'all' ? users : users.filter(u => u.role === 'review')).length} user</div>
                  <button 
                    onClick={handleCreateReviewUser}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo tài khoản Review
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar scroll-smooth">
                {loading ? (
                  <div className="p-12 pl-6 pr-6 text-center text-slate-500">Đang tải biểu dữ liệu...</div>
                ) : (
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap w-12">
                      <input
                        type="checkbox"
                        checked={selectedUserUids.length === (userFilter === 'all' ? users : users.filter(u => u.role === 'review')).length && (userFilter === 'all' ? users : users.filter(u => u.role === 'review')).length > 0}
                        onChange={toggleSelectAllUsers}
                        className="w-4 h-4 rounded border-slate-300 dark:border-white/10 accent-indigo-600"
                      />
                    </th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap">Tài khoản</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap">Số điện thoại</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap">Vai trò</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap">Trạng thái</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap">Đăng nhập lần cuối</th>
                    <th className="px-6 py-5 text-[10px] font-medium tracking-normal whitespace-nowrap text-right">
                      {selectedUserUids.length > 0 && (
                        <button
                          onClick={handleBulkDeleteUsers}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 float-right"
                        >
                          <Trash2 size={12} /> Xóa ({selectedUserUids.length})
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
                  {(userFilter === 'all' ? users : users.filter(u => u.role === 'review')).map((u) => (
                    <tr key={u.uid} className={cn(
                      "hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group",
                      selectedUserUids.includes(u.uid) && "bg-indigo-50/30 dark:bg-indigo-500/5 shadow-sm"
                    )}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUserUids.includes(u.uid)}
                          onChange={() => toggleSelectUser(u.uid)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-white/10 accent-indigo-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {u.phoneNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px]  font-bold rounded-full ${u.role?.includes('admin') ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${u.isBanned ? 'bg-red-500' : (u.status === 'active' ? 'bg-green-500' : 'bg-amber-500')}`}></div>
                          <span className={u.isBanned ? 'text-red-500 font-medium' : 'text-slate-600 dark:text-slate-300'}>
                            {u.isBanned ? 'Khóa' : (u.status === 'active' ? 'Trực tuyến' : 'Ngoại tuyến')}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 min-w-[160px] whitespace-nowrap">
                        <div className="text-xs">
                          {u.lastLoginAt ? format(toSafeDate(u.lastLoginAt), 'HH:mm - dd/MM/yyyy') : (u.createdAt ? format(toSafeDate(u.createdAt), 'HH:mm - dd/MM/yyyy') : 'N/A')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 min-w-[160px] whitespace-nowrap">
                        <div className="text-[11px] leading-relaxed flex items-center gap-2 group/ip">
                          <div className="flex items-center gap-1.5 font-bold mb-0.5 text-blue-500">
                            <Globe className="w-3 h-3" />
                            <span>{(u as any).lastIpAddress || 'Hidden'}</span>
                          </div>
                          {(u as any).lastIpAddress && (
                            <button
                              onClick={() => handleQuickBanIp((u as any).lastIpAddress)}
                              disabled={!isSuperAdmin}
                              className="text-slate-400 hover:text-rose-500 opacity-20 group-hover/ip:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-md"
                              title="Ban IP này ngay lập tức"
                            >
                              <ShieldAlert className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 min-w-[180px] whitespace-nowrap">
                        <div className="text-[11px] leading-relaxed">
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
                                <div className="text-[10px] text-slate-600 mt-1 line-clamp-2 italic leading-tight whitespace-normal">
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
                      <td className="px-6 py-4 text-right whitespace-nowrap">
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
                            <option value="review">Reviewer (Chỉ xem)</option>
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
           </div>
        </motion.div>
      )}

      {activeTab === 'security_sessions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <AdminSecuritySessions />
        </motion.div>
      )}

      {activeTab === 'system' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
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
              <Shield className="w-6 h-6 text-emerald-500" />
              Google One Tap Authentication
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-blue-600 dark:text-blue-400 mb-4">
                Google One Tap cho phép người dùng đăng nhập nhanh bằng tài khoản Google ngay khi truy cập trang web mà không cần nhấn vào nút đăng nhập. 
                Vui lòng lấy <strong>Client ID</strong> từ Google Cloud Console.
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Google Client ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientIdState(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    disabled={!isSuperAdmin}
                  />
                  <button
                    onClick={handleSaveGoogleConfig}
                    disabled={!isSuperAdmin}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md"
                  >
                    Lưu ID
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              Thiết bị được chỉ định qua IP máy hoặc qua IP Wifi
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Khi được kích hoạt, chỉ những thiết bị có địa chỉ IP hoặc dải IP Wifi trùng khớp mới có thể truy cập website. Quản trị viên luôn được miễn trừ khỏi bộ lọc bảo vệ này.
            </p>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 block">Kích hoạt hạn chế thiết bị</span>
                <span className="text-xs text-slate-400 font-medium">Bật/tắt tường lửa giới hạn thiết bị theo danh sách Whitelist IP Wifi / máy</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={ipWhitelistEnabled}
                  onChange={(e) => setIpWhitelistEnabled(e.target.checked)}
                  disabled={!isSuperAdmin}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-650 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Danh mục các địa chỉ IP Whitelist (mỗi IP một dòng hoặc cách nhau bởi dấu phẩy)</label>
              <textarea
                value={ipWhitelistText}
                onChange={(e) => setIpWhitelistText(e.target.value)}
                disabled={!isSuperAdmin}
                placeholder="Ví dụ:&#13;111.92.54.10&#13;192.168.1.1, 192.168.1.25"
                rows={4}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-200"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveIpWhitelist}
                disabled={!isSuperAdmin}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                Lưu cấu hình chỉ định thiết bị
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
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
                { key: 'apps', label: 'Trang Ứng dụng', icon: AppWindow, page: 'Hệ thống' },
                { key: 'calendar', label: 'Lịch Làm Việc', icon: Calendar, page: 'Hệ thống' },
                { key: 'guide', label: 'Hướng dẫn sử dụng', icon: BookOpen, page: 'Hệ thống' },
                { key: 'ai_tools', label: 'AI Tools', icon: Sparkles, page: 'Trang chủ' },
              ].map((tab) => (
                <div key={tab.key} className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <tab.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{tab.label}</h4>
                      <p className="text-[10px] text-slate-500 italic">{tab.page}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center gap-2 border-t border-slate-200 dark:border-white/5 pt-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-500">Bảo trì</span>
                    <button 
                      onClick={() => toggleTabMaintenance(tab.key)}
                      disabled={!isSuperAdmin}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${maintenanceTabs[tab.key] ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceTabs[tab.key] ? 'translate-x-5' : 'translate-x-1'}`}/>
                    </button>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">Nội bộ</span>
                    <button 
                      onClick={() => toggleSystemTool(tab.key)}
                      disabled={!isSuperAdmin}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${systemTools[tab.key]?.internal ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${systemTools[tab.key]?.internal ? 'translate-x-5' : 'translate-x-1'}`}/>
                    </button>
                  </div>
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
                { id: 'avatar-frame', title: 'Khung Ảnh Đại Diện', icon: ImageIcon },
                { id: 'file-manager', title: 'Quản Lý File Cá Nhân', icon: Laptop },
                { id: 'kho-van-ban', title: 'Kho Văn Bản', icon: FolderOpen },
                { id: 'ai-scanner', title: 'Quét Văn Bản AI', icon: Scan },
                { id: 'image-to-pdf', title: 'Ảnh sang PDF', icon: FileImage },
                { id: 'pdf-to-word', title: 'PDF sang Word', icon: FileText },
                { id: 'pdf-merger', title: 'Ghép PDF', icon: FilePlus },
                { id: 'pdf-splitter', title: 'Tách PDF', icon: Scissors }
              ].map((util) => (
                <div key={`native-util-${util.id}`} className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <util.icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{util.title}</h4>
                      <p className="text-[9px] text-slate-500 italic">Core Utility</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-white/5 pt-2 mt-1">
                    <div className="text-[9px] font-bold text-slate-500">Bảo trì</div>
                    <button 
                      onClick={() => toggleTabMaintenance(`utility_${util.id}`)}
                      disabled={!isSuperAdmin}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${maintenanceTabs[`utility_${util.id}`] ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceTabs[`utility_${util.id}`] ? 'translate-x-5' : 'translate-x-1'}`}/>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[9px] font-bold text-slate-500">Nội bộ</div>
                    <button 
                      onClick={() => toggleSystemTool(util.id)}
                      disabled={!isSuperAdmin}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${systemTools[util.id]?.internal ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${systemTools[util.id]?.internal ? 'translate-x-5' : 'translate-x-1'}`}/>
                    </button>
                  </div>
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
                   {allUtilities
                     .filter(u => ![
                       'avatar-frame', 'file-manager', 'kho-van-ban', 'ai-scanner', 
                       'image-to-pdf', 'pdf-to-word', 'pdf-merger', 'pdf-splitter'
                     ].includes(u.id))
                     .map((util) => (
                      <div key={util.id} className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <Box className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] truncate flex items-center gap-1">
                                {util.title}
                                {util.hidden && <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 text-[8px] rounded-md">Ẩn</span>}
                            </h4>
                            <p className="text-[9px] text-slate-500 italic">ID: {util.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-white/5 pt-2 mt-1">
                          <div className="text-[9px] font-bold text-slate-500">Bảo trì</div>
                          <button 
                            onClick={() => toggleTabMaintenance(`utility_${util.id}`)}
                            disabled={!isSuperAdmin}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${maintenanceTabs[`utility_${util.id}`] ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${maintenanceTabs[`utility_${util.id}`] ? 'translate-x-5' : 'translate-x-1'}`}/>
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[9px] font-bold text-slate-500">Nội bộ</div>
                          <button 
                            onClick={async () => {
                                try {
                                    await updateDoc(doc(db, 'utilities', util.id), { internalOnly: !util.internalOnly });
                                    toast.success('Đã cập nhật trạng thái Nội bộ');
                                } catch (e) {
                                    toast.error('Lỗi khi thiết lập');
                                }
                            }}
                            disabled={!isSuperAdmin}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${util.internalOnly ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${util.internalOnly ? 'translate-x-5' : 'translate-x-1'}`}/>
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[9px] font-bold text-slate-500">Đã Ẩn</div>
                          <button 
                            onClick={async () => {
                                try {
                                    await updateDoc(doc(db, 'utilities', util.id), { hidden: !util.hidden });
                                    toast.success('Đã cập nhật trạng thái Ẩn/Hiện');
                                } catch (e) {
                                    toast.error('Lỗi khi thiết lập');
                                }
                            }}
                            disabled={!isSuperAdmin}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${util.hidden ? 'bg-slate-800' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${util.hidden ? 'translate-x-5' : 'translate-x-1'}`}/>
                          </button>
                        </div>
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

            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-indigo-500" />
                  Lớp Bảo Mật PIN Admin (4 Số)
                </h3>
                <p className="text-xs text-slate-500 mb-6 italic">* Lưu ý: Thiết lập mã PIN gồm đúng 4 chữ số tăng cường bảo mật khi đăng nhập dành riêng cho bộ phận Quản trị viên.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-2 ml-1 text-slate-500 uppercase tracking-widest">Mã PIN bảo mật hiện tại (4 chữ số)</label>
                    <input 
                      type="text"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      disabled={!isSuperAdmin}
                      placeholder="Nhập 4 số bảo mật, ví dụ: 4321"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none font-mono tracking-widest font-bold focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleSaveAdminPin}
                      disabled={!isSuperAdmin}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                    >
                      <Save size={14} /> Cập Nhật PIN
                    </button>
                  </div>
                </div>
            </div>

            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-indigo-500" />
                  Cấu hình Thông báo Website (Marquee)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Bật/Tắt Thông báo chạy vòng lặp</span>
                    <button 
                        onClick={() => setNotificationConfig({...notificationConfig, active: !notificationConfig.active})}
                        disabled={!isSuperAdmin}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${notificationConfig.active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationConfig.active ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 ml-1 text-slate-500 uppercase tracking-widest">Nội dung thông báo (hỗ trợ nhập văn bản dài)</label>
                    <textarea 
                      rows={3}
                      value={notificationConfig.message}
                      onChange={(e) => setNotificationConfig({...notificationConfig, message: e.target.value})}
                      disabled={!isSuperAdmin}
                      placeholder="Bảo trì hệ thống lúc 10h tối nay. Vui lòng lưu các dữ liệu..."
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Loại Khẩn cấp (Chữ đỏ)</span>
                    <button 
                        onClick={() => setNotificationConfig({...notificationConfig, isEmergency: !notificationConfig.isEmergency})}
                        disabled={!isSuperAdmin}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${notificationConfig.isEmergency ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationConfig.isEmergency ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/10 pt-6 mt-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest ml-1">
                      Thông báo mở đầu trang (Popup Welcome)
                    </h4>
                    <p className="text-[11px] text-slate-400 ml-1 leading-relaxed">
                      Hiển thị hộp thoại (Modal popup) thông báo mỗi khi mở hoặc tải lại website. Người dùng nhấn Đóng để không hiển thị lại cho đến lần tải trang tiếp theo.
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Bật/Tắt Thông báo mở đầu trang</span>
                      <button 
                          type="button"
                          onClick={() => setNotificationConfig({...notificationConfig, popupActive: !notificationConfig.popupActive})}
                          disabled={!isSuperAdmin}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${notificationConfig.popupActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationConfig.popupActive ? 'translate-x-6' : 'translate-x-1'}`}/>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-500 uppercase tracking-widest">Tiêu đề thông báo popup</label>
                      <input 
                        type="text"
                        value={notificationConfig.popupTitle || ''}
                        onChange={(e) => setNotificationConfig({...notificationConfig, popupTitle: e.target.value})}
                        disabled={!isSuperAdmin}
                        placeholder="Chào mừng bạn đến với BMASS Ecosystem"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-500 uppercase tracking-widest">Nội dung thông báo popup (Hỗ trợ xuống dòng)</label>
                      <textarea 
                        rows={4}
                        value={notificationConfig.popupMessage || ''}
                        onChange={(e) => setNotificationConfig({...notificationConfig, popupMessage: e.target.value})}
                        disabled={!isSuperAdmin}
                        placeholder="Hệ thống đã nâng cấp toàn diện phân hệ bảo mật và tối ưu hóa hiệu năng truy vấn..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleSaveNotification}
                      disabled={!isSuperAdmin}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                    >
                      <Save size={14} /> Lưu Thông Báo
                    </button>
                  </div>
                </div>
            </div>
          </div>

            {/* Cấu hình Hệ thống GitHub & Lưu trữ chung (List/Accordion) */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm col-span-1 md:col-span-2 space-y-4">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <Settings className="w-6 h-6 text-indigo-500" />
                   Cấu hình Hệ thống GitHub &amp; Lưu trữ liên thông
                 </h3>
                 <p className="text-xs text-slate-500">
                   Quản lý các tài khoản GitHub dùng chung liên thông cho các thành phần tiện ích trong hệ sinh thái của bạn (Kho văn bản, Lưu trữ File cá nhân, Lưu trữ hình ảnh). Bấm chọn phân hệ để bật mở cấu hình.
                 </p>

                 <div className="space-y-3">
                   {/* 1. Global GitHub config */}
                   <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                     <button
                       type="button"
                       onClick={() => setExpandedSetting(expandedSetting === 'global' ? null : 'global')}
                       className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                     >
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-505 flex items-center justify-center">
                           <Github className="w-4 h-4 text-indigo-500" />
                         </div>
                         <div>
                           <h4 className="font-bold text-xs text-slate-800 dark:text-white">1. Cấu hình GitHub Trung tâm (PAT Dùng Chung)</h4>
                           <p className="text-[10px] text-slate-400 mt-0.5">
                             {githubGlobalConfig.username ? `Tài khoản liên thông: ${githubGlobalConfig.username}` : 'Chưa cấu hình liên thông'}
                           </p>
                         </div>
                       </div>
                       <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'global' ? 'rotate-180' : ''}`} />
                     </button>
                     
                     {expandedSetting === 'global' && (
                       <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                         <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                           <Info size={16} className="shrink-0 mt-0.5" />
                           <span><strong>Thông báo đồng bộ:</strong> Username và Token (PAT) này được sáp nhập làm 1 để liên thông cho toàn bộ 3 phân hệ bên dưới. Khi điền ở đây, bạn không cần khai báo lại token riêng ở từng phân hệ nữa.</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">GitHub Username</label>
                             <input 
                               type="text"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={githubGlobalConfig.username}
                               onChange={(e) => setGithubGlobalConfig({...githubGlobalConfig, username: e.target.value})}
                               placeholder="vd: octocat"
                             />
                           </div>
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Token (PAT) Dùng Chung</label>
                             <input 
                               type="password"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={githubGlobalConfig.token}
                               onChange={(e) => setGithubGlobalConfig({...githubGlobalConfig, token: e.target.value})}
                               placeholder="ghp_xxxxxxxxxxxx"
                             />
                           </div>
                         </div>
                         <div className="pt-2 flex justify-end">
                           <button 
                             onClick={handleSaveGithubGlobal}
                             disabled={!isSuperAdmin}
                             className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                           >
                             <Save size={14} /> Lưu Tài Khoản &amp; Đồng bộ tất cả
                           </button>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* 2. Kho Văn Bản (Document Vault) config */}
                   <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                     <button
                       type="button"
                       onClick={() => setExpandedSetting(expandedSetting === 'vault' ? null : 'vault')}
                       className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                     >
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                           <FolderOpen className="w-4 h-4" />
                         </div>
                         <div>
                           <h4 className="font-bold text-xs text-slate-800 dark:text-white">2. Cấu hình Kho Văn Bản (Document Vault)</h4>
                           <p className="text-[10px] text-slate-400 mt-0.5">
                             {githubIntegrationConfig.repo ? `Repository lưu trữ: ${githubIntegrationConfig.repo}` : 'Chưa cấu hình kho'}
                           </p>
                         </div>
                       </div>
                       <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'vault' ? 'rotate-180' : ''}`} />
                     </button>
                     
                     {expandedSetting === 'vault' && (
                       <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                         <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-emerald-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                           <Info size={16} className="shrink-0 mt-0.5" />
                           <span><strong>Kho dùng chung:</strong> Phân hệ này đã tự động liên thông lấy Username và token từ PAT dùng chung ở trên; ẩn ô nhập token riêng. Chỉ cần điền Repository để lưu tài liệu Kho Văn Bản.</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Repository lưu văn bản</label>
                             <input 
                               type="text"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={githubIntegrationConfig.repo}
                               onChange={(e) => setGithubIntegrationConfig({...githubIntegrationConfig, repo: e.target.value})}
                               placeholder="vd: documents-vault"
                             />
                           </div>
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Branch (Nhánh)</label>
                             <input 
                               type="text"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={githubIntegrationConfig.branch}
                               onChange={(e) => setGithubIntegrationConfig({...githubIntegrationConfig, branch: e.target.value})}
                               placeholder="main"
                             />
                           </div>
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Đường dẫn folder lưu trữ</label>
                             <input 
                               type="text"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={githubIntegrationConfig.path}
                               onChange={(e) => setGithubIntegrationConfig({...githubIntegrationConfig, path: e.target.value})}
                               placeholder="assets/uploads"
                             />
                           </div>
                         </div>
                         <div className="pt-2 flex justify-end">
                           <button 
                             onClick={handleSaveGithubIntegration}
                             disabled={!isSuperAdmin}
                             className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                           >
                             <Save size={14} /> Lưu cấu hình Kho văn bản
                           </button>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* 3. Personal Files config */}
                   <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                     <button
                       type="button"
                       onClick={() => setExpandedSetting(expandedSetting === 'personal' ? null : 'personal')}
                       className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                     >
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-550 flex items-center justify-center">
                           <Laptop className="w-4 h-4 text-blue-500" />
                         </div>
                         <div>
                           <h4 className="font-bold text-xs text-slate-800 dark:text-white">3. Cấu hình Quản Lý File Cá Nhân (File Manager)</h4>
                           <p className="text-[10px] text-slate-400 mt-0.5">
                             {fileManagerConfig.repo ? `Repository lưu trữ: ${fileManagerConfig.repo}` : 'Chưa cấu hình kho'}
                           </p>
                         </div>
                       </div>
                       <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'personal' ? 'rotate-180' : ''}`} />
                     </button>
                     
                     {expandedSetting === 'personal' && (
                       <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                         <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                           <Info size={16} className="shrink-0 mt-0.5" />
                           <span><strong>Kho dùng chung:</strong> Đã đồng bộ token &amp; tài khoản chính. Ẩn toàn bộ mục Token/Username riêng biệt để sử dụng 1 luồng dữ liệu liên thông.</span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Repository lưu tệp</label>
                             <input 
                               type="text"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={fileManagerConfig.repo}
                               onChange={(e) => setFileManagerConfig({...fileManagerConfig, repo: e.target.value})}
                               placeholder="vd: personal-vault"
                             />
                           </div>
                           <div>
                             <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Branch (Nhánh)</label>
                             <input 
                               type="text"
                               className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                               value={fileManagerConfig.branch}
                               onChange={(e) => setFileManagerConfig({...fileManagerConfig, branch: e.target.value})}
                               placeholder="main"
                             />
                           </div>
                         </div>
                         <div className="pt-2 flex justify-end">
                           <button 
                             onClick={handleSaveFileManager}
                             disabled={!isSuperAdmin}
                             className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                           >
                             <Save size={14} /> Lưu Cấu Hình File
                           </button>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* 4. Image uploads config */}
                   <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                     <button
                       type="button"
                        onClick={() => setExpandedSetting(expandedSetting === 'image' ? null : 'image')}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <FileImage className="w-4 h-4 text-rose-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-white">4. Cấu hình Lưu trữ Hình ảnh</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {imageUploadConfig.repo ? `Repository lưu ảnh: ${imageUploadConfig.repo}` : 'Chưa cấu hình kho'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'image' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSetting === 'image' && (
                        <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span><strong>Kho dùng chung:</strong> Đã đồng bộ token &amp; tài khoản chính. Ẩn toàn bộ mục Token/Username riêng biệt để sử dụng 1 luồng dữ liệu liên thông.</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Repository chứa ảnh logo</label>
                              <input 
                                type="text"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={imageUploadConfig.repo}
                                onChange={(e) => setImageUploadConfig({...imageUploadConfig, repo: e.target.value})}
                                placeholder="vd: app-assets-vault"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Đường dẫn folder lưu trữ</label>
                              <input 
                                type="text"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={imageUploadConfig.path || ''}
                                onChange={(e) => setImageUploadConfig({...imageUploadConfig, path: e.target.value})}
                                placeholder="assets/images"
                              />
                            </div>
                          </div>
                          <div className="pt-2 flex justify-end">
                            <button 
                              type="button"
                              onClick={handleSaveImageUploadConfig}
                              disabled={!isSuperAdmin}
                              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                            >
                              <Save size={14} /> Lưu Cấu Hình Ảnh
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5. Setup MP3 & Nhạc nền Hệ thống */}
                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() => setExpandedSetting(expandedSetting === 'audio' ? null : 'audio')}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Music className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-white">5. Setup MP3 &amp; Nhạc nền Hệ thống</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {audioConfig.musicUrl ? `Đang có: ${audioConfig.title}` : 'Chưa cấu hình nhạc nền'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'audio' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSetting === 'audio' && (
                        <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span><strong>Kho dùng chung:</strong> Phân hệ setup MP3/âm thanh sử dụng chung Token + Username từ Cấu hình GitHub trung tâm. Chỉ cần điền Tên repository, thư mục và đẩy nhạc lên GitHub trực tiếp.</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tiêu đề (Yêu cầu)</label>
                              <input 
                                type="text"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={audioConfig.title}
                                onChange={(e) => setAudioConfig({...audioConfig, title: e.target.value})}
                                placeholder="Tên bản nhạc nền (vd: Nhạc tết sôi động)"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Repository nhạc nền</label>
                              <input 
                                type="text"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={audioConfig.repo}
                                onChange={(e) => setAudioConfig({...audioConfig, repo: e.target.value})}
                                placeholder="vd: app-audios-vault"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Thư mục chứa (Path)</label>
                            <input 
                              type="text"
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                              value={audioConfig.path}
                              onChange={(e) => setAudioConfig({...audioConfig, path: e.target.value})}
                              placeholder="assets/audio"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tải file âm thanh (.mp3)</label>
                            
                            <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-purple-500 transition-colors relative">
                              <input 
                                type="file"
                                accept="audio/*"
                                onChange={handleAudioUpload}
                                disabled={audioUploading || !isSuperAdmin}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="flex flex-col items-center justify-center p-2">
                                <Upload size={32} className="text-zinc-400 mb-2 animate-bounce" />
                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                  {audioUploading ? `Đang tải lên... ${uploadProgress.audio || 0}%` : 'Kéo thả hoặc nhấn vào đây để tải file nhạc mới'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Hỗ trợ file định dạng .mp3, .wav... dưới 40MB</span>
                              </div>
                            </div>
                          </div>

                          {audioConfig.musicUrl && (
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Link nhạc nền hiện tại:</span>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="text"
                                  readOnly
                                  className="w-full bg-slate-200/50 dark:bg-black/20 text-xs px-3 py-2 rounded-lg outline-none cursor-text truncate text-slate-600 dark:text-zinc-400"
                                  value={audioConfig.musicUrl}
                                />
                                <audio src={audioConfig.musicUrl} controls className="h-8 max-w-[150px] md:max-w-xs scale-90" />
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex justify-end gap-3">
                            <button 
                              type="button"
                              onClick={handleSaveAudioConfig}
                              disabled={!isSuperAdmin}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                            >
                              <Save size={14} /> Lưu thiết lập Nhạc nền
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6. Cấu hình SEO Website */}
                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() => setExpandedSetting(expandedSetting === 'seo' ? null : 'seo')}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-550 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-white">6. Cấu hình SEO Website (Tiêu đề, Mô tả, Ảnh bài viết)</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {seoConfig.title ? `Tiêu đề SEO: ${seoConfig.title}` : 'Chưa cấu hình SEO'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'seo' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSetting === 'seo' && (
                        <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span><strong>Cấu hình SEO:</strong> Cho phép hiệu chỉnh Meta Title, Description và Ảnh bìa SEO (OpenGraph tag). Ảnh bìa được tải lên và lưu trữ trực tiếp trên GitHub qua phân hệ lưu trữ ảnh.</span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tiêu đề Website (Title)</label>
                              <input 
                                type="text"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={seoConfig.title}
                                onChange={(e) => setSeoConfig({...seoConfig, title: e.target.value})}
                                placeholder="Nhập tiêu đề website SEO"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Mô tả Website (Description)</label>
                              <textarea 
                                rows={3}
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                                value={seoConfig.description}
                                onChange={(e) => setSeoConfig({...seoConfig, description: e.target.value})}
                                placeholder="Nhập mô tả website chi tiết cho công cụ tìm kiếm..."
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tải Logo Icon / Web Favicon (sử dụng Github)</label>
                              
                              <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-purple-500 transition-colors relative">
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={handleUploadSeoIcon}
                                  disabled={isUploadingSeoIcon || !isSuperAdmin}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div className="flex flex-col items-center justify-center p-2">
                                  <Upload size={32} className="text-zinc-400 mb-2" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                    {isUploadingSeoIcon ? `Đang tải Icon/Favicon... ${uploadProgress.seoIcon || 0}%` : 'Nhấp hoặc kéo thả để tải Icon/Favicon mới'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Sử dụng làm biểu tượng Web trên thanh trình duyệt (Favicon)</span>
                                </div>
                              </div>
                            </div>

                            {seoConfig.faviconUrl && (
                              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Đường dẫn Icon/Favicon hiện tại:</span>
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                  <input 
                                    type="text"
                                    readOnly
                                    className="w-full bg-slate-200/50 dark:bg-black/20 text-xs px-3 py-2 rounded-lg outline-none cursor-text truncate text-slate-600 dark:text-zinc-400"
                                    value={seoConfig.faviconUrl}
                                  />
                                  {seoConfig.faviconUrl && (
                                    <img src={seoConfig.faviconUrl} alt="Favicon Preview" className="h-12 w-12 rounded-lg object-contain bg-white border border-slate-200 dark:border-white/10 shadow-sm p-1" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tải ảnh bìa SEO (sử dụng Github)</label>
                              
                              <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-purple-500 transition-colors relative">
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={handleUploadSeoImage}
                                  disabled={isUploadingSeoImg || !isSuperAdmin}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div className="flex flex-col items-center justify-center p-2">
                                  <Upload size={32} className="text-zinc-400 mb-2" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                    {isUploadingSeoImg ? `Đang tải ảnh SEO... ${uploadProgress.seoImage || 0}%` : 'Nhấp hoặc kéo thả để tải ảnh bìa SEO mới'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Hỗ trợ các tệp ảnh tiêu chuẩn qua GitHub</span>
                                </div>
                              </div>
                            </div>

                            {seoConfig.imageUrl && (
                              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Đường dẫn ảnh bìa SEO hiện tại:</span>
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                  <input 
                                    type="text"
                                    readOnly
                                    className="w-full bg-slate-200/50 dark:bg-black/20 text-xs px-3 py-2 rounded-lg outline-none cursor-text truncate text-slate-600 dark:text-zinc-400"
                                    value={seoConfig.imageUrl}
                                  />
                                  {seoConfig.imageUrl && (
                                    <img src={seoConfig.imageUrl} alt="SEO Preview" className="h-16 rounded-lg object-cover border border-slate-200 dark:border-white/10 shadow-sm" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="pt-2 flex justify-end gap-3">
                              <button 
                                type="button"
                                onClick={handleSaveSeoConfig}
                                disabled={!isSuperAdmin}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                              >
                                <Save size={14} /> Lưu thiết lập SEO
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 7. Cấu hình Con Dấu Bản Quyền (Dấu Mọc Đỏ) */}
                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() => setExpandedSetting(expandedSetting === 'stamp' ? null : 'stamp')}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-white">7. Cấu hình Con Dấu Toàn Trang (Dấu mọc đỏ)</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {stampConfig.imageUrl ? 'Đã tải lên ảnh con dấu bản quyền' : 'Chưa cấu hình con dấu'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'stamp' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSetting === 'stamp' && (
                        <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-4 bg-slate-50/50 dark:bg-black/10">
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span><strong>Con dấu mọc đỏ:</strong> Cho phép hiển thị một con dấu (mọc đỏ) đè mờ ở một góc trên toàn bộ các trang của hệ thống, điều khiển độ mờ và kích thước linh hoạt. </span>
                          </div>

                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Kích hoạt hiển thị con con dấu toàn trang</span>
                            <button 
                              type="button"
                              onClick={() => setStampConfig({...stampConfig, active: !stampConfig.active})}
                              disabled={!isSuperAdmin}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${stampConfig.active ? 'bg-red-650' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stampConfig.active ? 'translate-x-6' : 'translate-x-1'}`}/>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Góc hiển thị (Vị trí)</label>
                              <select
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={stampConfig.position}
                                onChange={(e) => setStampConfig({...stampConfig, position: e.target.value})}
                                disabled={!isSuperAdmin}
                              >
                                <option value="top-left">Góc trên - bên trái (Top-Left)</option>
                                <option value="top-right">Góc trên - bên phải (Top-Right)</option>
                                <option value="bottom-left">Góc dưới - bên trái (Bottom-Left)</option>
                                <option value="bottom-right">Góc dưới - bên phải (Bottom-Right)</option>
                                <option value="center">Giữa màn hình (Center / Watermark)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Kích thước con dấu (pixel)</label>
                              <input 
                                type="number"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={stampConfig.width}
                                onChange={(e) => setStampConfig({...stampConfig, width: parseInt(e.target.value) || 120})}
                                placeholder="120"
                                min={40}
                                max={2000}
                                disabled={!isSuperAdmin}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                               <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Lớp hiển thị (Lớp nền)</label>
                               <select
                                 className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                 value={stampConfig.zIndex || 9999}
                                 onChange={(e) => setStampConfig({...stampConfig, zIndex: parseInt(e.target.value)})}
                                 disabled={!isSuperAdmin}
                               >
                                 <option value={9999}>Phía trên cùng (Mặc định)</option>
                                 <option value={1}>Phía dưới cùng (Nền - Under)</option>
                                 <option value={50}>Phía sau các nút thao tác (Middle)</option>
                               </select>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold ml-1 text-slate-500 uppercase tracking-widest">Độ hiển thị mờ/rõ nét (%): {stampConfig.opacity || 50}%</label>
                            </div>
                            <input 
                              type="range"
                              min="5"
                              max="100"
                              value={stampConfig.opacity || 50}
                              onChange={(e) => setStampConfig({...stampConfig, opacity: parseInt(e.target.value)})}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-red-650"
                              disabled={!isSuperAdmin}
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>Mờ ảo nhất (5%)</span>
                              <span>Mặc định (50%)</span>
                              <span>Rõ nét nhất (100%)</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tải lên Con dấu mọc đỏ của bạn (qua GitHub)</label>
                            
                            <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center hover:border-red-500 transition-colors relative">
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={handleUploadStamp}
                                disabled={isUploadingStamp || !isSuperAdmin}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="flex flex-col items-center justify-center p-2">
                                <Upload size={32} className="text-zinc-400 mb-2" />
                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                  {isUploadingStamp ? `Đang tải con dấu lên... ${uploadProgress.stampImage || 0}%` : 'Kéo thả hoặc nhấn vào đây để tải ảnh con dấu'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Khuyên dùng hình ảnh nền trong suốt (PNG/WebP dạng tròn mọc đỏ)</span>
                              </div>
                            </div>
                          </div>

                          {stampConfig.imageUrl && (
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Đường dẫn con dấu hiện tại:</span>
                              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <input 
                                  type="text"
                                  readOnly
                                  className="w-full bg-slate-200/50 dark:bg-black/20 text-xs px-3 py-2 rounded-lg outline-none cursor-text truncate text-slate-600 dark:text-zinc-400"
                                  value={stampConfig.imageUrl}
                                />
                                {stampConfig.imageUrl && (
                                  <div className="relative p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg shrink-0">
                                    <img 
                                      src={stampConfig.imageUrl} 
                                      alt="Stamp Preview" 
                                      className="h-16 w-16 object-contain" 
                                      style={{ opacity: (stampConfig.opacity || 50) / 100 }}
                                      referrerPolicy="no-referrer" 
                                    />
                                    <div className="absolute inset-0 border border-red-500/20 pointer-events-none rounded-lg" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex justify-end gap-3">
                            <button 
                              type="button"
                              onClick={handleSaveStampConfig}
                              disabled={!isSuperAdmin}
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                            >
                              <Save size={14} /> Lưu thiết lập con dấu
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 8. Cấu hình Con Dấu Bảo Trì */}
                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5 mt-4">
                      <button
                        type="button"
                        onClick={() => setExpandedSetting(expandedSetting === 'maintenanceStamp' ? null : 'maintenanceStamp')}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">8.Thiết Lập Con Dấu Bảo Trì</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {maintenanceStampConfig.imageUrl ? 'Đã tải lên ảnh con dấu bảo trì' : 'Chưa cấu hình con dấu bảo trì'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSetting === 'maintenanceStamp' ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedSetting === 'maintenanceStamp' && (
                        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 space-y-5">
                          <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl mb-4">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                              <div className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                <span><strong>Con dấu bảo trì:</strong> Hình ảnh này sẽ tự động đóng đè lên (trải mờ một góc) các Tiện ích và Ứng dụng khi chúng được đặt ở chế độ bảo trì.</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Kích thước con dấu (pixel)</label>
                              <input 
                                type="number"
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                value={maintenanceStampConfig.width}
                                onChange={(e) => setMaintenanceStampConfig({...maintenanceStampConfig, width: parseInt(e.target.value) || 80})}
                                placeholder="80"
                                min={20}
                                max={300}
                                disabled={!isSuperAdmin}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold ml-1 text-slate-500 uppercase tracking-widest">Độ hiển thị mờ/rõ nét (%): {maintenanceStampConfig.opacity || 80}%</label>
                            </div>
                            <input 
                              type="range"
                              min="5"
                              max="100"
                              value={maintenanceStampConfig.opacity || 80}
                              onChange={(e) => setMaintenanceStampConfig({...maintenanceStampConfig, opacity: parseInt(e.target.value)})}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-orange-500"
                              disabled={!isSuperAdmin}
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>Mờ ảo nhất (5%)</span>
                              <span>Mặc định (80%)</span>
                              <span>Rõ nét nhất (100%)</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tải lên Con dấu bảo trì của bạn</label>
                            
                            <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center hover:border-orange-500 transition-colors relative">
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={handleUploadMaintenanceStamp}
                                disabled={isUploadingMaintenanceStamp || !isSuperAdmin}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="flex flex-col items-center justify-center p-2">
                                <Upload size={32} className="text-zinc-400 mb-2" />
                                <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                  {isUploadingMaintenanceStamp ? `Đang tải con dấu lên... ${uploadProgress.maintenanceStamp || 0}%` : 'Kéo thả hoặc nhấn vào đây để tải ảnh con dấu bảo trì'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Khuyên dùng hình nền trong suốt (PNG/WebP)</span>
                              </div>
                            </div>
                          </div>

                          {maintenanceStampConfig.imageUrl && (
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Đường dẫn con dấu hiện tại:</span>
                              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <input 
                                  type="text"
                                  readOnly
                                  className="w-full bg-slate-200/50 dark:bg-black/20 text-xs px-3 py-2 rounded-lg outline-none cursor-text truncate text-slate-600 dark:text-zinc-400"
                                  value={maintenanceStampConfig.imageUrl}
                                />
                                {maintenanceStampConfig.imageUrl && (
                                  <div className="relative p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg shrink-0">
                                    <img 
                                      src={maintenanceStampConfig.imageUrl} 
                                      alt="Maintenance Stamp Preview" 
                                      className="h-16 w-16 object-contain" 
                                      style={{ opacity: (maintenanceStampConfig.opacity || 80) / 100 }}
                                      referrerPolicy="no-referrer" 
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex justify-end gap-3">
                            <button 
                              type="button"
                              onClick={handleSaveMaintenanceStampConfig}
                              disabled={!isSuperAdmin}
                              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                            >
                              <Save size={14} /> Lưu thiết lập con dấu
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
            </div>

          {/* Cấu hình Thanh toán & Tài khoản Ngân hàng (VietQR / SePay) */}
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-6 h-6 text-indigo-500" />
                Cấu hình Tài khoản Ngân hàng (VietQR / SePay)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập thông tin tài khoản ngân hàng thụ hưởng của bạn để tự động tạo mã QR thanh toán hóa đơn.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
                <strong>HƯỚNG DẪN:</strong> Mã QR sẽ được tạo tự động thông qua nền tảng SePay. Bạn có thể sử dụng số tài khoản ngân hàng thông thường của mình (ví dụ: MB Bank, Vietcombank, Sacombank...), hoặc số tài khoản định danh do SePay cung cấp.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">
                    Mã ngân hàng (Bank Code)
                  </label>
                  <select
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    value={bankingConfig.bankCode}
                    onChange={(e) => setBankingConfig(prev => ({ ...prev, bankCode: e.target.value.toUpperCase() }))}
                    disabled={!isSuperAdmin}
                  >
                    <option value="SACOMBANK">Sacombank (STB)</option>
                    <option value="MB">MB Bank (MBB)</option>
                    <option value="VCB">Vietcombank</option>
                    <option value="ACB">ACB</option>
                    <option value="TCB">Techcombank</option>
                    <option value="CTG">VietinBank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="VPB">VPBank</option>
                    <option value="TPB">TPBank</option>
                    <option value="VIB">VIB</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Chọn hoặc điền mã ngân hàng chuẩn VietQR (ví dụ: SACOMBANK, MB, VCB...)</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">
                    Số tài khoản thụ hưởng & Tiền tố (Nếu có)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                    value={bankingConfig.bankAccount}
                    onChange={(e) => setBankingConfig(prev => ({ ...prev, bankAccount: e.target.value.trim() }))}
                    placeholder="ví dụ: STB_060269666879 hoặc 060269666879"
                    disabled={!isSuperAdmin}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Nhập chính xác số tài khoản ngân hàng của bạn.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">
                    Tên người thụ hưởng (Chủ tài khoản)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    value={(bankingConfig as any).ownerName || ''}
                    onChange={(e) => setBankingConfig(prev => ({ ...prev, ownerName: e.target.value }))}
                    placeholder="ví dụ: VU MINH DUC"
                    disabled={!isSuperAdmin}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">Tên viết hoa không dấu của chủ tài khoản thụ hưởng.</p>
                </div>
              </div>

              {/* Preview simulated QR */}
              {bankingConfig.bankAccount && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-6 bg-slate-50/50 dark:bg-white/5 p-4 rounded-3xl">
                  <div className="w-32 h-32 shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <img 
                      src={`https://qr.sepay.vn/img?acc=${bankingConfig.bankAccount}&bank=${bankingConfig.bankCode}&amount=10000&des=DEMO123`}
                      alt="VietQR Preview"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Xem trước mã QR mô phỏng</h4>
                    <p className="text-xs text-slate-500">Mã QR xem trước ở trên sử dụng số tiền mẫu 10,000đ và nội dung chuyển khoản nháp. Đảm bảo dùng điện thoại quét thử để kiểm tra xem đã nhận diện đúng tài khoản ngân hàng của bạn hay chưa.</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBankingConfig}
                  disabled={!isSuperAdmin}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
                >
                  <Save size={14} />
                  Lưu cấu hình ngân hàng
                </button>
              </div>
            </div>
          </div>
        </motion.div>

      )}

      {activeTab === 'versions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCcw className="w-6 h-6 text-indigo-500" />
                Quản lý Phiên bản Hệ thống
              </h3>
              <p className="text-xs text-slate-400 mt-1">Cập nhật phiên bản hệ thống (Ví dụ: v1.0, v2). Khi có thay đổi, người dùng sẽ được nhắc Làm mới ứng dụng.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tiền tố / Số Phiên Bản *</label>
                <input 
                  type="text" 
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  placeholder="Ví dụ: v2.0"
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={handleSaveAppVersion}
                disabled={!isSuperAdmin}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={16} /> Lưu Phiên Bản
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'apps' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
             {/* Left side: Đăng ký / Setup form AND Excel Import */}
             <div className="xl:col-span-4 space-y-6">
                {/* Standard Form */}
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-6">
                   <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <AppWindow className="w-6 h-6 text-indigo-500" />
                        {editingAppId ? 'Cập Nhật Ứng Dụng' : 'Đăng Ký Ứng Dụng'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Cấu hình liên kết logo, mô tả và liên kết mở ứng dụng trực tiếp.</p>
                   </div>

                   <div className="space-y-4">
                     <div>
                       <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Tên ứng dụng *</label>
                       <input 
                         type="text"
                         className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                         value={appForm.title}
                         onChange={(e) => setAppForm({...appForm, title: e.target.value})}
                         placeholder="vd: Gmail Portal"
                       />
                     </div>

                     <div>
                        <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Mô tả ứng dụng (không bắt buộc)</label>
                        <textarea 
                          rows={2}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                          value={appForm.description}
                          onChange={(e) => setAppForm({...appForm, description: e.target.value})}
                          placeholder="Mô tả tóm tắt tính năng chính của ứng dụng..."
                        />
                     </div>

                     <div>
                       <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Danh mục </label>
                       <select 
                         className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-4"
                         value={appForm.categoryId}
                         onChange={(e) => setAppForm({...appForm, categoryId: e.target.value})}
                       >
                         <option value="">Không có danh mục</option>
                         {appCategories.map(cat => (
                           <option key={cat.id} value={cat.id}>{cat.name}</option>
                         ))}
                       </select>

                       <label className="block text-[10px] font-bold mb-1.5 ml-1 text-slate-500 uppercase tracking-widest">Đường dẫn ứng dụng (App URL) *</label>
                       <input 
                         type="text"
                         className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                         value={appForm.appUrl}
                         onChange={(e) => setAppForm({...appForm, appUrl: e.target.value})}
                         placeholder="vd: https://gmail.google.com"
                       />
                     </div>

                     {/* Logo Source setup */}
                     <div className="space-y-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 leading-none">Logo Ứng dụng</label>
                       
                       {/* File upload from computer */}
                       <div className="p-4 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                          <input 
                            type="file" 
                            id="logo-upload-input-admin"
                            accept="image/*"
                            className="hidden"
                            onChange={handleUploadLogoToGithub}
                            disabled={isUploadingLogo}
                          />
                          <label 
                            htmlFor="logo-upload-input-admin"
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-white/5 dark:hover:bg-white/10 text-indigo-600 dark:text-zinc-300 border border-indigo-200/40 dark:border-white/5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                          >
                            {isUploadingLogo ? `Đang tải lên... ${uploadProgress.logo || 0}%` : 'Tải Logo lên Github'}
                          </label>
                          <p className="text-[9px] text-slate-400">Tự động đẩy tệp ảnh lên Git repository và sinh URL thô.</p>
                       </div>

                       <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider relative flex items-center gap-2 my-2 select-none">
                          <span className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
                          Hoặc dùng Link trực tiếp
                          <span className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
                       </div>

                       <input 
                         type="text"
                         className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                         value={appForm.logoUrl}
                         onChange={(e) => setAppForm({...appForm, logoUrl: e.target.value})}
                         placeholder="https://example.com/logo.png"
                       />

                       {appForm.logoUrl && (
                         <div className="flex items-center gap-3 p-3 bg-blue-50/20 dark:bg-white/5 rounded-xl border border-blue-500/10">
                           <img 
                             src={appForm.logoUrl} 
                             alt="Logo Preview" 
                             className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-200 dark:border-white/10"
                             referrerPolicy="no-referrer"
                           />
                           <div className="min-w-0 flex-1">
                             <p className="text-[10px] text-slate-400 font-bold truncate">Đã kết nối logo</p>
                             <p className="text-[9px] text-slate-500 truncate">{appForm.logoUrl}</p>
                           </div>
                           <button 
                             onClick={() => setAppForm({...appForm, logoUrl: ''})}
                             className="text-[10px] text-red-500 hover:underline"
                           >
                             Xóa
                           </button>
                         </div>
                       )}
                     </div>

                     {/* Actions buttons */}
                     <div className="pt-4 flex gap-2">
                        {editingAppId && (
                          <button
                            onClick={() => {
                              setEditingAppId(null);
                              setAppForm({ title: '', description: '', logoUrl: '', appUrl: '', categoryId: '' });
                            }}
                            className="flex-1 py-3 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest transition-colors duration-150"
                          >
                            Hủy
                          </button>
                        )}
                        <button
                          onClick={handleSaveApp}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-1"
                        >
                          <Save size={14} /> {editingAppId ? 'Lưu Thay Đổi' : 'Đăng Ký App'}
                        </button>
                     </div>
                   </div>
                </div>

                {/* Category Management Card */}
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-4">
                   <div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       <Layout className="w-5 h-5 text-amber-500" />
                       Quản Lý Danh Mục
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">Tạo nhóm để phân loại ứng dụng trên trang chủ.</p>
                   </div>

                   <div className="flex gap-2">
                     <input 
                       type="text"
                       placeholder="Tên danh mục mới"
                       className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs outline-none dark:text-white"
                       value={newCategoryName}
                       onChange={(e) => setNewCategoryName(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                     />
                     <button 
                       onClick={handleAddCategory}
                       className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                     >
                        Thêm
                     </button>
                   </div>

                   <div className="flex flex-wrap gap-2 pt-2">
                      {appCategories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg group">
                           <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">{cat.name}</span>
                           <div className="flex items-center gap-1 opacity-100 transition-opacity ml-1">
                             <button onClick={() => handleEditCategory(cat.id, cat.name)} className="text-slate-400 hover:text-blue-500">
                                <Edit2 size={12} />
                             </button>
                             <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500">
                                <Trash2 size={12} />
                             </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Bulk Excel Import Card */}
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm space-y-4">
                   <div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       <Files className="w-5 h-5 text-emerald-500" />
                       Nhập File Excel
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">Nạp danh sách ứng dụng nhanh với tệp mẫu Excel có định dạng chuẩn (.xlsx).</p>
                   </div>

                   <div className="space-y-3">
                     <button
                       onClick={handleDownloadTemplate}
                       className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                     >
                       <Download size={14} /> Tải Về Mẫu Excel (.xlsx)
                     </button>

                     <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-dashed border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                       <input
                         type="file"
                         id="app-import-file-input"
                         accept=".xlsx, .xls"
                         className="hidden"
                         onChange={handleImportExcel}
                       />
                       <label
                         htmlFor="app-import-file-input"
                         className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                       >
                         <Upload size={14} /> Chọn Tệp Excel Tải Lên
                       </label>
                       <p className="text-[9px] text-slate-400">Chọn tệp cấu hình hợp lệ đã nhập liệu.</p>
                     </div>
                   </div>
                </div>
             </div>

             {/* Right side: App Inventory list */}
             <div className="xl:col-span-8 space-y-6">
                <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-sm">
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                     Danh Sách Link Ứng Dụng ({adminApps.length})
                   </h3>

                   {adminApps.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-24 text-center">
                       <AppWindow size={40} className="text-slate-300 dark:text-zinc-700 mb-4" />
                       <p className="text-sm text-slate-500 font-bold">Chưa đăng ký ứng dụng nào</p>
                       <p className="text-xs text-slate-400 max-w-sm mt-1">Dùng bảng bên cạnh để đăng ký ứng dụng liên kết và phân phối lên Thực đơn phía người dùng.</p>
                     </div>
                   ) : (
                       <div className="overflow-x-auto no-scrollbar scroll-smooth">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-white/10 pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                              <th className="py-3 px-2 whitespace-nowrap w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedAppIds.length === adminApps.length && adminApps.length > 0}
                                  onChange={toggleSelectAllApps}
                                  className="w-4 h-4 rounded border-slate-300 dark:border-white/10 accent-indigo-600"
                                />
                              </th>
                              <th className="py-3 px-2 whitespace-nowrap">Ứng dụng / Logo</th>
                              <th className="py-3 px-2 whitespace-nowrap">Đường dẫn mở</th>
                              <th className="py-3 px-2 text-right whitespace-nowrap">
                                {selectedAppIds.length > 0 ? (
                                  <button
                                    onClick={handleBulkDeleteApps}
                                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] uppercase font-bold hover:bg-red-600 transition-all flex items-center gap-1.5 float-right"
                                  >
                                    <Trash2 size={12} /> Xóa ({selectedAppIds.length})
                                  </button>
                                ) : 'Thao tác'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {adminApps.map((app) => (
                              <tr key={app.id} className={cn(
                                "text-sm text-slate-700 dark:text-zinc-300 group hover:bg-slate-50/50 dark:hover:bg-white/[0.01]",
                                selectedAppIds.includes(app.id) && "bg-indigo-50/30 dark:bg-indigo-500/5 shadow-sm"
                              )}>
                                <td className="py-4 px-2 whitespace-nowrap text-center">
                                   <input
                                     type="checkbox"
                                     checked={selectedAppIds.includes(app.id)}
                                     onChange={() => toggleSelectApp(app.id)}
                                     className="w-4 h-4 rounded border-slate-300 dark:border-white/10 accent-indigo-600 cursor-pointer"
                                   />
                                </td>
                                <td className="py-4 px-2 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                      {app.logoUrl ? (
                                        <img src={app.logoUrl} alt={app.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="font-bold text-indigo-500 uppercase">{app.title.charAt(0)}</span>
                                      )}
                                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${maintenanceTabs['app_' + app.id] ? 'bg-rose-500' : 'hidden'}`} />
                                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${app.internalOnly ? 'bg-emerald-500' : 'hidden'}`} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">{app.title}</h4>
                                        {app.categoryId && (
                                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-[8px] font-bold uppercase rounded-md">
                                             {appCategories.find(c => c.id === app.categoryId)?.name || 'N/A'}
                                          </span>
                                        )}
                                        {app.internalOnly && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[8px] font-bold uppercase rounded-md">Nội bộ</span>}
                                        {maintenanceTabs[`app_${app.id}`] && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-[8px] font-bold uppercase rounded-md">Bảo trì</span>}
                                      </div>
                                      {app.description && <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{app.description}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-2 font-mono text-xs select-all text-slate-500 whitespace-nowrap">
                                  <a href={app.appUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 text-indigo-500">
                                    {app.appUrl} <ExternalLink className="w-3.5 h-3.5 shrink-0 inline" />
                                  </a>
                                </td>
                                <td className="py-4 px-2 text-right whitespace-nowrap">
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => toggleTabMaintenance(`app_${app.id}`)}
                                      title={maintenanceTabs[`app_${app.id}`] ? "Đang bảo trì" : "Bật bảo trì"}
                                      className={`p-2 rounded-xl border transition-all ${maintenanceTabs[`app_${app.id}`] ? 'border-rose-500 text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 dark:border-white/5 text-slate-400 hover:text-rose-500 hover:border-rose-500'}`}
                                    >
                                      <Wrench className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await updateDoc(doc(db, 'apps', app.id), { internalOnly: !app.internalOnly });
                                          toast.success('Đã cập nhật trạng thái Nội bộ');
                                        } catch (e) {
                                          toast.error('Lỗi khi thiết lập');
                                        }
                                      }}
                                      title={app.internalOnly ? "Nội bộ" : "Công khai"}
                                      className={`p-2 rounded-xl border transition-all ${app.internalOnly ? 'border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/5 text-slate-400 hover:text-emerald-500 hover:border-emerald-500'}`}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1" />
                                    <button
                                      onClick={() => handleEditApp(app)}
                                      className="p-2 rounded-xl border border-slate-200 dark:border-white/5 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                      title="Sửa ứng dụng"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteApp(app.id)}
                                      className="p-2 rounded-xl border border-slate-200 dark:border-white/5 hover:border-rose-500 hover:text-rose-600 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                      title="Xóa ứng dụng"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </motion.div>
      )}
      </div>
    

      <AnimatePresence>
        {showReviewUserModal && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!reviewCreatedInfo) setShowReviewUserModal(false); }}
              className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-[999]"
            />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl pointer-events-auto text-left"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  {!reviewCreatedInfo && (
                    <button
                      onClick={() => setShowReviewUserModal(false)}
                      className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {!reviewCreatedInfo ? (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                      Tạo tài khoản Review
                    </h3>
                    <p className="text-slate-650 dark:text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
                      Chọn phương thức tạo tài khoản Review.
                    </p>

                    <div className="flex gap-4 mb-6">
                       <button onClick={() => setReviewModalMode('auto')} className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition ${reviewModalMode === 'auto' ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Tự động</button>
                       <button onClick={() => setReviewModalMode('manual')} className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition ${reviewModalMode === 'manual' ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Thủ công</button>
                    </div>

                    {reviewModalMode === 'manual' && (
                      <div className="space-y-4 mb-6">
                        <div>
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Gmail</label>
                           <input type="email" value={reviewEmail} onChange={e => setReviewEmail(e.target.value)} placeholder="review@example.com" className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mật khẩu</label>
                           <input type="text" value={reviewPassword} onChange={e => setReviewPassword(e.target.value)} placeholder="Nhập mật khẩu..." className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 text-sm" />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowReviewUserModal(false)} className="px-4 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Hủy</button>
                      <button onClick={executeCreateReviewUser} className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm drop-shadow">Xác nhận tạo</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                      Đã tạo tài khoản thành công
                    </h3>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 mb-6 relative group">
                       <pre className="text-xs text-emerald-700 dark:text-emerald-400 font-mono whitespace-pre-wrap">
                          [TÀI KHOẢN REVIEW]{'\n'}Email: {reviewCreatedInfo.email}{'\n'}Mật khẩu: {reviewCreatedInfo.password}
                       </pre>
                       <button onClick={() => { navigator.clipboard.writeText(`[TÀI KHOẢN REVIEW]\nEmail: ${reviewCreatedInfo.email}\nMật khẩu: ${reviewCreatedInfo.password}`); toast.success('Đã copy!'); }} className="absolute top-2 right-2 p-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Copy className="w-4 h-4" />
                       </button>
                    </div>
                    <button onClick={() => setShowReviewUserModal(false)} className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm drop-shadow">Đóng</button>
                  </>
                )}
              </motion.div>
            </div>
          </React.Fragment>
        )}
      </AnimatePresence></div>
  );
}

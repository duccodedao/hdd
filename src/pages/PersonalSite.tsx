import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Lock, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Facebook, 
  Instagram, 
  Send, 
  Youtube, 
  Video, 
  Layout, 
  LogOut,
  ShieldAlert,
  Loader2,
  Key
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface SiteConfig {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  theme: string;
  socialLinks: Array<{ platform: string, url: string, label: string }>;
  tabs: Array<{ id: string, title: string, content: string }>;
  embeddedVideos: string[];
}

export default function PersonalSite() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [siteRequest, setSiteRequest] = useState<any>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(!!localStorage.getItem(`api_key_${slug}`));
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  useEffect(() => {
    if (!slug) return;

    // 1. Fetch the request to verify existence and get credentials
    const fetchSite = async () => {
      try {
        const q = query(collection(db, 'subdomainRequests'), where('subdomain', '==', slug), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          toast.error('Trang web không tồn tại hoặc chưa được phê duyệt');
          navigate('/');
          return;
        }

        const siteData = snap.docs[0].data();
        setSiteRequest({ id: snap.docs[0].id, ...siteData });

        // 2. Fetch or initialize SiteConfig
        const configRef = doc(db, 'siteConfigs', slug);
        const unsubscribe = onSnapshot(configRef, (configSnap) => {
          if (configSnap.exists()) {
            setConfig({ id: configSnap.id, ...configSnap.data() } as SiteConfig);
          } else {
            // Initial empty config
            setConfig({
              id: slug,
              userId: siteData.userId,
              slug: slug,
              displayName: siteData.displayName || 'Demo Site',
              bio: 'Chào mừng bạn đến với trang cá nhân của tôi!',
              avatarUrl: '',
              theme: 'default',
              socialLinks: [],
              tabs: [{ id: 'main', title: 'Thông tin', content: 'Nội dung mặc định...' }],
              embeddedVideos: []
            });
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'subdomainRequests');
      }
    };

    fetchSite();
  }, [slug, navigate]);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput === siteRequest?.apiKey || siteRequest?.apiKey === '') {
      localStorage.setItem(`api_key_${slug}`, apiKeyInput);
      setHasApiKey(true);
      toast.success('Xác thực API thành công');
    } else {
      toast.error('API Key không chính xác');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === siteRequest?.adminUsername && loginForm.password === siteRequest?.adminPassword) {
      setIsSubAdmin(true);
      setShowLogin(false);
      toast.success('Đăng nhập Admin thành công');
    } else {
      toast.error('Sai tài khoản hoặc mật khẩu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // First time API Key check
  if (!hasApiKey && siteRequest?.apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 dark:border-white/5"
        >
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-center mb-2 text-slate-900 dark:text-white">Xác thực API Key</h2>
          <p className="text-slate-500 text-center text-sm mb-8 font-bold">Vui lòng nhập mã API được cấp bởi Admin tổng để truy cập lần đầu.</p>
          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <input 
              type="password" 
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Nhập API Key..."
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold dark:text-white"
              required
            />
            <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 hover:scale-[1.02] transition-all">
              Tiếp tục
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-all`}>
      {/* Navbar for Sub-Admin */}
      {isSubAdmin && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-600 animate-spin-slow" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Admin Mode</span>
          </div>
          <button 
            onClick={() => setIsSubAdmin(false)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Thoát Admin
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`max-w-4xl mx-auto px-4 ${isSubAdmin ? 'pt-24' : 'pt-12'} pb-32`}>
        {/* Profile Header */}
        <div className="text-center mb-16 relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[3rem] bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto mb-6 flex items-center justify-center shadow-2xl relative overflow-hidden group">
            {config?.avatarUrl ? (
              <img src={config.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Globe className="w-16 h-16 text-white/50" />
            )}
            {isSubAdmin && (
                <button 
                  onClick={() => {
                    const url = prompt('Nhập URL ảnh đại diện:', config?.avatarUrl);
                    if (url !== null) saveConfig({ ...config!, avatarUrl: url });
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase"
                >
                  Đổi ảnh
                </button>
            )}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 group relative inline-flex items-center gap-2">
            {config?.displayName}
            {isSubAdmin && (
               <button 
                 onClick={() => {
                   const name = prompt('Nhập tên hiển thị:', config?.displayName);
                   if (name) saveConfig({ ...config!, displayName: name });
                 }}
                 className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-100 dark:bg-white/10 rounded-full"
               >
                 <Settings className="w-4 h-4 text-slate-500" />
               </button>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-lg mx-auto leading-relaxed group relative inline-flex items-center gap-2">
            {config?.bio}
            {isSubAdmin && (
               <button 
                 onClick={() => {
                   const bio = prompt('Nhập tiểu sử:', config?.bio);
                   if (bio !== null) saveConfig({ ...config!, bio: bio });
                 }}
                 className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-100 dark:bg-white/10 rounded-full"
               >
                 <Settings className="w-4 h-4 text-slate-500" />
               </button>
            )}
          </p>
        </div>

        {/* Social Links */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {config?.socialLinks.map((social, idx) => (
            <motion.a
              key={idx}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -5 }}
              className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl shadow-lg shadow-slate-200/20 dark:shadow-none hover:border-blue-600 transition-colors"
            >
              {getSocialIcon(social.platform)}
              <span className="font-black text-xs uppercase tracking-widest">{social.label}</span>
            </motion.a>
          ))}
          {isSubAdmin && (
            <button 
              onClick={addSocialLink}
              className="px-6 py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
            >
              <Plus className="w-4 h-4" /> Thêm Mạng Xã Hội
            </button>
          )}
        </div>

        {/* Dynamic Tabs */}
        <div className="space-y-12 mb-20">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
            {config?.tabs.map(tab => (
              <button 
                key={tab.id}
                className="px-6 py-3 bg-white dark:bg-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 whitespace-nowrap border border-slate-100 dark:border-white/5 hover:border-blue-600 transition-all"
              >
                {tab.title}
              </button>
            ))}
            {isSubAdmin && (
              <button 
                onClick={addTab}
                className="p-3 bg-blue-600/10 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {config?.tabs.map(tab => (
              <div key={tab.id} className="glass-card p-10 rounded-[3rem] relative group border-slate-100 dark:border-white/5">
                <h3 className="text-2xl font-black mb-6 tracking-tight flex items-center justify-between">
                  {tab.title}
                  {isSubAdmin && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => editTab(tab)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg"><Settings className="w-4 h-4 text-slate-500" /></button>
                      <button onClick={() => deleteTab(tab.id)} className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  )}
                </h3>
                <div className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                  {tab.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Embeds */}
        {config?.embeddedVideos && config.embeddedVideos.length > 0 && (
          <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
              <Video className="w-4 h-4" /> Video nổi bật
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {config.embeddedVideos.map((url, idx) => (
                <div key={idx} className="aspect-video bg-black rounded-3xl overflow-hidden relative group">
                  <iframe 
                    src={getEmbedUrl(url)} 
                    className="w-full h-full" 
                    allowFullScreen
                  />
                  {isSubAdmin && (
                    <button 
                      onClick={() => deleteVideo(idx)}
                      className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {isSubAdmin && (
                <button 
                  onClick={addVideo}
                  className="aspect-video border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all font-black uppercase text-[10px] tracking-widest gap-4"
                >
                  <Plus className="w-10 h-10" />
                  Thêm Youtube/Tiktok Video
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-32 text-center border-t border-slate-100 dark:border-white/10 pt-16">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-white/10 shadow-sm mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live on {window.location.host} Ecosystem</span>
           </div>
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">&copy; 2026 Admin Pro Ecosystem. All rights reserved.</p>
        </div>
      </div>

      {/* Login Trigger Bottom Right */}
      {!isSubAdmin && (
        <button 
          onClick={() => setShowLogin(true)}
          className="fixed bottom-8 right-8 p-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all z-40"
        >
          <Lock className="w-6 h-6" />
        </button>
      )}

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-white/5 relative"
            >
              <h2 className="text-3xl font-black mb-2 text-slate-900 dark:text-white uppercase tracking-tighter">Admin Login</h2>
              <p className="text-slate-500 text-sm mb-8 font-bold italic">Truy cập quyền quản trị trang cá nhân này.</p>
              <form onSubmit={handleLogin} className="space-y-6">
                <input 
                  type="text" 
                  placeholder="Username cấp bởi admin..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold dark:text-white"
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                />
                <input 
                  type="password" 
                  placeholder="Password..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold dark:text-white"
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                />
                <button className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                  Đăng nhập ngay
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // Helper functions
  async function saveConfig(newConfig: SiteConfig) {
    try {
      await setDoc(doc(db, 'siteConfigs', slug!), {
        ...newConfig,
        updatedAt: serverTimestamp()
      });
      setConfig(newConfig);
      toast.success('Đã lưu thay đổi');
    } catch (error) {
      toast.error('Lỗi khi lưu cấu hình');
    }
  }

  function addSocialLink() {
    const platform = prompt('Chọn nền tảng (facebook, instagram, telegram, youtube, other):', 'facebook');
    const label = prompt('Nhãn hiển thị (VD: My Facebook):', 'Facebook');
    const url = prompt('URL mạng xã hội:', 'https://...');
    
    if (platform && label && url) {
      const newLinks = [...(config?.socialLinks || []), { platform, label, url }];
      saveConfig({ ...config!, socialLinks: newLinks });
    }
  }

  function addTab() {
    const title = prompt('Tiêu đề Tab mới:', 'New Tab');
    const content = prompt('Nội dung:', '...');
    if (title && content) {
      const newTabs = [...(config?.tabs || []), { id: Date.now().toString(), title, content }];
      saveConfig({ ...config!, tabs: newTabs });
    }
  }

  function editTab(tab: { id: string, title: string, content: string }) {
    const title = prompt('Tiêu đề Tab:', tab.title);
    const content = prompt('Nội dung:', tab.content);
    if (title && content) {
      const newTabs = config?.tabs.map(t => t.id === tab.id ? { ...t, title, content } : t);
      saveConfig({ ...config!, tabs: newTabs || [] });
    }
  }

  function deleteTab(id: string) {
    if (confirm('Xóa Tab này?')) {
      const newTabs = config?.tabs.filter(t => t.id !== id);
      saveConfig({ ...config!, tabs: newTabs || [] });
    }
  }

  function addVideo() {
    const url = prompt('Nhập URL video (Youtube/Tiktok):');
    if (url) {
      const newVideos = [...(config?.embeddedVideos || []), url];
      saveConfig({ ...config!, embeddedVideos: newVideos });
    }
  }

  function deleteVideo(idx: number) {
    const newVideos = config?.embeddedVideos.filter((_, i) => i !== idx);
    saveConfig({ ...config!, embeddedVideos: newVideos || [] });
  }

  function getSocialIcon(platform: string) {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'telegram': return <Send className="w-5 h-5 text-sky-500" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
      case 'tiktok': return <Video className="w-5 h-5 text-slate-900 dark:text-white" />;
      default: return <Globe className="w-5 h-5 text-slate-400" />;
    }
  }

  function getEmbedUrl(url: string) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${id}`;
    }
    // Basic Tiktok support (via oembed or simple replacement - tiktok iframe is tricky)
    return url;
  }
}

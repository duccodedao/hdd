import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Key, Eye, EyeOff, Save, Loader2 } from 'lucide-react';

export default function AdminApiKeys() {
  const { isSuperAdmin } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  
  const [apiKeys, setApiKeys] = useState({
    geminiApiKey: '',
    googleClientId: '',
    githubUsername: '',
    githubRepo: '',
    githubToken: '',
    githubBranch: 'main',
    githubPath: 'assets/uploads',
  });

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const [apiSnap, sysSnap, githubSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'apiKeys')),
          getDoc(doc(db, 'settings', 'system')),
          getDoc(doc(db, 'settings', 'github'))
        ]);
        
        let fetchedData = {};
        if (apiSnap.exists()) {
          fetchedData = { ...fetchedData, ...apiSnap.data() };
        }
        if (sysSnap.exists()) {
          fetchedData = { ...fetchedData, googleClientId: sysSnap.data().googleClientId || '' };
        }
        if (githubSnap.exists()) {
          const data = githubSnap.data();
          fetchedData = { 
            ...fetchedData, 
            githubUsername: data.username || '',
            githubRepo: data.repo || '',
            githubToken: data.token || '',
            githubBranch: data.branch || 'main',
            githubPath: data.path || 'assets/uploads'
          };
        }
        
        setApiKeys((prev) => ({ ...prev, ...fetchedData }));
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, []);

  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast.error('Chỉ Super Admin mới có quyền cấu hình API Keys.');
      return;
    }
    
    setSaving(true);
    try {
      await Promise.all([
        setDoc(doc(db, 'settings', 'apiKeys'), { geminiApiKey: apiKeys.geminiApiKey }, { merge: true }),
        setDoc(doc(db, 'settings', 'system'), { googleClientId: apiKeys.googleClientId }, { merge: true }),
        setDoc(doc(db, 'settings', 'github'), { 
          username: apiKeys.githubUsername,
          repo: apiKeys.githubRepo,
          token: apiKeys.githubToken,
          branch: apiKeys.githubBranch,
          path: apiKeys.githubPath
        }, { merge: true })
      ]);
      toast.success('Đã lưu cấu hình API Keys / Cấu hình');
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast.error('Có lỗi xảy ra khi lưu API Keys');
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <div className="p-10 text-center text-zinc-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Key className="w-6 h-6 text-amber-500" /> Cấu hình API Keys (System Wide)
        </h3>
        
        <p className="text-sm text-slate-500 mb-8 max-w-2xl">
          Quản lý các khóa API được sử dụng trong toàn bộ hệ thống. Các keys này được lưu bảo mật trong Firestore và chỉ được lấy bởi client nếu user đã đăng nhập. Google Client ID được dùng để tích hợp Google One Tap.
        </p>
        
        <div className="space-y-6 max-w-3xl">
          {/* Gemini API Key */}
          <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl border border-slate-200 dark:border-white/10 relative">
             <label className="block text-xs font-bold mb-2 ml-1 text-slate-500 uppercase tracking-widest">
               Gemini API Key (Google AI Studio)
             </label>
             <div className="relative">
               <input 
                 type={showKeys['gemini'] ? 'text' : 'password'}
                 value={apiKeys.geminiApiKey}
                 onChange={(e) => setApiKeys(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                 className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                 placeholder="AIzaSy..."
                 disabled={!isSuperAdmin}
               />
               <button 
                 onClick={() => toggleShow('gemini')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
               >
                 {showKeys['gemini'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               </button>
             </div>
             <p className="text-[11px] text-slate-400 mt-2 font-medium">Sử dụng cho tính năng Trợ lý AI (Gemini Chat).</p>
          </div>

          {/* Google Client ID */}
          <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl border border-slate-200 dark:border-white/10 relative">
             <label className="block text-xs font-bold mb-2 ml-1 text-slate-500 uppercase tracking-widest">
               Google Client ID (VITE_GOOGLE_CLIENT_ID) 
             </label>
             <div className="relative">
               <input 
                 type={showKeys['google'] ? 'text' : 'password'}
                 value={apiKeys.googleClientId}
                 onChange={(e) => setApiKeys(prev => ({ ...prev, googleClientId: e.target.value }))}
                 className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                 placeholder="xxxxxxxx-xxxxxx.apps.googleusercontent.com"
                 disabled={!isSuperAdmin}
               />
               <button 
                 onClick={() => toggleShow('google')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
               >
                 {showKeys['google'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               </button>
             </div>
             <p className="text-[11px] text-slate-400 mt-2 font-medium">Thay thế cho biến môi trường VITE_GOOGLE_CLIENT_ID dùng để hiển thị nút đăng nhập bằng Google (Google One Tap).</p>
          </div>

          {/* GitHub Config */}
          <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl border border-slate-200 dark:border-white/10 relative">
             <label className="block text-xs font-bold mb-4 ml-1 text-slate-500 uppercase tracking-widest">
               Cấu hình GitHub (Dùng cho Tiện ích Web)
             </label>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                 <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-400 uppercase tracking-widest">Username / Owner</label>
                 <input 
                   type="text" 
                   value={apiKeys.githubUsername}
                   onChange={(e) => setApiKeys(prev => ({ ...prev, githubUsername: e.target.value }))}
                   className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                   placeholder="ex: Google"
                   disabled={!isSuperAdmin}
                 />
               </div>
               <div>
                 <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-400 uppercase tracking-widest">Repository</label>
                 <input 
                   type="text" 
                   value={apiKeys.githubRepo}
                   onChange={(e) => setApiKeys(prev => ({ ...prev, githubRepo: e.target.value }))}
                   className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                   placeholder="ex: react"
                   disabled={!isSuperAdmin}
                 />
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                 <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-400 uppercase tracking-widest">Branch</label>
                 <input 
                   type="text" 
                   value={apiKeys.githubBranch}
                   onChange={(e) => setApiKeys(prev => ({ ...prev, githubBranch: e.target.value }))}
                   className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                   placeholder="main"
                   disabled={!isSuperAdmin}
                 />
               </div>
               <div>
                 <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-400 uppercase tracking-widest">Base Path</label>
                 <input 
                   type="text" 
                   value={apiKeys.githubPath}
                   onChange={(e) => setApiKeys(prev => ({ ...prev, githubPath: e.target.value }))}
                   className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                   placeholder="assets/uploads"
                   disabled={!isSuperAdmin}
                 />
               </div>
             </div>

             <div>
               <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-400 uppercase tracking-widest">Personal Access Token (Tuỳ chọn)</label>
               <div className="relative">
                 <input 
                   type={showKeys['githubToken'] ? 'text' : 'password'}
                   value={apiKeys.githubToken}
                   onChange={(e) => setApiKeys(prev => ({ ...prev, githubToken: e.target.value }))}
                   className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-mono"
                   placeholder="ghp_xxxxxxxxxxxx"
                   disabled={!isSuperAdmin}
                 />
                 <button 
                   onClick={() => toggleShow('githubToken')}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                 >
                   {showKeys['githubToken'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                 </button>
               </div>
               <p className="text-[11px] text-slate-400 mt-2 font-medium">Bổ sung token nếu repository ở chế độ Private hoặc cần vượt qua rate limit của GitHub API.</p>
             </div>
          </div>

          <div className="flex justify-start mt-8">
             <button 
               onClick={handleSave}
               disabled={saving || !isSuperAdmin}
               className="bg-amber-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
             >
               {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
               Lưu cấu hình
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

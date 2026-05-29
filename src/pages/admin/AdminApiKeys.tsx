import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Key, Eye, EyeOff, Save, Loader2, Users, Trash2, ShieldCheck, Mail, Calendar, Clock, AlertCircle, Clipboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminApiKeys() {
  const { isSuperAdmin } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const [activeTab, setActiveTab] = useState<'system' | 'secondary'>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  
  const [apiKeys, setApiKeys] = useState({
    geminiApiKey: '',
  });

  const [secondaryKeys, setSecondaryKeys] = useState<any[]>([]);
  const [loadingSecondary, setLoadingSecondary] = useState(false);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const apiSnap = await getDoc(doc(db, 'settings', 'apiKeys'));
        
        let fetchedData: any = {};
        if (apiSnap.exists()) {
          fetchedData = apiSnap.data();
        }
        
        setApiKeys((prev) => ({ ...prev, ...fetchedData }));
      } catch (error) {
        console.error('Failed to fetch API keys:', error?.message || String(error));
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, []);

  const fetchSecondaryKeys = async () => {
    setLoadingSecondary(true);
    try {
      const q = query(collection(db, 'user_ai_keys'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const keys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSecondaryKeys(keys);
    } catch (error) {
      console.error('Failed to fetch secondary keys:', error?.message || String(error));
      toast.error('Lỗi khi tải danh sách API Key phụ');
    } finally {
      setLoadingSecondary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'secondary') {
      fetchSecondaryKeys();
    }
  }, [activeTab]);

  const handleDeleteSecondary = (id: string) => {
    openConfirm({
      title: 'Xóa API Key phụ',
      message: 'Bạn có chắc chắn muốn xóa API Key này không?',
      confirmText: 'Xóa ngay',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'user_ai_keys', id));
          setSecondaryKeys(prev => prev.filter(k => k.id !== id));
          toast.success('Đã xóa API Key');
        } catch (error) {
          toast.error('Lỗi khi xóa API Key');
        }
      }
    });
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast.error('Chỉ Super Admin mới có quyền cấu hình API Keys.');
      return;
    }
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'apiKeys'), { geminiApiKey: apiKeys.geminiApiKey }, { merge: true });
      toast.success('Đã lưu cấu hình API Keys thành công');
    } catch (error) {
      console.error('Failed to save API keys:', error?.message || String(error));
      toast.error('Có lỗi xảy ra khi lưu API Keys');
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <div className="p-10 text-center text-zinc-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('system')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'system' 
              ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Hệ thống
        </button>
        <button
          onClick={() => setActiveTab('secondary')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'secondary' 
              ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Users className="w-4 h-4" />
          API Key Phụ
          {secondaryKeys.length > 0 && activeTab === 'system' && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">
              {secondaryKeys.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'system' ? (
          <motion.div
            key="system"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-sm"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Key className="w-6 h-6 text-amber-500" /> Cấu hình API Keys (System Wide)
            </h3>
            
            <p className="text-sm text-slate-500 mb-8 max-w-2xl">
              Quản lý các khóa API được sử dụng trong toàn bộ hệ thống. Các keys này được lưu bảo mật trong Firestore.
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
                 <div className="mt-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      <b>Lưu ý dành cho Admin:</b> Nếu API Key gốc bị mất, vô hiệu hóa hoặc không hoạt động, bạn có thể truy cập 
                      <a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noopener noreferrer" className="mx-1 font-bold underline hover:text-amber-600">Google AI Studio</a> 
                      để tạo lại khóa mới và cập nhật tại đây để hệ thống tiếp tục hoạt động.
                    </p>
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
          </motion.div>
        ) : (
          <motion.div
            key="secondary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" /> API Key Phụ từ Người dùng
                </h3>
                <p className="text-xs text-slate-500 mt-1">Danh sách các API Key Gemini do người dùng đóng góp hoặc tự nhập để sử dụng.</p>
              </div>
              <button 
                onClick={fetchSecondaryKeys}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all text-slate-400"
                title="Làm mới"
              >
                <Clock className={cn("w-5 h-5", loadingSecondary && "animate-spin")} />
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar scroll-smooth">
              {loadingSecondary ? (
                <div className="p-20 text-center text-slate-400">Đang tải danh sách...</div>
              ) : secondaryKeys.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center gap-4">
                  <AlertCircle className="w-12 h-12 text-slate-200" />
                  <p className="text-slate-400 font-medium whitespace-nowrap">Chưa có API Key phụ nào được nhập.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4 whitespace-nowrap">Người dùng</th>
                      <th className="px-6 py-4 whitespace-nowrap">API Key</th>
                      <th className="px-6 py-4 whitespace-nowrap">Trạng thái</th>
                      <th className="px-6 py-4 whitespace-nowrap">Ngày nhập</th>
                      <th className="px-6 py-4 whitespace-nowrap">Lần dùng cuối</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {secondaryKeys.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                              <Mail size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {item.email}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono italic opacity-70">{item.userId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                             <div className="px-2 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-md font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                                {showKeys[item.id] ? item.apiKey : '•'.repeat(24)}
                             </div>
                             <button 
                               onClick={() => {
                                 navigator.clipboard.writeText(item.apiKey);
                                 toast.success('Đã sao chép API Key');
                               }}
                               className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors text-slate-400"
                               title="Sao chép Key"
                             >
                               <Clipboard size={12} />
                             </button>
                             <button 
                               onClick={() => toggleShow(item.id)}
                               className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors text-slate-400"
                             >
                               {showKeys[item.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                             </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider",
                            item.status === 'active' 
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400"
                          )}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex flex-col">
                              <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}
                              </span>
                              <span className="text-[10px] text-slate-400 opacity-70 italic">
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString('vi-VN') : ''}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex flex-col">
                              <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                                {item.lastUsedAt?.toDate ? item.lastUsedAt.toDate().toLocaleDateString('vi-VN') : 'Chưa dùng'}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button 
                            onClick={() => handleDeleteSecondary(item.id)}
                            className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-400/10 rounded-full transition-all"
                            title="Xóa Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

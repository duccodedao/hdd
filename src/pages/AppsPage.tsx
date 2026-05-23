import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppWindow, ExternalLink, Search, RefreshCw, Box, Lock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

interface AppItem {
  id: string;
  title: string;
  description?: string;
  logoUrl?: string;
  appUrl: string;
  internalOnly?: boolean;
  categoryId?: string;
  createdAt?: any;
}

interface Category {
  id: string;
  name: string;
}

export default function AppsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'categories'>('all');
  const { userData, isAdmin, isSuperAdmin } = useAuthStore();
  const { maintenanceTabs } = useAppStore();

  useEffect(() => {
    const unsubApps = onSnapshot(query(collection(db, 'apps'), orderBy('createdAt', 'desc')), (snapshot) => {
      const items: AppItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppItem));
      setApps(items);
      setLoading(false);
    }, (err) => {
      console.error("AppsPage apps listener error:", err);
      if (err?.message?.includes('quota') || err?.message?.includes('resource-exhausted') || (err as any)?.code === 'resource-exhausted') {
        useAppStore.getState().setQuotaExceeded(true);
      }
      setLoading(false);
    });

    const unsubCats = onSnapshot(collection(db, 'app_categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats.sort((a, b) => (a as any).createdAt?.toMillis() - (b as any).createdAt?.toMillis() || 0));
    }, (err) => {
      console.error("AppsPage categories listener error:", err);
    });

    return () => {
      unsubApps();
      unsubCats();
    };
  }, []);

  const filteredApps = apps.filter(app => {
    if (app.internalOnly && !isAdmin && !isSuperAdmin) {
      return false;
    }
    return (
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const appsByCategory = categories.map(cat => ({
    ...cat,
    apps: filteredApps.filter(app => app.categoryId === cat.id)
  })).filter(cat => cat.apps.length > 0);

  const uncategorizedApps = filteredApps.filter(app => !app.categoryId || !categories.find(c => c.id === app.categoryId));

  const handleOpenApp = (app: AppItem) => {
    const isMaintenanceActive = maintenanceTabs[`app_${app.id}`];
    const isBlocked = isMaintenanceActive && !isSuperAdmin;
    
    if (isBlocked) {
       toast.error(`Ứng dụng "${app.title}" đang được bảo trì. Vui lòng quay lại sau!`, {
          icon: '⚠️',
          style: { borderRadius: '12px', background: '#333', color: '#fff', fontSize: '13px' }
       });
       return;
    }
    
    const isInternal = app.internalOnly;
    const hasAccess = isAdmin || isSuperAdmin;

    if (isInternal && !hasAccess) {
      toast.error('Ứng dụng này chỉ dành cho người dùng nội bộ.', { icon: '🔐' });
      return;
    }
    
    if (!app.appUrl) return;
    let url = app.appUrl;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-[1800px] mx-auto py-8 lg:py-12 space-y-8 animate-fade-in no-scrollbar px-4 bg-transparent min-h-screen">
      <Helmet>
        <title>Thực đơn Ứng dụng | BMASS</title>
        <meta name="description" content="Trải nghiệm hệ sinh thái phần mềm và ứng dụng bảo mật nâng cao." />
      </Helmet>

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-full text-blue-600 dark:text-zinc-300 mb-3 text-[10px] font-black uppercase tracking-wider">
            <AppWindow className="w-3 h-3 text-blue-500" />
            <span>App Portal</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Ứng dụng Hệ sinh thái
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mt-1.5 leading-relaxed">
            Danh mục các dịch vụ, ứng dụng liên kết và công cụ nội bộ hoạt động độc lập trên đám mây. Click để khởi động nhanh trong tab mới.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="Tìm kiếm ứng dụng liên kết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 transition-all shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold"
            >
              Xoá
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center md:justify-start">
        <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1 w-fit">
          <button 
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === 'all' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setViewMode('categories')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === 'categories' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
          >
            Theo danh mục
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Đang tải xuống mục lục ứng dụng...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 dark:bg-white/[0.01] rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-6">
            <AppWindow size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">Chưa có ứng dụng nào</h3>
          <p className="text-slate-400 text-xs max-w-sm">Danh sách ứng dụng liên kết hiện đang trống. Vui lòng quay lại sau hoặc liên hệ Quản trị viên để thiết đặt.</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-bold text-slate-700 dark:text-zinc-300">Không tìm thấy kết quả</h3>
          <p className="text-slate-400 text-xs max-w-sm mt-1">Thử tìm kiếm với một từ khóa khác.</p>
        </div>
      ) : (
        viewMode === 'all' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <motion.div 
              layout
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredApps.map((app) => (
                  <AppCard key={app.id} app={app} onOpen={handleOpenApp} maintenanceTabs={maintenanceTabs} />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-12">
            {appsByCategory.map((category) => (
              <div key={category.id} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex items-center gap-3 px-1">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{category.name}</h2>
                    <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
                    <span className="text-[10px] font-bold text-slate-400 italic">{category.apps.length} ứng dụng</span>
                 </div>
                 
                 <motion.div 
                   layout
                   className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4"
                 >
                   <AnimatePresence mode="popLayout">
                     {category.apps.map((app) => (
                       <AppCard key={app.id} app={app} onOpen={handleOpenApp} maintenanceTabs={maintenanceTabs} />
                     ))}
                   </AnimatePresence>
                 </motion.div>
              </div>
            ))}

            {uncategorizedApps.length > 0 && (
               <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-3 px-1">
                     <div className="w-1.5 h-6 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                     <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Khác</h2>
                     <div className="h-px bg-slate-100 dark:bg-white/5 flex-1" />
                     <span className="text-[10px] font-bold text-slate-400 italic">{uncategorizedApps.length} ứng dụng</span>
                  </div>
                  
                  <motion.div 
                    layout
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {uncategorizedApps.map((app) => (
                        <AppCard key={app.id} app={app} onOpen={handleOpenApp} maintenanceTabs={maintenanceTabs} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
               </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function AppCard({ app, onOpen, maintenanceTabs }: { app: AppItem, onOpen: (app: AppItem) => void, maintenanceTabs: any }) {
  return (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -3, scale: 1.01 }}
        onClick={() => onOpen(app)}
        className="group relative bg-white dark:bg-zinc-900/40 border border-slate-100 dark:border-white/5 active:scale-95 transition-all duration-300 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-md dark:hover:bg-zinc-900/80 hover:border-indigo-500/20"
      >
        {/* Logo Area */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 mb-3 transition-all relative">
          {app.logoUrl ? (
            <img 
              src={app.logoUrl} 
              alt={app.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as any).style.display = 'none';
                const parent = (e.target as any).parentNode;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = "w-full h-full flex items-center justify-center font-display font-semibold text-lg text-indigo-500 uppercase";
                  fallback.innerText = app.title.charAt(0);
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="font-display font-semibold text-lg text-blue-500 uppercase">
              {app.title.charAt(0)}
            </div>
          )}

          <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-indigo-500 text-white transition-opacity">
            <ExternalLink className="w-1.5 h-1.5" />
          </div>
        </div>

        <h3 className="font-semibold text-slate-700 dark:text-zinc-200 text-[11px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 w-full px-1" title={app.title}>
          {app.title}
        </h3>

        <div className="flex gap-1 items-center mt-1">
          {app.internalOnly && (
            <span className="text-[7.5px] font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20 shadow-sm leading-none">
              Nội bộ
            </span>
          )}
          {maintenanceTabs[`app_${app.id}`] && (
            <span className="text-[7.5px] font-bold uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1 py-0.5 rounded border border-rose-100 dark:border-rose-500/20 shadow-sm leading-none">
              Bảo trì
            </span>
          )}
        </div>
      </motion.div>
  );
}

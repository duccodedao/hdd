import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList, ExternalLink, Lightbulb, Code2, ChevronRight, ArrowRight, FileImage, FileText, Scan, Zap, Box, AppWindow, Lock, MessageSquare, Bot, FolderOpen, Laptop } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfflineGuard } from '../components/OfflineGuard';
import ImageToPdf from './utilities/ImageToPdf';
import PdfToWord from './utilities/PdfToWord';
import AiScanner from './utilities/AiScanner';
import DocumentVault from './utilities/DocumentVault';
import PersonalFileManager from './utilities/PersonalFileManager';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

import { useParams, useNavigate } from 'react-router-dom';

interface UtilityItem {
  id: string;
  title: string;
  description: string;
  icon: any; 
  type: 'internal' | 'embed' | 'tool';
  embedUrl?: string;
  createdAt: number;
  adminOnly?: boolean;
}

const UtilityCard = ({ item, idx, onSelect }: { item: UtilityItem, idx: number, onSelect: (item: UtilityItem) => void }) => {
  const { maintenanceTabs } = useAppStore();
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const isMaintenanceActive = maintenanceTabs[`utility_${item.id}`];
  const isBlocked = isMaintenanceActive && !isSuperAdmin;
  const Icon = item.icon;

  if (item.adminOnly && !isSuperAdmin) {
    return null;
  }

  const handleClick = () => {
    if (isBlocked) {
      toast.error(`Tiện ích "${item.title}" đang được bảo trì. Vui lòng quay lại sau!`, {
        icon: '⚠️',
        style: {
          borderRadius: '12px',
          background: '#1a1a1b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
      return;
    }
    onSelect(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      whileHover={isBlocked ? {} : { y: -4 }}
      className={cn(
        "premium-card flex flex-col h-full cursor-pointer group relative overflow-hidden",
        isBlocked && "opacity-75"
      )}
      onClick={handleClick}
    >
      {isMaintenanceActive && (
        <div className="absolute top-0 right-0 p-3 z-10">
           <div className={cn(
             "p-1.5 rounded-lg border",
             isSuperAdmin ? "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" : "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-500 dark:border-amber-500/30"
           )}>
              <Lock className="w-3.5 h-3.5" />
           </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div className={cn(
          "w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-all duration-500",
          !isBlocked && "group-hover:text-blue-600 dark:group-hover:text-white group-hover:bg-blue-50 dark:group-hover:bg-indigo-500/10 group-hover:border-blue-200 dark:group-hover:border-indigo-500/20 group-hover:scale-110"
        )}>
          {typeof item.icon === 'string' ? (
            item.type === 'embed' ? <ExternalLink className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />
          ) : (
            Icon ? <Icon className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className={cn(
            "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border",
            isMaintenanceActive ? (isSuperAdmin ? 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20') :
            item.id === 'ai-scanner' ? 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 
            item.type === 'embed' ? 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-zinc-800 dark:text-zinc-500 dark:border-white/5' : 
            'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/50 dark:border-white/10'
          )}>
            {isMaintenanceActive ? (isSuperAdmin ? 'Bảo trì (Admin)' : 'Bảo trì') : (item.id === 'ai-scanner' ? 'AI Neural' : item.type === 'embed' ? 'Web Ext' : 'System')}
          </div>
          {(item as any).internalOnly && (
            <div className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20">
              Nội bộ
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-3">
        <h3 className="text-xl font-semibold text-slate-950 dark:text-white tracking-tight">{item.title}</h3>
        <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed line-clamp-2 italic">
           {item.description}
        </p>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between group/link">
        <span className={cn(
          "text-[10px] font-bold text-slate-500 dark:text-zinc-600 uppercase tracking-widest transition-colors flex items-center gap-2",
          !isBlocked && "group-hover:text-blue-600 dark:group-hover:text-indigo-400"
        )}>
          {isBlocked ? 'Đang bảo trì' : 'Thực thi'} {!isBlocked && <Zap className="w-3 h-3" />}
        </span>
        {!isBlocked && <ArrowRight className="w-4 h-4 text-slate-400 dark:text-zinc-700 group-hover:text-blue-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />}
      </div>
    </motion.div>
  );
};

const nativeUtilities: UtilityItem[] = [
  {
    id: 'file-manager',
    title: 'Quản Lý File Cá Nhân',
    description: 'Duyệt và xem toàn bộ tệp tin trong repository của bạn như chiếc máy tính di động cá nhân.',
    icon: Laptop,
    type: 'tool',
    createdAt: Date.now() + 3000
  },
  {
    id: 'kho-van-ban',
    title: 'Kho Văn Bản',
    description: 'Hệ thống lưu trữ và quản lý biểu mẫu hành chính, văn bản quy phạm trực tuyến.',
    icon: FolderOpen,
    type: 'tool',
    createdAt: Date.now() + 2000
  },
  {
    id: 'ai-scanner',
    title: 'Quét Văn Bản AI',
    description: 'Trích xuất văn bản từ hình ảnh kỹ thuật số với độ chính xác cao bằng trí tuệ nhân tạo.',
    icon: Scan,
    type: 'tool',
    createdAt: Date.now()
  },
  {
    id: 'image-to-pdf',
    title: 'Ảnh sang PDF',
    description: 'Tổng hợp nhiều hình ảnh thành file tài liệu định dạng PDF tiêu chuẩn bảo mật cao.',
    icon: FileImage,
    type: 'tool',
    createdAt: Date.now() - 1000
  },
  {
    id: 'pdf-to-word',
    title: 'PDF sang Word',
    description: 'Chuyển đổi tài liệu PDF sang định dạng Word có thể chỉnh sửa.',
    icon: FileText,
    type: 'tool',
    createdAt: Date.now() - 2000
  }
];

export default function UtilitiesPage() {
  const { sessionId, utilityId } = useParams();
  const navigate = useNavigate();
  const [utilities, setUtilities] = useState<UtilityItem[]>([]);
  const [activeUtility, setActiveUtility] = useState<UtilityItem | null>(null);
  const [systemTools, setSystemTools] = useState<any>({});
  const { setAiActive } = useAppStore();
  const { user, userData, isAdmin, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    
    if (viewId && !utilityId) {
      navigate(`/utilities/kho-van-ban?view=${viewId}`, { replace: true });
      return;
    }

    if (utilityId) {
      const all = [...nativeUtilities, ...utilities];
      const match = all.find(u => u.id === utilityId);
      if (match) setActiveUtility(match);
    } else {
      setActiveUtility(null);
    }
  }, [sessionId, utilityId, utilities, navigate]);

  const handleSelect = (item: UtilityItem) => {
    // Check internal only
    const config = systemTools[item.id];
    const isInternal = config?.internal || (item as any).internalOnly;
    const hasAccess = userData?.assignedUtilities?.includes(item.id) || isAdmin || isSuperAdmin;

    if (isInternal && !hasAccess) {
      toast.error('Tiện ích này chỉ dành cho người dùng nội bộ/có ủy quyền.', { icon: '🔐' });
      return;
    }
    
    navigate(`/utilities/${item.id}`);
  };

  const handleBack = () => {
    setActiveUtility(null);
    navigate('/utilities');
  };

  useEffect(() => {
    // Settings for native tools
    const unsub = onSnapshot(doc(db, 'settings', 'tool_permissions'), (docSnap) => {
      if (docSnap.exists()) setSystemTools(docSnap.data());
    }, (err) => {
      console.error("UtilitiesPage tool_permissions error:", err);
      if (err?.message?.includes('quota') || err?.message?.includes('resource-exhausted') || (err as any)?.code === 'resource-exhausted') {
        useAppStore.getState().setQuotaExceeded(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'utilities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtilityItem)));
    }, (err) => {
      console.error("UtilitiesPage utilities listener error:", err);
      if (err?.message?.includes('quota') || err?.message?.includes('resource-exhausted') || (err as any)?.code === 'resource-exhausted') {
        useAppStore.getState().setQuotaExceeded(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const { maintenanceTabs } = useAppStore();

  const filteredItems = [...nativeUtilities, ...utilities];

  if (activeUtility) {
    const isMaintenanceActive = maintenanceTabs[`utility_${activeUtility.id}`];
    const isBlocked = isMaintenanceActive && !isSuperAdmin;

    if (isBlocked) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-950 min-h-screen animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 mb-8">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-4">Tính năng đang bảo trì</h2>
          <p className="text-slate-600 dark:text-zinc-400 max-w-md mx-auto mb-10 font-medium">
            Tiện ích "{activeUtility.title}" hiện đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau ít phút.
          </p>
          <button 
            onClick={handleBack}
            className="px-8 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
          >
            Quay lại trang chủ
          </button>
        </div>
      );
    }

    if (activeUtility.id === 'file-manager') {
      return <PersonalFileManager onBack={handleBack} />;
    }
    
    if (activeUtility.id === 'kho-van-ban') {
      return <DocumentVault onBack={handleBack} />;
    }
    
    if (activeUtility.id === 'image-to-pdf') {
      return <ImageToPdf onBack={handleBack} />;
    }
 
    if (activeUtility.id === 'pdf-to-word') {
      return <PdfToWord onBack={handleBack} />;
    }
 
    if (activeUtility.id === 'ai-scanner') {
      return <AiScanner onBack={handleBack} />;
    }

    if (activeUtility.type === 'embed') {
      return (
        <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-12 relative animate-fade-in">
          <button onClick={handleBack} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5">
            <ArrowRight className="w-4 h-4 rotate-180" /> Quay Lại
          </button>
          <div className="flex-1 glass-card overflow-hidden bg-black/40 ring-1 ring-white/10 shadow-2xl">
            <OfflineGuard message="Công cụ này yêu cầu kết nối mạng ổn định.">
              <iframe 
                src={activeUtility.embedUrl} 
                className="w-full h-full border-0" 
                title={activeUtility.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              />
            </OfflineGuard>
          </div>
        </div>
      );
    }
  }

  const allItems = filteredItems.filter(item => {
    const config = systemTools[item.id];
    const isInternal = config?.internal || (item as any).internalOnly;
    if (isInternal) {
      return isAdmin || isSuperAdmin;
    }
    return true;
  });
  const totalTools = allItems.length;
  const maintenanceTools = allItems.filter(item => maintenanceTabs[`utility_${item.id}`]).length;
  const activeTools = totalTools - maintenanceTools;

  let internalTools = 0;
  let publicTools = 0;
  if (isAdmin || isSuperAdmin) {
    internalTools = allItems.filter(item => {
      const config = systemTools[item.id];
      return config?.internal || (item as any).internalOnly;
    }).length;
    publicTools = totalTools - internalTools;
  }

  return (
    <div className="max-w-[1920px] mx-auto py-6 lg:py-20 relative min-h-screen animate-fade-in">
      <div className="space-y-10 lg:space-y-16">
        {/* Header section */}
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-300 uppercase tracking-widest">Workbench</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-1 lg:space-y-2">
              <h1 className="text-3xl lg:text-6xl font-display font-semibold tracking-tight text-slate-950 dark:text-white leading-none">Công Cụ</h1>
              <p className="text-slate-600 dark:text-zinc-400 text-sm lg:text-base font-medium max-w-xl">
                Các tiện ích hiệu suất cao được thiết kế để tối ưu hóa công việc kỹ thuật số của bạn.
              </p>
            </div>

            <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 text-[10px] sm:text-xs">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <div className="flex flex-col min-w-[50px]">
                  <span className="font-bold text-slate-800 dark:text-white text-base leading-none mb-1">{totalTools}</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Tổng</span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                <div className="flex flex-col min-w-[50px]">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base leading-none mb-1">{activeTools}</span>
                  <span className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-500 uppercase tracking-wider">H.Động</span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                <div className="flex flex-col min-w-[50px]">
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-base leading-none mb-1">{maintenanceTools}</span>
                  <span className="text-[10px] font-semibold text-amber-600/70 dark:text-amber-500 uppercase tracking-wider">Bảo trì</span>
                </div>
              </div>

              {(isAdmin || isSuperAdmin) && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl shadow-sm">
                  <div className="flex flex-col min-w-[50px]">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base leading-none mb-1">{publicTools}</span>
                    <span className="text-[10px] font-semibold text-indigo-600/70 dark:text-indigo-500 uppercase tracking-wider">C.Khai</span>
                  </div>
                  <div className="w-px h-8 bg-indigo-200 dark:bg-indigo-500/20" />
                  <div className="flex flex-col min-w-[50px]">
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-base leading-none mb-1">{internalTools}</span>
                    <span className="text-[10px] font-semibold text-rose-600/70 dark:text-rose-500 uppercase tracking-wider">Nội bộ</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
              {allItems.map((item, idx) => (
                <UtilityCard key={item.id} item={item} idx={idx} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

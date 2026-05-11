import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList, ExternalLink, Lightbulb, Code2, ChevronRight, ArrowRight, FileImage, FileText, Scan, Zap, Box, AppWindow, Lock } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfflineGuard } from '../components/OfflineGuard';
import GuestView from '../components/ui/GuestView';
import FindMyDeviceUtility from './FindMyDeviceUtility';
import ImageToPdf from './utilities/ImageToPdf';
import PdfToWord from './utilities/PdfToWord';
import AiScanner from './utilities/AiScanner';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface UtilityItem {
  id: string;
  title: string;
  description: string;
  icon: any; 
  type: 'internal' | 'embed' | 'tool';
  embedUrl?: string;
  createdAt: number;
}

const UtilityCard = ({ item, idx, onSelect }: { item: UtilityItem, idx: number, onSelect: (item: UtilityItem) => void }) => {
  const { maintenanceTabs } = useAppStore();
  const { isAdmin } = useAuthStore();
  const isMaintenanceActive = maintenanceTabs[`utility_${item.id}`];
  const isBlocked = isMaintenanceActive && !isAdmin;
  const Icon = item.icon;

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
             isAdmin ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"
           )}>
              <Lock className="w-3.5 h-3.5" />
           </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div className={cn(
          "w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 transition-all duration-500",
          !isBlocked && "group-hover:text-white group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 group-hover:scale-110"
        )}>
          {typeof item.icon === 'string' ? (
            item.type === 'embed' ? <ExternalLink className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />
          ) : (
            Icon ? <Icon className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />
          )}
        </div>
        <div className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border",
          isMaintenanceActive ? (isAdmin ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20') :
          item.id === 'ai-scanner' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
          item.type === 'embed' ? 'bg-zinc-800 text-zinc-500 border-white/5' : 
          'bg-white/5 text-white/50 border-white/10'
        )}>
          {isMaintenanceActive ? (isAdmin ? 'Bảo trì (Admin)' : 'Bảo trì') : (item.id === 'ai-scanner' ? 'AI Neural' : item.type === 'embed' ? 'Web Ext' : 'System')}
        </div>
      </div>
      
      <div className="flex-1 space-y-3">
        <h3 className="text-xl font-semibold text-white tracking-tight">{item.title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 italic">
           {item.description}
        </p>
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between group/link">
        <span className={cn(
          "text-[10px] font-bold text-zinc-600 uppercase tracking-widest transition-colors flex items-center gap-2",
          !isBlocked && "group-hover:text-indigo-400"
        )}>
          {isBlocked ? 'Đang bảo trì' : 'Thực thi'} {!isBlocked && <Zap className="w-3 h-3" />}
        </span>
        {!isBlocked && <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />}
      </div>
    </motion.div>
  );
};

export default function UtilitiesPage() {
  const [utilities, setUtilities] = useState<UtilityItem[]>([]);
  const [activeUtility, setActiveUtility] = useState<UtilityItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'utilities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUtilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtilityItem)));
    });
    return () => unsubscribe();
  }, []);

  if (activeUtility) {
    if (activeUtility.type === 'internal' && activeUtility.id === 'find-my-device') {
      return <FindMyDeviceUtility onBack={() => setActiveUtility(null)} />;
    }
    
    if (activeUtility.id === 'image-to-pdf') {
      return <ImageToPdf onBack={() => setActiveUtility(null)} />;
    }

    if (activeUtility.id === 'pdf-to-word') {
      return <PdfToWord onBack={() => setActiveUtility(null)} />;
    }

    if (activeUtility.id === 'ai-scanner') {
      return <AiScanner onBack={() => setActiveUtility(null)} />;
    }

    if (activeUtility.type === 'embed') {
      return (
        <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-12 relative animate-fade-in">
          <button onClick={() => setActiveUtility(null)} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-6 transition-colors px-4 py-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5">
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

const nativeUtilities: UtilityItem[] = [
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
  },
  {
    id: 'find-my-device',
    title: 'Định Vị Thiết Bị',
    description: 'Kết nối mạng lưới toàn cầu để xác định và bảo mật thiết bị di động của bạn.',
    icon: Box,
    type: 'internal',
    createdAt: Date.now() - 3000
  }
];

  const allItems = [...nativeUtilities, ...utilities];

  return (
    <div className="max-w-[1920px] mx-auto py-6 lg:py-20 relative min-h-screen animate-fade-in">
      <div className="space-y-10 lg:space-y-16">
        {/* Header section */}
        <header className="space-y-4 lg:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Workbench</span>
          </div>
          
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-3xl lg:text-6xl font-display font-semibold tracking-tight text-white leading-none">Công Cụ</h1>
            <p className="text-zinc-400 text-sm lg:text-base font-medium max-w-xl">
              Các tiện ích hiệu suất cao được thiết kế để tối ưu hóa công việc kỹ thuật số của bạn.
            </p>
          </div>
        </header>

        <section>
          <GuestView title="Khóa Truy Cập" description="Xác định danh tính để truy cập vào trung tâm xử lý.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
              {allItems.map((item, idx) => (
                <UtilityCard key={item.id} item={item} idx={idx} onSelect={setActiveUtility} />
              ))}
            </div>
          </GuestView>
        </section>
      </div>
    </div>
  );
}

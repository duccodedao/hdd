import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutList, ExternalLink, Lightbulb, Code2, ChevronRight, ArrowRight } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfflineGuard } from '../components/OfflineGuard';
import GuestView from '../components/ui/GuestView';
import FindMyDeviceUtility from './FindMyDeviceUtility';
import { cn } from '../lib/utils';

interface UtilityItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'internal' | 'embed';
  embedUrl?: string;
  createdAt: number;
}

const UtilityCard = ({ item, idx, onSelect }: { item: UtilityItem, idx: number, onSelect: (item: UtilityItem) => void }) => {
  const [showMore, setShowMore] = useState(false);
  const isLong = item.description.length > 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="glass-card p-6 md:p-8 flex flex-col h-full hover:bg-white/[0.05] transition-all"
    >
      <div className="flex items-start justify-between mb-8">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
          {item.type === 'embed' ? <ExternalLink className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
        </div>
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
          item.type === 'embed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'
        )}>
          {item.type === 'embed' ? 'Web Tool' : 'System'}
        </span>
      </div>
      
      <div className="flex-1 space-y-4">
        <h3 className="text-xl font-medium text-white tracking-tight uppercase leading-tight">{item.title}</h3>
        <p className={`text-slate-400 text-sm leading-relaxed ${!showMore && isLong ? 'line-clamp-3' : ''}`}>
           {item.description}
        </p>
        {isLong && (
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMore(!showMore); }}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
          >
            {showMore ? 'Thu gọn' : 'Chi tiết'}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onSelect(item)}
        className="mt-8 h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
      >
        Khám phá <ArrowRight className="w-4 h-4" />
      </button>
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
    
    if (activeUtility.type === 'embed') {
      return (
        <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-8 relative">
          <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none" />
          <button onClick={() => setActiveUtility(null)} className="relative z-10 flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors w-fit px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
            ← Quay lại
          </button>
          <div className="relative z-10 flex-1 bg-white/[0.02] border border-white/10 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <OfflineGuard message="Tiện ích này là một công cụ web bên ngoài, yêu cầu kết nối Internet để tải nội dung.">
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
    id: 'find-my-device',
    title: 'Tìm kiếm thiết bị của tôi',
    description: 'Đăng nhập vào tài khoản Google để tìm thiết bị Android bị mất',
    icon: 'search',
    type: 'internal',
    createdAt: Date.now()
  }
];

  const allItems = [...nativeUtilities, ...utilities];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
      <div className="flex flex-col gap-6 mb-16">
        <motion.h1 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter uppercase"
        >
          Tiện ích & Tool
        </motion.h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
          Khám phá bộ công cụ tính toán và tiện ích nội bộ tối ưu hóa quy trình làm việc của bạn.
        </p>
      </div>

      <GuestView title="Trung tâm Tiện ích" description="Đăng nhập để trải nghiệm toàn bộ các công cụ thông minh.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allItems.map((item, idx) => (
            <UtilityCard key={item.id} item={item} idx={idx} onSelect={setActiveUtility} />
          ))}
        </div>
      </GuestView>
    </div>
  );
}

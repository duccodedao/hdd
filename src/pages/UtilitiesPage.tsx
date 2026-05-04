import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutList, ExternalLink, Lightbulb, Code2, ChevronRight } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfflineGuard } from '../components/OfflineGuard';
import GuestView from '../components/ui/GuestView';
import FindMyDeviceUtility from './FindMyDeviceUtility';

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
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
          {item.type === 'embed' ? <ExternalLink className="w-7 h-7" /> : <Lightbulb className="w-7 h-7" />}
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[10px]  font-heavy tracking-normal px-2 py-1 rounded-lg ${item.type === 'embed' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
            {item.type === 'embed' ? 'Công cụ Web' : 'Hệ thống'}
          </span>
        </div>
      </div>
      
      <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2 leading-tight">
        {item.title}
      </h3>
      <div className="flex-1">
        <p className={`text-sm text-slate-500 dark:text-slate-400 leading-relaxed ${!showMore && isLong ? 'line-clamp-3' : ''}`}>
          {item.description}
        </p>
        {isLong && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowMore(!showMore);
            }}
            className="mt-2 text-[10px] font-medium text-blue-600  tracking-normal hover:underline flex items-center gap-1"
          >
            {showMore ? 'Thu gọn' : 'Xem thêm'}
            <ChevronRight className={`w-3 h-3 transition-transform ${showMore ? '-rotate-90' : 'rotate-90'}`} />
          </button>
        )}
      </div>
      
      <button
        onClick={() => onSelect(item)}
        className="mt-6 w-full py-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl font-bold text-slate-900 dark:text-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 group/btn"
      >
        Mở tiện ích
        <ExternalLink className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
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
        <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-8">
          <button onClick={() => setActiveUtility(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors w-fit">
            ← Quay lại
          </button>
          <div className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
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
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 pt-4 px-4 lg:px-8">
      <div className="flex flex-col gap-3 md:gap-4 mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
            <LayoutList className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-4xl md:text-7xl font-display font-medium text-slate-900 dark:text-white tracking-tight italic leading-none">
              Tiện Ích & Tool
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-medium  tracking-[0.2em] text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-lg">
                Trung tâm tiện ích
              </span>
              <span className="text-[10px] font-medium  tracking-[0.2em] text-slate-400">
                {allItems.length} đang hoạt động
              </span>
            </div>
          </div>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 text-sm md:text-lg font-medium max-w-2xl leading-relaxed"
        >
          Khám phá bộ sưu tập các công cụ thông minh, thủ thuật và tiện ích nâng cao được tích hợp sẵn dành riêng cho bạn.
        </motion.p>
      </div>

      <GuestView title="Trung tâm Tiện ích" description="Đăng nhập để trải nghiệm toàn bộ các công cụ thông minh và các tiện ích nhúng mạnh mẽ dành riêng cho thành viên.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allItems.map((item, idx) => (
            <UtilityCard key={item.id} item={item} idx={idx} onSelect={setActiveUtility} />
          ))}
        </div>
      </GuestView>
    </div>
  );
}

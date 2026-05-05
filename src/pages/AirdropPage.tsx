import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, ArrowRight, Sparkles } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfflineGuard } from '../components/OfflineGuard';
import { cn } from '../lib/utils';

import NoData from '../components/ui/NoData';

const AirdropCard = ({ airdrop, index }: { airdrop: any, index: number }) => {
  const [showMore, setShowMore] = useState(false);
  const isLong = airdrop.description.length > 80;

  return (
    <motion.div
      key={airdrop.id}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="group glass p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-pink-500/20 transition-all duration-700 flex flex-col h-full shadow-2xl shadow-pink-500/[0.02]"
    >
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-[1.5rem] glass p-4 flex items-center justify-center overflow-hidden shrink-0 shadow-xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-700">
          {airdrop.logoUrl ? (
            <img src={airdrop.logoUrl} alt={airdrop.title} className="w-full h-full object-cover" />
          ) : (
            <Gift className="w-8 h-8 text-pink-500/50" />
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-display font-medium text-slate-900 dark:text-white leading-tight italic group-hover:text-pink-500 transition-colors line-clamp-2">
            {airdrop.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 glass border border-white/5 rounded-md">V_PROTCOL</span>
            <div className="w-1 h-1 bg-pink-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 mb-10">
        <p className={cn(
          "text-sm text-slate-500 font-medium leading-relaxed",
          !showMore && isLong ? 'line-clamp-3' : ''
        )}>
          {airdrop.description}
        </p>
        {isLong && (
          <button 
            onClick={() => setShowMore(!showMore)}
            className="mt-4 text-[10px] font-bold text-pink-500 uppercase tracking-widest hover:underline"
          >
            {showMore ? 'Thu gọn' : 'Xem chi tiết'}
          </button>
        )}
      </div>
      
      <a 
        href={airdrop.projectUrl} 
        target="_blank" 
        rel="noreferrer"
        className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-pink-500/10 group/btn"
      >
        Tham gia ngay
        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
      </a>
    </motion.div>
  );
};

export default function AirdropPage() {
  const [airdrops, setAirdrops] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'airdrops'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAirdrops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-24 space-y-24">
      <OfflineGuard message="Cần kết nối mạng để đồng bộ hóa các chương trình tặng thưởng.">
        <header className="space-y-8 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 glass rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Giao thức phần thưởng</span>
          </motion.div>
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-6xl md:text-8xl font-display font-medium tracking-tight italic leading-none text-gradient"
            >
              Hệ thống <span className="text-pink-500">Airdrop.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-slate-500 font-medium leading-relaxed"
            >
              Tham gia các chương trình tặng thưởng tiềm năng được tinh tuyển bởi hệ sinh thái BMass.
            </motion.p>
          </div>
        </header>
      
        {airdrops.length === 0 ? (
          <div className="pt-12">
            <NoData 
              message="Đang chờ dữ liệu" 
              description="Hệ thống đang sàng lọc các dự án tặng thưởng tiềm năng nhất. Hãy quay lại sau."
              icon={Gift}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {airdrops.map((airdrop, index) => (
              <AirdropCard key={airdrop.id} airdrop={airdrop} index={index} />
            ))}
          </div>
        )}
      </OfflineGuard>
    </div>
  );
}

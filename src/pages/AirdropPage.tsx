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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-8 flex flex-col h-full hover:bg-white/[0.05] transition-all"
    >
      <div className="flex items-center gap-6 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {airdrop.logoUrl ? (
            <img src={airdrop.logoUrl} alt={airdrop.title} className="w-full h-full object-cover" />
          ) : (
            <Gift className="w-6 h-6 text-slate-500" />
          )}
        </div>
        <h3 className="text-xl font-medium text-white tracking-tight leading-tight uppercase line-clamp-2">
          {airdrop.title}
        </h3>
      </div>
      
      <div className="flex-1 space-y-4">
        <p className={cn(
          "text-sm text-slate-400 leading-relaxed",
          !showMore && isLong ? 'line-clamp-3' : ''
        )}>
          {airdrop.description}
        </p>
        {isLong && (
          <button 
            onClick={() => setShowMore(!showMore)}
            className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
          >
            {showMore ? 'Thu gọn' : 'Chi tiết'}
          </button>
        )}
      </div>
      
      <a 
        href={airdrop.projectUrl} 
        target="_blank" 
        rel="noreferrer"
        className="mt-10 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
      >
        Tham gia ngay <ArrowRight className="w-4 h-4" />
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
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
      <div className="relative z-10">
      <OfflineGuard message="Cần kết nối mạng để đồng bộ hóa các chương trình tặng thưởng.">
        <header className="flex flex-col gap-6 mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter uppercase"
          >
            Hệ thống phần thưởng
          </motion.h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
            Cổng tương tác chuyên biệt. Khai thác sức mạnh mạng lưới và gia tăng giá trị tài sản thông qua những cơ chế tặng thưởng được xác thực.
          </p>
        </header>
      
        {airdrops.length === 0 ? (
          <NoData 
            message="Chúng tôi đang săn tìm các phần thưởng hấp dẫn nhất dành cho bạn." 
            description="Vui lòng quay lại sau ít phút."
            icon={Gift}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {airdrops.map((airdrop, index) => (
              <AirdropCard key={airdrop.id} airdrop={airdrop} index={index} />
            ))}
          </div>
        )}
      </OfflineGuard>
      </div>
    </div>
  );
}

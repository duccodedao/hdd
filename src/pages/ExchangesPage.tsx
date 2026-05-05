import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { OfflineGuard } from '../components/OfflineGuard';

import NoData from '../components/ui/NoData';

const ExchangeCard = ({ exchange, index }: { exchange: any, index: number }) => {
  const [showMore, setShowMore] = useState(false);
  const isLong = exchange.description.length > 150;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card flex flex-col h-full overflow-hidden hover:bg-white/[0.05] transition-all"
    >
      <div className="p-8 flex flex-col h-full gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {exchange.logoUrl ? (
              <img src={exchange.logoUrl} alt={exchange.title} className="w-full h-full object-cover" />
            ) : (
              <LineChart className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-medium text-white truncate uppercase tracking-tight leading-tight">{exchange.title}</h3>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Verify Partner</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <p className={`text-slate-400 text-sm leading-relaxed ${!showMore && isLong ? 'line-clamp-3' : ''}`}>
            {exchange.description}
          </p>
          {isLong && (
            <button 
              onClick={() => setShowMore(!showMore)}
              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
            >
              {showMore ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>

        <a 
          href={exchange.affiliateUrl} 
          target="_blank" 
          rel="noreferrer"
          className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 mt-6"
        >
          Tham gia
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
};

export default function ExchangesPage() {
  const [exchanges, setExchanges] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'exchanges'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExchanges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
     <OfflineGuard message="Dữ liệu các sàn giao dịch cần kết nối Internet để cập nhật tỷ giá và trạng thái dự án.">
      <div className="flex flex-col gap-6 mb-16">
        <motion.h1 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter uppercase"
        >
          Giao dịch đối tác
        </motion.h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
          Danh sách các nền tảng giao dịch đầu ngành được đảm bảo và khuyến nghị cấu hình tối ưu.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {exchanges.length === 0 ? (
          <NoData 
            message="Hệ thống đang lựa chọn các sàn giao dịch tốt nhất để giới thiệu đến bạn." 
            description="Vui lòng quay lại sau ít phút." 
            icon={LineChart}
          />
        ) : (
          exchanges.map((exchange, index) => (
            <ExchangeCard key={exchange.id} exchange={exchange} index={index} />
          ))
        )}
      </div>
     </OfflineGuard>
    </div>
  );
}

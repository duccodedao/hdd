import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { OfflineGuard } from '../components/OfflineGuard';

import NoData from '../components/ui/NoData';

const ExchangeCard = ({ exchange, index }: { exchange: any, index: number }) => {
  const [showMore, setShowMore] = useState(false);
  const isLong = exchange.description.length > 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {exchange.logoUrl ? (
            <img src={exchange.logoUrl} alt={exchange.title} className="w-full h-full object-cover" />
          ) : (
            <LineChart className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1 group-hover:text-emerald-500 transition-colors">{exchange.title}</h3>
        </div>
      </div>
      
      <div className="flex-1 mb-6">
        <p className={`text-slate-600 dark:text-slate-400 text-sm leading-relaxed ${!showMore && isLong ? 'line-clamp-3' : ''}`}>
          {exchange.description}
        </p>
        {isLong && (
          <button 
            onClick={() => setShowMore(!showMore)}
            className="mt-2 text-[10px] font-medium text-emerald-600  tracking-normal hover:underline"
          >
            {showMore ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
      </div>
      
      <a 
        href={exchange.affiliateUrl} 
        target="_blank" 
        rel="noreferrer"
        className="w-full py-3 px-4 bg-slate-50 dark:bg-white/5 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 group/btn"
      >
        Đăng ký tài khoản ngay
        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
      </a>
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
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 pt-4 px-4 lg:px-8">
     <OfflineGuard message="Dữ liệu các sàn giao dịch cần kết nối Internet để cập nhật tỷ giá và trạng thái dự án.">
      <div className="flex flex-col gap-3 md:gap-4 mb-12">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex items-center gap-4"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20">
            <LineChart className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-4xl md:text-7xl font-display font-medium text-slate-900 dark:text-white tracking-tight italic leading-none">
              Sàn Giao Dịch
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-medium  tracking-[0.2em] text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg">
                Đối tác đã xác minh
              </span>
              <span className="text-[10px] font-medium  tracking-[0.2em] text-slate-400">
                Liên kết chính thức
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
          Danh sách các sàn giao dịch uy tín và đối tác chiến lược được BMASS tin tưởng và khuyên dùng.
        </motion.p>
      </div>
      
      {exchanges.length === 0 ? (
        <NoData 
          message="Đang cập nhật sàn giao dịch" 
          description="Các sàn giao dịch hàng đầu sẽ sớm được kết nối để phục vụ cộng đồng bmassHD."
          icon={LineChart}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {exchanges.map((exchange, index) => (
            <ExchangeCard key={exchange.id} exchange={exchange} index={index} />
          ))}
        </div>
      )}
     </OfflineGuard>
    </div>
  );
}

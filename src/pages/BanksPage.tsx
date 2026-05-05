import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Landmark, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { OfflineGuard } from '../components/OfflineGuard';

import NoData from '../components/ui/NoData';

const BankCard = ({ bank, index }: { bank: any, index: number }) => {
  const [showMore, setShowMore] = useState(false);
  const isLong = bank.description.length > 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card flex flex-col h-full hover:bg-white/[0.05] transition-all"
    >
      <div className="p-8 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {bank.logoUrl ? (
              <img src={bank.logoUrl} alt={bank.title} className="w-full h-full object-cover" />
            ) : (
              <Landmark className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <h3 className="text-xl font-medium text-white tracking-tight leading-tight uppercase">{bank.title}</h3>
        </div>
        
        <div className="flex-1 space-y-4">
          <p className={`text-slate-400 text-sm leading-relaxed ${!showMore && isLong ? 'line-clamp-3' : ''}`}>
            {bank.description}
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
          href={bank.affiliateUrl} 
          target="_blank" 
          rel="noreferrer"
          className="mt-8 h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
        >
          Mở tài khoản <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
};

export default function BanksPage() {
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'banks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
      <OfflineGuard message="Danh sách Ngân hàng đối tác cần kết nối mạng để hiển thị các ưu đãi mới nhất.">
      <div className="flex flex-col gap-6 mb-16">
        <motion.h1 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter uppercase"
        >
          Ngân hàng đối tác
        </motion.h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
          Mở tài khoản và quản lý tài chính với các đối tác ngân hàng uy tín hàng đầu.
        </p>
      </div>
      
      {banks.length === 0 ? (
        <NoData 
          message="Hệ thống đang lựa chọn các ngân hàng uy tín nhất để giới thiệu đến bạn." 
          description="Vui lòng quay lại sau ít phút."
          icon={Landmark}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banks.map((bank, index) => (
            <BankCard key={bank.id} bank={bank} index={index} />
          ))}
        </div>
      )}
     </OfflineGuard>
    </div>
  );
}

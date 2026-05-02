import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Landmark, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

import NoData from '../components/ui/NoData';

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
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 pt-4 px-4 lg:px-8">
      <div className="flex flex-col gap-1 md:gap-2">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 md:gap-3"
        >
          <Landmark className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
          Ngân hàng đối tác
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 text-sm md:text-lg"
        >
          Mở thẻ và tài khoản ngân hàng nhanh chóng
        </motion.p>
      </div>
      
      {banks.length === 0 ? (
        <NoData 
          message="Đang cập nhật đối tác" 
          description="Chúng tôi đang đàm phán với nhiều ngân hàng để mang lại quyền lợi tốt nhất cho bạn."
          icon={Landmark}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banks.map((bank, index) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {bank.logoUrl ? (
                    <img src={bank.logoUrl} alt={bank.title} className="w-full h-full object-cover" />
                  ) : (
                    <Landmark className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1 group-hover:text-blue-500 transition-colors">{bank.title}</h3>
                </div>
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 flex-1 line-clamp-3">
                {bank.description}
              </p>
              
              <a 
                href={bank.affiliateUrl} 
                target="_blank" 
                rel="noreferrer"
                className="w-full py-3 px-4 bg-slate-50 dark:bg-white/5 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 group/btn"
              >
                Mở tài khoản ngay
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

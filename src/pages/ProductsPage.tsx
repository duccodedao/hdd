import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Product {
  id: string;
  title: string;
  embedUrl: string;
  thumbnail: string;
  createdAt: any;
}

import NoData from '../components/ui/NoData';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 pt-4 px-4 lg:px-8">
      <div className="flex flex-col gap-3 md:gap-4 mb-12">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex items-center gap-4"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-2xl shadow-orange-500/20">
            <ShoppingBag className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-medium text-slate-900 dark:text-white tracking-tight  italic leading-none">
              Sản phẩm
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-medium  tracking-[0.2em] text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-lg">
                Ưu đãi độc quyền
              </span>
              <span className="text-[10px] font-medium  tracking-[0.2em] text-slate-400">
                Cửa hàng cao cấp
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
          Mua sắm và khám phá những sản phẩm công nghệ, phụ kiện và ưu đãi độc quyền dành riêng cho cộng đồng BMASS.
        </motion.p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <NoData 
          message="Chưa có sản phẩm" 
          description="Chúng tôi đang lựa chọn các sản phẩm tốt nhất để giới thiệu đến bạn."
          icon={ShoppingBag}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <motion.a
              key={product.id}
              href={product.embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-12 h-12 opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all flex items-center justify-center shadow-xl">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">{product.title}</h3>
                <p className="text-xs text-slate-500 mt-2 mt-auto pt-2 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Mở liên kết mua hàng
                </p>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

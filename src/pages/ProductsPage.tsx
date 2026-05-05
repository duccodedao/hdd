import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ExternalLink, Loader2 } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
      <div className="flex flex-col gap-6 mb-16">
        <motion.h1 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter uppercase"
        >
          Sản phẩm
        </motion.h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
          Mua sắm và khám phá những sản phẩm công nghệ, phụ kiện và ưu đãi độc quyền dành riêng cho cộng đồng.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
              className="glass-card overflow-hidden group flex flex-col hover:bg-white/[0.05] transition-all"
            >
              <div className="aspect-square relative overflow-hidden bg-slate-900 border-b border-white/5">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-800">
                    <ShoppingBag className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                <h3 className="text-lg font-medium text-white uppercase tracking-tight leading-tight line-clamp-2">{product.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Mua ngay</span>
                  <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

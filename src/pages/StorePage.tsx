import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ShoppingBag,
  AlertCircle, Search, Sparkles, FolderOpen, 
  Lock, CheckCircle2, Wallet, RefreshCw,
  ExternalLink, ArrowRight, ShoppingCart
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function StorePage() {
  const { user, userData } = useAuthStore();
  const { maintenanceTabs } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<'all' | 'ai_tools' | 'documents'>('all');
  const [aiTools, setAiTools] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [ownedProducts, setOwnedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    // Fetch AI Tools
    const unsubAi = onSnapshot(collection(db, 'ai_tools'), (snap) => {
      setAiTools(snap.docs.map(doc => ({ id: doc.id, productType: 'ai_tool', ...doc.data() })));
    });

    // Fetch Documents
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => {
      setDocuments(snap.docs.map(doc => ({ id: doc.id, productType: 'document', ...doc.data() })));
    });

    // Fetch Owned Products (from transactions)
    if (user) {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('status', '==', 'completed'));
      const unsubTransactions = onSnapshot(q, (snap) => {
        setOwnedProducts(snap.docs.map(doc => doc.data().productId));
        setLoading(false);
      });
      return () => {
        unsubAi();
        unsubDocs();
        unsubTransactions();
      };
    } else {
        setLoading(false);
        return () => {
            unsubAi();
            unsubDocs();
        };
    }
  }, [user]);

  const allProducts: any[] = [...aiTools, ...documents];

  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || 
      (activeCategory === 'ai_tools' && p.productType === 'ai_tool') ||
      (activeCategory === 'documents' && p.productType === 'document');
    return matchesSearch && matchesCategory;
  });

  const handlePurchase = async (product: any) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để mua hàng!');
      return;
    }

    if ((userData?.balance || 0) < product.price) {
      toast.error('Số dư ví không đủ. Vui lòng nạp tiền!');
      return;
    }

    if (confirm(`Bạn có đồng ý dùng ví điện tử để mua "${product.name}" với giá ${product.price.toLocaleString()}đ không?`)) {
      setIsPurchasing(product.id);
      try {
        const resp = await fetch('/api/wallet/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            userEmail: user.email,
            userName: userData?.displayName || 'User',
            productId: product.id,
            productName: product.name,
            amount: product.price
          })
        });

        const data = await resp.json();
        if (resp.ok) {
          toast.success('Mua sản phẩm thành công!');
        } else {
          toast.error(data.error || 'Lỗi giao dịch');
        }
      } catch (err) {
        toast.error('Lỗi kết nối máy chủ');
      } finally {
        setIsPurchasing(null);
      }
    }
  };

  // feature maintenance check
  if (maintenanceTabs?.store) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 h-[calc(100vh-80px)]">
         <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-white/10">
           <AlertCircle className="w-8 h-8 opacity-50" />
         </div>
         <h2 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-2">Đang bảo trì</h2>
         <p className="max-w-md mx-auto text-xs text-slate-500 dark:text-zinc-500 font-medium leading-relaxed">Cửa hàng hiện đang được hệ thống nâng cấp. Vui lòng quay lại sau ít phút hoặc theo dõi bảng tin kỹ thuật.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      {/* Hero Section */}
            {/* Clean Hero Layout */}
      <div className="relative bg-white dark:bg-zinc-950 p-8 sm:p-12 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="relative z-10 max-w-xl space-y-5">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest">
             <Sparkles className="w-3 h-3" /> Digital Store
           </div>
           <h1 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-[1.1]">
             Cửa hàng <span className="text-indigo-600 dark:text-indigo-400 italic">BMASS.</span>
           </h1>
           <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 leading-relaxed max-w-md">
             Sở hữu các công cụ AI cao cấp và kho tài liệu chuyên nghiệp. Mua nhanh chóng qua ví điện tử nội bộ.
           </p>

           <div className="pt-4 flex items-center gap-4">
             <div className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-white/5 shadow-inner">
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                  <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Số dư ví của bạn</p>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{(userData?.balance || 0).toLocaleString()}đ</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/wallet'}
                  className="ml-2 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center text-slate-400 hover:text-indigo-600"
                  title="Nạp tiền"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
             </div>
           </div>
         </div>
         
         {/* Decorative Element */}
         <div className="hidden md:flex relative z-10 mr-8 lg:mr-16">
            <div className="w-48 h-48 bg-indigo-50 dark:bg-indigo-500/5 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-950 shadow-2xl relative">
              <ShoppingBag className="w-20 h-20 text-indigo-600 dark:text-indigo-400 translate-x-1" />
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Đã duyệt
              </div>
              <div className="absolute -bottom-2 -left-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 rounded-xl shadow-lg text-[9px] font-black uppercase tracking-widest">
                #Premium
              </div>
            </div>
         </div>
         
         {/* Background flares */}
         <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-950 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 animate-pulse space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl" />
              <div className="h-4 w-3/4 bg-slate-100 dark:bg-white/5 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded" />
              <div className="pt-4 flex gap-2">
                <div className="h-10 flex-1 bg-slate-100 dark:bg-white/5 rounded-xl" />
              </div>
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-24 text-center">
             <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-4 shadow-inner">
                <ShoppingBag size={32} />
             </div>
             <h3 className="text-lg font-black text-slate-800 dark:text-zinc-200 mb-2">Đang Cập Nhật Cửa Hàng</h3>
             <p className="text-slate-500 dark:text-zinc-500 font-medium max-w-sm mx-auto">Các sản phẩm giải pháp phần mềm sẽ được setup và ra mắt trong thời gian sắp tới.</p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const isOwned = ownedProducts.includes(product.id);
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-white dark:bg-zinc-950 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    {product.logoUrl ? (
                      <div className="w-16 h-16 rounded-2xl border border-slate-100 dark:border-white/10 p-2 bg-slate-50 dark:bg-zinc-900 shadow-inner group-hover:scale-105 transition-transform">
                        <img src={product.logoUrl} alt={product.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        {product.productType === 'ai_tool' ? <Sparkles size={32} /> : <FolderOpen size={32} />}
                      </div>
                    )}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                        product.productType === 'ai_tool' ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
                      }`}>
                        {product.productType === 'ai_tool' ? 'AI Tool' : 'Văn bản'}
                      </span>
                      {isOwned && (
                         <span className="px-2 py-1 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md shadow-emerald-500/20">
                           <CheckCircle2 size={10} /> Đã sở hữu
                         </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                      {product.description || 'Chưa có mô tả chi tiết cho sản phẩm hỗ trợ này.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Giá sở hữu</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                      {product.price === 0 ? 'Miễn phí' : `${product.price.toLocaleString()}đ`}
                    </span>
                  </div>

                  {isOwned ? (
                    <button 
                      onClick={() => window.location.href = product.productType === 'ai_tool' ? '/ai-tools' : '/utilities/kho-van-ban'}
                      className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-bold text-xs"
                    >
                      Sử dụng ngay
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePurchase(product)}
                      disabled={isPurchasing === product.id}
                      className="flex items-center gap-2 bg-indigo-600 text-white p-3.5 rounded-2xl font-bold text-[11px] shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isPurchasing === product.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Mua bằng ví
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

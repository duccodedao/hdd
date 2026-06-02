import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sparkles, ExternalLink, Search, X, Lock } from 'lucide-react';
import { PaymentDialog } from '../components/payment/PaymentDialog';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function AiTools() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<any | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ isOpen: boolean; item: any | null }>({
    isOpen: false,
    item: null
  });
  const { user, isAdmin, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ai_tools'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in-memory instead of firestore query ordering
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setTools(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching AI tools:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTools = tools.filter(tool => 
    tool.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAccess = (tool: any) => {
    if (tool.price > 0 && !isAdmin && !isSuperAdmin) {
      const checkPaid = async () => {
        try {
          const q = query(
            collection(db, 'invoices'), 
            where('userId', '==', user?.uid),
            where('status', '==', 'paid')
          );
          const snap = await getDocs(q);
          const hasPaid = snap.docs.some(doc => {
            const data = doc.data();
            return data.items?.some((i: any) => i.itemId === tool.id);
          });

          if (!hasPaid) {
            setPaymentDialog({ isOpen: true, item: tool });
            return;
          }

          window.open(tool.url, '_blank', 'noopener,noreferrer');
        } catch (e) {
          window.open(tool.url, '_blank', 'noopener,noreferrer');
        }
      };
      checkPaid();
      return;
    }
    window.open(tool.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-[1800px] mx-auto py-8 lg:py-12 space-y-8 animate-fade-in no-scrollbar px-4 bg-transparent min-h-screen">
      <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">AI Tools</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Danh sách các công cụ AI hỗ trợ công việc do ban quản trị chọn lọc.</p>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Danh sách công cụ ({filteredTools.length})</h2>
            <div className="relative w-full sm:w-64">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm công cụ..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
               />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0 table-fixed">
              <colgroup>
                <col className="w-16 shrink-0" />
                <col className="min-w-0" />
                <col className="w-28 sm:w-36 shrink-0" />
              </colgroup>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                 {filteredTools.map((tool) => (
                   <tr key={tool.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    {/* Fixed Logo Column */}
                    <td className="p-4 w-16 sticky left-0 bg-white dark:bg-zinc-950 z-10 border-r border-slate-100 dark:border-white/5 overflow-hidden shrink-0">
                      <div 
                        onClick={() => handleAccess(tool)}
                        className="block hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      >
                        {tool.logoUrl ? (
                          <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden shrink-0">
                            <img src={tool.logoUrl} alt={tool.name} className="w-full h-full object-cover rounded-lg" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* AI Title Column */}
                    <td className="p-4 overflow-hidden min-w-0">
                       <div className="flex flex-col justify-center min-w-0 overflow-hidden">
                         <div className="flex items-center min-w-0 gap-2">
                           <div 
                             onClick={() => handleAccess(tool)}
                             className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group cursor-pointer text-sm sm:text-base max-w-full min-w-0"
                           >
                             <span className="truncate block font-bold leading-tight">{tool.name}</span>
                             <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 animate-fade-in" />
                           </div>
                           {tool.price > 0 && (
                             <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                               <Lock size={10} className="text-indigo-500" />
                               <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                 {tool.salePrice ? tool.salePrice.toLocaleString() : tool.price.toLocaleString()}đ
                               </span>
                             </div>
                           )}
                         </div>
                         {tool.description && (
                           <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed max-w-4xl text-left">
                             {tool.description}
                           </p>
                         )}
                       </div>
                    </td>
 
                    {/* AI Description Button Column */}
                    <td className="p-4 text-right w-28 sm:w-36 shrink-0 overflow-hidden">
                       <button 
                         onClick={() => setSelectedTool(tool)}
                         className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95 transition-all rounded-xl border border-indigo-100 dark:border-indigo-500/20 cursor-pointer whitespace-nowrap"
                       >
                         Chi tiết
                       </button>
                    </td>
                  </tr>
                ))}
                {filteredTools.length === 0 && !loading && (
                   <tr>
                     <td colSpan={3} className="p-8 text-center text-slate-500">Không tìm thấy công cụ nào!</td>
                   </tr>
                )}
                {loading && (
                   <tr>
                     <td colSpan={3} className="p-8 text-center text-slate-500">Đang tải danh sách...</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Modern Pop-up Modal */}
      {selectedTool && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden flex flex-col gap-4">
            <button 
              onClick={() => setSelectedTool(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mt-2">
              {selectedTool.logoUrl ? (
                <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-zinc-900 shadow-md overflow-hidden shrink-0">
                  <img src={selectedTool.logoUrl} alt={selectedTool.name} className="w-full h-full object-cover rounded-xl" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20 animate-pulse">
                  <Sparkles className="w-8 h-8 text-indigo-500" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedTool.name}</h3>
                <p className="text-xs text-indigo-500 font-bold mt-1">Công cụ AI tuyển chọn</p>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/5 w-full my-1" />

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Mô tả chi tiết:</span>
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 max-h-60 overflow-y-auto no-scrollbar whitespace-pre-wrap">
                {selectedTool.description || "Không có mô tả chi tiết cho công cụ này."}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => setSelectedTool(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition"
              >
                Đóng
              </button>
              <button 
                onClick={() => {
                  const tool = selectedTool;
                  setSelectedTool(null);
                  handleAccess(tool);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 text-center"
              >
                Mở AI <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentDialog 
        isOpen={paymentDialog.isOpen}
        onClose={() => setPaymentDialog({ isOpen: false, item: null })}
        item={paymentDialog.item}
        onPaid={() => {
          if (paymentDialog.item) {
            window.open(paymentDialog.item.url, '_blank', 'noopener,noreferrer');
          }
        }}
      />
    </div>
  );
}

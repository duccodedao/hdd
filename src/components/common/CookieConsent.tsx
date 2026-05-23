import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Check, Search, Settings } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [preferences, setPreferences] = useState({
    necessary: true, // always true
    analytics: true,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('bmass_cookie_consent');
    if (!consent) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('bmass_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now()
    }));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem('bmass_cookie_consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now()
    }));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('bmass_cookie_consent', JSON.stringify({
      ...preferences,
      timestamp: Date.now()
    }));
    setIsVisible(false);
    setShowSettings(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none"
      >
        <div className="max-w-5xl mx-auto pointer-events-auto">
          {!showSettings ? (
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col md:flex-row gap-6 md:items-center relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 -left-20 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

               <div className="flex-1 space-y-2 relative">
                 <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                   <Shield className="w-5 h-5" />
                   <h3 className="font-bold text-slate-900 dark:text-white">Quyền riêng tư thẻ Cookies</h3>
                 </div>
                 <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                   Chúng tôi sử dụng cookies để nâng cao trải nghiệm của bạn, phân tích lưu lượng truy cập và phục vụ mục đích bảo mật. 
                   Bạn có thể tùy chỉnh hoặc chấp nhận tất cả. Xem thêm <a href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">Chính sách bảo mật</a>.
                 </p>
               </div>

               <div className="flex flex-wrap md:flex-nowrap items-center gap-3 relative">
                 <button 
                   onClick={() => setShowSettings(true)}
                   className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors border border-slate-200 dark:border-white/10 whitespace-nowrap"
                 >
                   Tùy chỉnh
                 </button>
                 <button 
                   onClick={handleRejectAll}
                   className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors whitespace-nowrap"
                 >
                   Từ chối
                 </button>
                 <button 
                   onClick={handleAcceptAll}
                   className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-colors shadow-sm whitespace-nowrap whitespace-nowrap"
                 >
                   Chấp nhận tất cả
                 </button>
               </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6  relative">
              <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                     <Settings className="w-5 h-5 text-indigo-500" />
                     Tùy chỉnh Cookies
                   </h3>
                   <p className="text-xs text-slate-500 mt-1">Lựa chọn loại cookie bạn cho phép lưu trữ.</p>
                 </div>
                 <button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors">
                   <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  <div className="pr-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Cơ bản (Bắt buộc)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cookie cần thiết để hệ thống hoạt động chính xác (đăng nhập, bảo mật, lưu trạng thái).</p>
                  </div>
                  <div className="flex-shrink-0 w-10 h-6 bg-indigo-500 rounded-full relative opacity-50 cursor-not-allowed">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>

                <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="pr-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Phân tích biểu đồ</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Giúp chúng tôi đo lường lượng truy cập và cải thiện ứng dụng dựa vào tương tác.</p>
                  </div>
                  <button 
                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                    className={`flex-shrink-0 w-10 h-6 rounded-full relative transition-colors ${preferences.analytics ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences.analytics ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="pr-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Tiếp thị & Quảng cáo</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cookie dùng để nhận diện bạn để phân phối nội dung quảng cáo (Chúng tôi hiện chưa áp dụng).</p>
                  </div>
                  <button 
                    onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                    className={`flex-shrink-0 w-10 h-6 rounded-full relative transition-colors ${preferences.marketing ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences.marketing ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                 <button 
                   onClick={handleRejectAll}
                   className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                 >
                   Từ chối tất cả
                 </button>
                 <button 
                   onClick={handleSavePreferences}
                   className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-colors shadow-xs"
                 >
                   Lưu tùy chọn
                 </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

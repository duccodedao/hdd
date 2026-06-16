import { useEffect } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PwaBanner from '../pwa/PwaBanner';
import { AlertCircle, ArrowUpRight, ChevronsRight } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import NotificationMarquee from './NotificationMarquee';
import WelcomePopup from './WelcomePopup';
import AffiliateBanner from './AffiliateBanner';
import LoadingBar from './LoadingBar';

export default function MainLayout() {
  const { sidebarOpen, toggleSidebar, aiActive, quotaExceeded, setQuotaExceeded, setAffiliateAds } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'affiliate_ads'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.active) {
            setAffiliateAds(data);
        } else {
            setAffiliateAds(null);
        }
      }
    });

    return () => unsub();
  }, [setAffiliateAds]);

  return (
    <div className="flex h-screen overflow-hidden relative font-sans bg-transparent">
      <LoadingBar />
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && !aiActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {!aiActive && (
        <Sidebar className={cn(
          "fixed inset-y-0 left-0 z-50 transform lg:static transition-all duration-500 w-64 lg:w-60 h-full shrink-0",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden'
        )} />
      )}

      {!sidebarOpen && !aiActive && (
        <button
          onClick={toggleSidebar}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2 pl-1 pr-3 bg-slate-800/80 text-white rounded-r-full shadow-lg animate-pulse hover:bg-slate-700 transition-colors"
        >
          <ChevronsRight size={24} />
        </button>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 z-10 h-screen">
        
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent">
          {!aiActive && (
            <>
              {quotaExceeded && (
                <div className="bg-rose-50 border-b border-rose-200 text-rose-900 dark:bg-rose-950/45 dark:border-rose-900 dark:text-rose-200 px-4 py-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-50 animate-fade-in shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 select-none" />
                    <div className="flex-1">
                      <span className="font-bold underline uppercase tracking-wider text-[9px] bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 rounded mr-2">Cảnh báo: Hết Quota Firestore</span>
                      Hạn mức truy vấn Firestore miễn phí (Free Spark Plan) hôm nay của dự án đã vượt quá giới hạn. Dữ liệu sẽ tự động phục hồi khi reset bộ đếm vào ngày mai. Bạn có thể mở khóa ngay lập tức bằng việc nâng cấp ví thanh toán.
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <a 
                      href="https://console.firebase.google.com/project/sonlyhongduc-ca6d6/firestore/databases/main/data?openUpgradeDialog=true" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 hover:underline hover:opacity-90 text-[11px]"
                    >
                      Mở bảng nâng cấp <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                    <a 
                      href="https://firebase.google.com/pricing#cloud-firestore" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-500 dark:text-zinc-400 hover:underline hover:opacity-90 text-[11px]"
                    >
                      Giới hạn Spark Plan <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
              <Topbar />
              <NotificationMarquee />
              <WelcomePopup />
              <AffiliateBanner />
            </>
          )}
          
          <main className={cn(
            "flex-1 overflow-x-hidden relative z-0 no-scrollbar",
            aiActive ? "overflow-hidden" : "overflow-y-auto"
          )}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname.startsWith('/admin') ? '/admin-portal' : location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "min-h-full flex flex-col",
                    !aiActive && "pt-4 pb-12"
                )}
              >
                <div className={cn(
                    "flex-1 max-w-[1920px] mx-auto w-full",
                    !aiActive ? "px-4 md:px-8 lg:px-12" : "px-0"
                )}>
                  <Outlet />
                </div>
                
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <PwaBanner />
    </div>
  );
}

import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NoticeBanner from './NoticeBanner';

export default function MainLayout() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const askForPermissions = async () => {
      const hasAsked = localStorage.getItem('perm_initial_asked');
      if (hasAsked) return;
      setTimeout(async () => {
        try {
          if ('Notification' in window && Notification.permission === 'default') {
             await Notification.requestPermission();
          }
          localStorage.setItem('perm_initial_asked', 'true');
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    };
    askForPermissions();
  }, [user]);

  return (
    <div className="flex h-screen overflow-hidden relative font-sans bg-[#0c0c12]">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar className={cn(
        "fixed inset-y-0 left-0 z-50 transform lg:static lg:translate-x-0 transition-all duration-500 w-72 h-screen border-r border-white/5",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 z-10 h-screen">
        <NoticeBanner />
        
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent">
          <Topbar />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto relative z-0 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

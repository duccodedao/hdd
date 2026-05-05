import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

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
    <div className="flex h-screen bg-[#fafafa] dark:bg-[#0a0a0b] overflow-hidden relative font-sans selection:bg-blue-500/10">
      
      {/* Immersive Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full animate-blob" style={{ animationDelay: '5s' }} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar className={cn(
        "fixed inset-y-0 left-0 z-50 transform lg:static lg:translate-x-0 transition-transform duration-700 ease-[0.22, 1, 0.36, 1] w-[260px]",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 z-10">
        <Topbar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

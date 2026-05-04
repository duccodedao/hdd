import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
export default function MainLayout() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const askForPermissions = async () => {
      if (!user) return;
      
      const hasAsked = localStorage.getItem('perm_initial_asked');
      if (hasAsked) return;

      setTimeout(async () => {
        try {
          if ('Notification' in window && Notification.permission === 'default') {
             await Notification.requestPermission();
          }
          localStorage.setItem('perm_initial_asked', 'true');
        } catch (e) {
          console.error("Initial permission request failed", e);
        }
      }, 5000);
    };

    askForPermissions();
  }, [user]);

  return (
    <div className="flex h-screen bg-[#fcfdfe] dark:bg-[#050608] overflow-hidden relative font-sans">
      
      {/* Immersive Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[#fafafa] dark:bg-[#050608]">
        <div className="absolute top-0 w-full h-[50vh] bg-gradient-to-b from-slate-100/50 to-transparent dark:from-slate-900/20 dark:to-transparent" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:static transition-transform duration-500 w-[280px] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 z-10">
        <Topbar />
        
        <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 lg:p-8 no-scrollbar">
          <AnimatePresence>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1700px] mx-auto min-h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

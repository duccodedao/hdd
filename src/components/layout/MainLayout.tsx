import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OfflineIndicator from '../ui/OfflineIndicator';

export default function MainLayout() {
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#050508] overflow-hidden relative">
      <OfflineIndicator />
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:static transition-transform duration-300 w-72 bg-white/80 dark:bg-white/5 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 z-10">
        <Topbar />
        
        <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-w-[1700px] mx-auto h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

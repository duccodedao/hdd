import { useEffect } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
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

  return (
    <div className="flex h-screen overflow-hidden relative font-sans bg-slate-50 dark:bg-zinc-950">
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-indigo-500/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 dark:bg-purple-500/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar className={cn(
        "fixed inset-y-0 left-0 z-50 transform lg:static transition-all duration-500 w-64 h-full shrink-0",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:pointer-events-none lg:overflow-hidden'
      )} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 z-10 h-screen">
        
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent">
          <Topbar />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto relative z-0 no-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="min-h-full flex flex-col pt-4 pb-12"
              >
                <div className="flex-1 px-4 md:px-8 lg:px-12 max-w-[1920px] mx-auto w-full">
                  <Outlet />
                </div>
                
                <footer className="mt-20 py-12 text-center flex flex-col items-center justify-center gap-4 px-6 opacity-40 hover:opacity-100 transition-opacity duration-700">
                  <div className="flex justify-center gap-8 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                    <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Legal</Link>
                    <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-zinc-600 font-medium">© 2026 Nucleus OS. Engineered for privacy.</p>
                </footer>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

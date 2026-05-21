import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Grid, UserCircle, Shield, ChevronDown, Wrench, Files,
  Zap, Info, Laptop, FolderOpen, Scan, FileImage, FileText, Box, ChevronRight, AppWindow
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import AppLogo from '../ui/AppLogo';
import { db } from '../../lib/firebase';

const subUtilities = [
  { id: 'all', name: 'Tất cả tiện ích', path: '/utilities', icon: Grid },
  { id: 'file-manager', name: 'Quản Lý File Cá Nhân', path: '/utilities/file-manager', icon: Laptop, maintenanceKey: 'utility_file-manager' },
  { id: 'kho-van-ban', name: 'Kho Văn Bản', path: '/utilities/kho-van-ban', icon: FolderOpen, maintenanceKey: 'utility_kho-van-ban' },
  { id: 'ai-scanner', name: 'Quét Văn Bản AI', path: '/utilities/ai-scanner', icon: Scan, maintenanceKey: 'utility_ai-scanner' },
  { id: 'image-to-pdf', name: 'Ảnh sang PDF', path: '/utilities/image-to-pdf', icon: FileImage, maintenanceKey: 'utility_image-to-pdf' },
  { id: 'pdf-to-word', name: 'PDF sang Word', path: '/utilities/pdf-to-word', icon: FileText, maintenanceKey: 'utility_pdf-to-word' },
];

export default function Sidebar({ className }: { className?: string }) {
  const { isAdmin, userData } = useAuthStore();
  const { setSidebarOpen, maintenanceTabs } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Tổng quan', 'Hệ thống']);
  const [utilitiesExpanded, setUtilitiesExpanded] = useState(false);
  const [dynamicUtils, setDynamicUtils] = useState<any[]>([]);
  const [systemTools, setSystemTools] = useState<any>({});

  useEffect(() => {
    import('firebase/firestore').then(({ collection, doc, onSnapshot }) => {
      const unsubUtils = onSnapshot(collection(db, 'utilities'), (snap) => {
        setDynamicUtils(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((u: any) => !u.hidden || isAdmin));
      });
      const unsubPerms = onSnapshot(doc(db, 'settings', 'tool_permissions'), (docSnap) => {
        if (docSnap.exists()) {
          setSystemTools(docSnap.data());
        }
      });
      return () => {
        unsubUtils();
        unsubPerms();
      };
    });
  }, [isAdmin]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  useEffect(() => {
    if (location.pathname.startsWith('/utilities')) {
      setUtilitiesExpanded(true);
    }
  }, [location.pathname]);

  const allSubUtilities = [
    ...subUtilities,
    ...dynamicUtils.map(u => ({
      id: u.id,
      name: u.title,
      path: `/utilities/${u.id}`,
      icon: Box, // Default icon for dynamic
      maintenanceKey: `utility_${u.id}`,
      internalOnly: u.internalOnly || false
    }))
  ];

  return (
    <aside className={cn("flex flex-col relative z-20 w-64 bg-slate-50/90 dark:bg-zinc-950/90 lg:bg-slate-50/20 lg:dark:bg-zinc-950/20 backdrop-blur-xl border-r border-slate-200 dark:border-white/5", className)}>
      <div className="p-8 flex items-center gap-4">
        <AppLogo className="w-8 h-8" />
        <div className="flex flex-col">
          <h2 className="font-display font-black text-slate-900 dark:text-white text-lg tracking-tighter uppercase italic leading-none">BMASS.</h2>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pt-4 pb-8 no-scrollbar">
        {/* Hệ thống group */}
        <div className="space-y-2">
          <button 
            onClick={() => toggleGroup('Hệ thống')}
            className={cn(
              "flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
              location.pathname.startsWith('/utilities') ? "text-slate-800 dark:text-zinc-200" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-2">
              <span>Hệ thống</span>
            </div>
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", expandedGroups.includes('Hệ thống') && "rotate-180")} />
          </button>
          
          <AnimatePresence initial={false}>
            {expandedGroups.includes('Hệ thống') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden space-y-1"
              >
                {/* Tiện ích Item (with nested sub-utility items) */}
                <div className="space-y-1">
                  <div 
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md transition-all text-[13px] font-medium cursor-pointer group",
                      location.pathname.startsWith('/utilities') 
                        ? "text-blue-700 bg-blue-50/50 dark:text-white dark:bg-white/5 shadow-sm" 
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.02]"
                    )}
                    onClick={() => {
                      navigate('/utilities');
                      setUtilitiesExpanded(!utilitiesExpanded);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className={cn("w-4 h-4 transition-colors duration-300", location.pathname.startsWith('/utilities') ? "text-blue-600 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-600")} />
                      <span className={cn(location.pathname.startsWith('/utilities') && "font-semibold")}>Tiện ích</span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Stop navigation, just toggle expand
                        setUtilitiesExpanded(!utilitiesExpanded);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-all"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", utilitiesExpanded && "rotate-180")} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {utilitiesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden pl-4 space-y-1 border-l border-slate-200 dark:border-white/5 ml-5 mt-1"
                      >
                        {allSubUtilities.map((sub: any) => {
                          const isSubActive = sub.id === 'all' 
                            ? location.pathname === '/utilities'
                            : location.pathname === sub.path;
                          const isMaintenance = maintenanceTabs[sub.maintenanceKey];
                          const isInternal = systemTools[sub.id]?.internal || sub.internalOnly || false;
                          
                          return (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all text-xs font-medium group text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200",
                                isSubActive && "text-blue-600 dark:text-white bg-blue-50/30 dark:bg-white/5 font-semibold"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <sub.icon className={cn("w-3.5 h-3.5 shrink-0", isSubActive ? "text-blue-500 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400")} />
                                <span className="truncate">{sub.name}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isInternal && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse" title="Nội bộ" />
                                )}
                                {isMaintenance && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.7)] animate-pulse" title="Đang bảo trì" />
                                )}
                              </div>
                            </NavLink>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Ứng dụng Item */}
                <NavLink
                  to="/apps"
                  onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-3 py-2 rounded-md transition-all text-[13px] font-medium group",
                    isActive 
                      ? "text-blue-700 bg-blue-50/50 dark:text-white dark:bg-white/5 shadow-sm" 
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AppWindow className={cn("w-4 h-4 transition-colors duration-300", location.pathname === '/apps' ? "text-blue-600 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-600")} />
                    <span className={cn(location.pathname === '/apps' && "font-semibold")}>Ứng dụng</span>
                  </div>
                </NavLink>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </nav>

      {isAdmin && (
        <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/90 dark:bg-zinc-950/90 lg:bg-transparent shrink-0">
          <NavLink
            to="/admin"
            onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-[11px] font-bold uppercase tracking-widest",
              isActive 
                ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-400/10" 
                : "text-slate-500 dark:text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-400/5"
            )}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Center</span>
          </NavLink>
        </div>
      )}
    </aside>
  );
}

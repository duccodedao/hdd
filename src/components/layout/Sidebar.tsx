import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Grid, UserCircle, Shield, ChevronDown, Wrench, Files
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

const fixedNavGroups = [
  {
    title: 'Tổng quan',
    items: [
      { name: 'Tổng quan', path: '/dashboard', icon: Home, maintenanceKey: 'dashboard' },
      { name: 'Tài khoản', path: '/profile', icon: UserCircle, maintenanceKey: 'profile' },
      { name: 'Tiện ích', path: '/utilities', icon: Wrench, maintenanceKey: 'utilities' },
    ]
  }
];

export default function Sidebar({ className }: { className?: string }) {
  const { isAdmin } = useAuthStore();
  const { setSidebarOpen } = useAppStore();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Tổng quan']);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  useEffect(() => {
    const activeGroup = fixedNavGroups.find(g => g.items.some(i => i.path === location.pathname));
    if (activeGroup && !expandedGroups.includes(activeGroup.title)) {
      setExpandedGroups(prev => [...prev, activeGroup.title]);
    }
  }, [location.pathname]);

  return (
    <aside className={cn("flex flex-col relative z-20 w-64 bg-zinc-950/90 lg:bg-zinc-950/20 backdrop-blur-xl border-r border-white/5", className)}>
      <div className="p-8 flex items-center gap-4">
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
           <div className="absolute inset-0 w-full h-full bg-[#eb001b] rounded-full mix-blend-screen opacity-80" />
           <div className="absolute inset-0 w-full h-full bg-[#f79e1b] rounded-full mix-blend-screen opacity-80 translate-x-2" />
           <Shield className="relative z-10 w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <h2 className="font-display font-black text-white text-lg tracking-tighter uppercase italic leading-none">BMASS.</h2>
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-1 italic">NUCLEUS OS</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pt-4 pb-8 no-scrollbar">
        {fixedNavGroups.map((group, idx) => {
          const isExpanded = expandedGroups.includes(group.title);
          const hasActiveItem = group.items.some(i => i.path === location.pathname);

          return (
            <div key={idx} className="space-y-2">
              <button 
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                  hasActiveItem ? "text-zinc-200" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{group.title}</span>
                </div>
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isExpanded && "rotate-180")} />
              </button>
              
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden space-y-0.5"
                  >
                    {group.items.map((item: any) => {
                      const isActive = location.pathname === item.path;
                      const { maintenanceTabs } = useAppStore();
                      const isMaintenance = maintenanceTabs[item.maintenanceKey];
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                          className={({ isActive }) => cn(
                            "flex items-center justify-between px-3 py-2 rounded-md transition-all text-[13px] font-medium relative group",
                            isActive 
                              ? "text-white bg-white/5 shadow-sm" 
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={cn("w-4 h-4 transition-colors duration-300", isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400")} />
                            <span className={cn(isActive && "font-semibold")}>{item.name}</span>
                          </div>
                          {isMaintenance && (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" title="Đang bảo trì" />
                          )}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {isAdmin && (
          <div className="pt-4 border-t border-white/5">
            <NavLink
              to="/admin"
              onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-[11px] font-bold uppercase tracking-widest",
                isActive 
                  ? "text-amber-400 bg-amber-400/10" 
                  : "text-zinc-500 hover:text-amber-400 hover:bg-amber-400/5"
              )}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Center</span>
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  );
}

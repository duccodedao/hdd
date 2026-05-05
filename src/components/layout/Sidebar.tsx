import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Grid, Box, Info, UserCircle, Play,
  Bell, Phone, Shield, LogOut, FileText, Newspaper, TrendingUp, Gift, Landmark, LineChart, Globe, Server, CheckSquare,
  Plus, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { auth } from '../../lib/firebase';

const navGroups = [
  {
    title: 'Tổng quan',
    items: [
      { name: 'Trang chủ', path: '/', icon: Home },
      { name: 'Định danh', path: '/profile', icon: UserCircle },
      { name: 'Công việc', path: '/tasks', icon: CheckSquare },
    ]
  },
  {
    title: 'Hệ sinh thái',
    items: [
      { name: 'Sản phẩm', path: '/products', icon: Box },
      { name: 'Ngân hàng', path: '/banks', icon: Landmark },
      { name: 'Giao dịch', path: '/exchanges', icon: LineChart },
      { name: 'Phần thưởng', path: '/airdrop', icon: Gift },
    ]
  },
  {
    title: 'Truyền thông',
    items: [
      { name: 'Phim ảnh', path: '/movies', icon: Play },
      { name: 'Tin tức', path: '/news', icon: Newspaper },
    ]
  },
  {
    title: 'Hạ tầng',
    items: [
      { name: 'Tiện ích', path: '/utilities', icon: Grid },
      { name: 'Máy chủ DNS', path: '/dns', icon: Server },
    ]
  }
];

export default function Sidebar({ className }: { className?: string }) {
  const { isAdmin, user } = useAuthStore();
  const { setSidebarOpen } = useAppStore();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Tổng quan']);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  useEffect(() => {
    // Automatically expand group containing current path
    const activeGroup = navGroups.find(g => g.items.some(i => i.path === location.pathname));
    if (activeGroup && !expandedGroups.includes(activeGroup.title)) {
      setExpandedGroups(prev => [...prev, activeGroup.title]);
    }
  }, [location.pathname]);

  const handleLogout = () => signOut(auth);

  return (
    <aside className={cn("flex flex-col h-screen bg-white dark:bg-[#0a0a0b] border-r border-slate-100 dark:border-white/[0.05] selection:bg-blue-500/10", className)}>
      <div className="p-8 flex items-center gap-4">
        <motion.div 
          whileHover={{ rotate: -15, scale: 1.1 }}
          className="w-10 h-10 bg-slate-900 dark:bg-white rounded-[1.2rem] flex items-center justify-center p-2 shadow-2xl transition-all duration-500 cursor-pointer"
        >
          <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain filter brightness-0 dark:invert-0 invert" />
        </motion.div>
        <div>
          <h2 className="font-display font-medium text-lg text-slate-900 dark:text-white leading-tight italic tracking-tight">Sơn Lý Hồng Đức</h2>
          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 tracking-widest uppercase">Bmass</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 space-y-4 pb-8 no-scrollbar scroll-smooth">
        {navGroups.map((group, idx) => {
          const isExpanded = expandedGroups.includes(group.title);
          const hasActiveItem = group.items.some(i => i.path === location.pathname);

          return (
            <div key={idx} className="space-y-1">
              <button 
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300",
                  hasActiveItem ? "text-blue-600 dark:text-blue-500 font-bold" : "text-slate-400 dark:text-slate-500 font-semibold"
                )}
              >
                <span className="text-[10px] uppercase tracking-[0.2em]">{group.title}</span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-50" />}
              </button>
              
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden space-y-1"
                  >
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                          className={({ isActive }) => cn(
                            "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 group",
                            isActive 
                              ? "text-slate-900 dark:text-white bg-slate-50 dark:bg-white/[0.05]" 
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          )}
                        >
                          <item.icon className={cn("w-4.5 h-4.5 transition-all duration-500", isActive ? "text-blue-500 scale-110" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                          <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                          {isActive && (
                            <motion.div 
                              layoutId="active-nav-indicator"
                              className="absolute left-0 w-1 h-4 bg-blue-500 rounded-full"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
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
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.05]">
            <h3 className="px-4 text-[9px] font-bold text-amber-500 tracking-[0.2em] uppercase mb-4">Quản trị</h3>
            <NavLink
              to="/admin"
              onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500",
                isActive 
                  ? "bg-amber-500/10 text-amber-500" 
                  : "text-slate-500 hover:text-amber-500 hover:bg-amber-500/5"
              )}
            >
              <Shield className="w-4.5 h-4.5" />
              <span className="text-sm font-semibold tracking-tight">Hệ thống</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-6">
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-4 py-3.5 rounded-xl transition-all duration-500 text-sm font-bold text-slate-500 hover:text-red-500 hover:bg-red-500/5 border border-transparent hover:border-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center w-full justify-center gap-2 px-4 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl transition-all duration-500 text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/10"
          >
            <Star className="w-4 h-4 fill-current" />
            <span>Đăng nhập</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

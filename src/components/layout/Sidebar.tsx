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
    ]
  },
  {
    title: 'BMASS',
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
    ]
  },
  {
    title: 'Hạ tầng',
    items: [
      { name: 'Tiện ích', path: '/utilities', icon: Grid },
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
    <aside className={cn("flex flex-col relative z-20 w-71 bg-[#0c0c12] border-r border-white/5", className)}>
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-2 border border-white/10">
          <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="font-display font-medium text-lg text-white tracking-widest uppercase">BMASS</h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 space-y-8 pb-8 custom-scrollbar">
        {navGroups.map((group, idx) => {
          const isExpanded = expandedGroups.includes(group.title);
          const hasActiveItem = group.items.some(i => i.path === location.pathname);

          return (
            <div key={idx} className="space-y-4">
              <button 
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  hasActiveItem ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <span>{group.title}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
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
                            "flex items-center gap-4 px-3 py-2 rounded-lg transition-all text-sm font-medium",
                            isActive 
                              ? "text-white bg-white/5" 
                              : "text-slate-500 hover:text-white hover:bg-white/[0.02]"
                          )}
                        >
                          <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "")} />
                          <span>{item.name}</span>
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
          <div className="pt-6 border-t border-white/5">
            <NavLink
              to="/admin"
              onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-3 py-2 rounded-lg transition-all text-sm font-bold uppercase tracking-widest",
                isActive 
                  ? "text-amber-400 bg-amber-400/5" 
                  : "text-slate-500 hover:text-amber-400 hover:bg-amber-400/5"
              )}
            >
              <Shield className="w-4 h-4" />
              <span>Hệ thống</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-6 mt-auto">
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-3 py-2 w-full text-slate-500 hover:text-rose-400 text-sm font-bold uppercase tracking-widest transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center justify-center w-full h-11 bg-white hover:bg-slate-200 text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Đăng nhập
          </NavLink>
        )}
      </div>
    </aside>
  );
}

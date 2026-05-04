import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Home, Grid, Box, Info, UserCircle, Play,
  Bell, Phone, Shield, LogOut, FileText, Newspaper, TrendingUp, Gift, Landmark, LineChart, Globe, Server, CheckSquare
} from 'lucide-react';
import { collection, query, onSnapshot, getFirestore } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

const navGroups = [
  {
    title: 'Chính',
    items: [
      { name: 'Trang chủ', path: '/', icon: Home },
      { name: 'Tài khoản', path: '/profile', icon: UserCircle },
      { name: 'Công việc', path: '/tasks', icon: CheckSquare },
    ]
  },
  {
    title: 'Hệ Sinh Thái',
    items: [
      { name: 'Sản phẩm', path: '/products', icon: Box },
      { name: 'Airdrop', path: '/airdrop', icon: Gift },
      { name: 'Ngân hàng', path: '/banks', icon: Landmark },
      { name: 'Sàn giao dịch', path: '/exchanges', icon: LineChart },
    ]
  },
  {
    title: 'Giải trí',
    items: [
      { name: 'Xem Phim', path: '/movies', icon: Play },
    ]
  },
  {
    title: 'Công cụ',
    items: [
      { name: 'Tiện ích & Tính năng', path: '/utilities', icon: Grid },
      { name: 'Quản lý DNS Subdomain', path: '/dns', icon: Server },
    ]
  },
  {
    title: 'Khác',
    items: [
      { name: 'Giới thiệu', path: '/about', icon: Info },
      { name: 'Liên hệ', path: '/contact', icon: Phone },
    ]
  }
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { isAdmin, user } = useAuthStore();
  const { setSidebarOpen } = useAppStore();
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <aside className={cn("flex flex-col h-full bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-r border-slate-200 dark:border-white/10", className)}>
      <div className="p-8 flex items-center gap-4">
        <motion.div 
          whileHover={{ rotate: -10, scale: 1.1 }}
          className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center p-2.5 shadow-xl shadow-blue-500/20 cursor-pointer"
        >
          <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
        </motion.div>
        <div>
          <h2 className="font-display font-medium text-lg text-slate-900 dark:text-white leading-none tracking-tight italic">Bmass HD</h2>
          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400  tracking-normal mt-1">Hệ sinh thái</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 space-y-8 pb-8 no-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <p className="px-4 text-[10px] font-medium text-slate-400 dark:text-slate-500  tracking-[0.2em] mb-4">{group.title}</p>
            <div className="space-y-1.5 font-sans">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-sm font-bold tracking-tight",
                      isActive 
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <motion.div layoutId="active-pill" className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="pt-8 border-t border-slate-100 dark:border-white/5">
            <p className="px-4 text-[10px] font-medium text-amber-500  tracking-[0.2em] mb-4">Quản trị</p>
            <NavLink
              to="/admin"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-sm font-bold tracking-tight",
                location.pathname.startsWith('/admin')
                  ? "bg-amber-500 text-white shadow-xl shadow-amber-500/20" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"
              )}
            >
              <Shield className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", location.pathname.startsWith('/admin') ? "text-white" : "text-slate-400 group-hover:text-amber-500")} />
              <span>Quản trị Hệ thống</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-black/20">
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:text-red-500 shadow-sm hover:shadow-md"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center w-full gap-3 px-4 py-3.5 bg-blue-600 text-white rounded-2xl transition-all duration-300 text-sm font-medium  tracking-normal hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 flex justify-center"
          >
            <LogOut className="w-5 h-5 rotate-180" />
            <span>Đăng nhập</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

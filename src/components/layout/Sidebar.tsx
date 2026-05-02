import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, Grid, Box, Info, UserCircle, 
  Bell, Phone, Shield, LogOut, FileText, Newspaper, TrendingUp, Gift, Landmark, LineChart, Globe, Server
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
  const { isAdmin, user, userData } = useAuthStore();
  const { setSidebarOpen } = useAppStore();
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <aside className={cn("flex flex-col h-full", className)}>
      <div className="p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center p-2 border border-slate-200 dark:border-white/20">
          <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Hệ Sinh Thái</h2>
          <p className="text-xs text-blue-600 dark:text-blue-400">BmassHD</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pb-4">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{group.title}</p>
            <div className="space-y-1">
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
                      "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                      isActive 
                        ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                      {item.name}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quản trị</p>
            <NavLink
              to="/admin"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                location.pathname.startsWith('/admin')
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <Shield className={cn("w-5 h-5", location.pathname.startsWith('/admin') ? "text-amber-600 dark:text-amber-500" : "text-slate-400 group-hover:text-amber-500")} />
              Admin Panel
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:text-red-500 dark:hover:text-red-400"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

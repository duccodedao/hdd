import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, User, FileText, Settings, Shield, Star, Bell, Moon, Sun, RefreshCw, LogOut, ChevronRight, Layout } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useNotificationStore } from '../../store/notificationStore';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toggleDarkMode, darkMode, systemVersion } = useAppStore();
  const { user, userData, isAdmin, isSuperAdmin } = useAuthStore();
  const { bookmarks } = useBookmarkStore();
  const { notifications, readNotificationIds, markAsRead } = useNotificationStore();

  const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleAction = (cb: () => void) => {
    cb();
    setOpen(false);
  };

  const handleLogout = () => {
    signOut(auth);
    setOpen(false);
    toast.success("Đã đăng xuất thành công!");
    navigate('/login');
  };

  const handleResetVersion = () => {
    if (systemVersion) {
      localStorage.setItem('appVersion', systemVersion);
    }
    sessionStorage.clear();
    toast.success("Đang làm mới ứng dụng...");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6"
    >
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-1.5 border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 py-1 px-3 mb-2 bg-slate-50/50 dark:bg-white/[0.02] rounded-xl">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
          <Command.Input 
            placeholder="Tìm kiếm danh mục, thông báo, dấu trang hoặc nhập lệnh..." 
            className="w-full text-slate-800 dark:text-zinc-250 bg-transparent py-3 text-xs md:text-sm outline-none placeholder-slate-400 dark:placeholder-zinc-500" 
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 pointer-events-none select-none px-1.5 py-0.5 font-mono text-[9px] text-slate-400 bg-white dark:bg-zinc-800 dark:text-zinc-500 border border-slate-200 dark:border-white/10 rounded uppercase leading-none shadow-sm shrink-0">esc</kbd>
        </div>

        {/* Search Results Listing */}
        <Command.List className="max-h-[350px] overflow-y-auto p-1.5 space-y-1.5 no-scrollbar">
          <Command.Empty className="p-8 text-center text-xs text-slate-500 dark:text-zinc-500">
            Không tìm thấy lệnh hoặc kết quả tương xứng.
          </Command.Empty>

          {/* Bookmarks dynamic list */}
          {user && bookmarks.length > 0 && (
            <Command.Group heading="Dấu trang lưu nhanh" className="text-[10px] font-bold text-indigo-500 p-2 uppercase tracking-widest bg-indigo-50/20 dark:bg-indigo-500/5 rounded-xl mb-2">
              {bookmarks.map((b) => (
                <Command.Item 
                  key={b.id} 
                  onSelect={() => handleAction(() => navigate(b.url))}
                  className="flex items-center justify-between p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="truncate font-semibold">{b.title}</span>
                  </div>
                  <span className="text-[8.5px] font-mono tracking-wider uppercase opacity-55 shrink-0 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md text-slate-600 dark:text-zinc-400">
                    {b.type}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Unread system notifications */}
          {user && unreadNotifications.length > 0 && (
            <Command.Group heading="Thông báo chưa đọc" className="text-[10px] font-bold text-rose-500 p-2 uppercase tracking-widest bg-rose-50/20 dark:bg-rose-500/5 rounded-xl mb-2">
              {unreadNotifications.slice(0, 3).map((n) => (
                <Command.Item 
                  key={n.id} 
                  onSelect={() => handleAction(async () => {
                    await markAsRead(n.id);
                    // Force navigation to dashboard or show notification
                    navigate('/');
                  })}
                  className="flex items-center justify-between p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-rose-600 data-[selected=true]:text-white transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bell className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                    <span className="truncate font-semibold">{n.title}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Core Navigation Items */}
          <Command.Group heading="Mục điều hướng chính" className="text-[10px] font-bold text-slate-400 p-2 uppercase tracking-widest">
            <Command.Item 
              onSelect={() => handleAction(() => navigate('/'))} 
              className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-medium"
            >
              <Layout className="w-3.5 h-3.5 shrink-0" /> Bảng điều khiển (Trang chủ)
            </Command.Item>
            <Command.Item 
              onSelect={() => handleAction(() => navigate('/apps'))} 
              className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-medium"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" /> Cổng ứng dụng Hệ sinh thái
            </Command.Item>
            <Command.Item 
              onSelect={() => handleAction(() => navigate('/utilities'))} 
              className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-medium"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" /> Tiện ích & Công cụ hệ thống
            </Command.Item>
            <Command.Item 
              onSelect={() => handleAction(() => navigate('/profile'))} 
              className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-medium"
            >
              <User className="w-3.5 h-3.5 shrink-0" /> Hồ sơ cá nhân & Thiết đặt
            </Command.Item>
            {(isAdmin || isSuperAdmin) && (
              <Command.Item 
                onSelect={() => handleAction(() => navigate('/admin/dashboard'))} 
                className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-bold bg-amber-500/5"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Bảng quản trị hệ điều hành (Admin)
              </Command.Item>
            )}
          </Command.Group>

          {/* Quick System Actions */}
          <Command.Group heading="Hành động nhanh" className="text-[10px] font-bold text-slate-400 p-2 uppercase tracking-widest border-t border-slate-100 dark:border-white/5 pt-2">
            <Command.Item 
              onSelect={() => handleAction(() => toggleDarkMode())} 
              className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-medium"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
              {darkMode ? 'Chuyển sang giao diện Sáng (Vùng sáng)' : 'Chuyển sang giao diện Tối (Vùng tối)'}
            </Command.Item>
            <Command.Item 
              onSelect={() => handleAction(handleResetVersion)} 
              className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-slate-700 dark:text-zinc-300 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white transition-all text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Làm mới hệ thống (Clear Cache)
            </Command.Item>
            {user && (
              <Command.Item 
                onSelect={() => handleAction(handleLogout)} 
                className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl text-rose-500 hover:text-rose-600 data-[selected=true]:bg-rose-600 data-[selected=true]:text-white transition-all text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" /> Đăng xuất khỏi hệ thống
              </Command.Item>
            )}
          </Command.Group>
        </Command.List>

        {/* Command palette Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400 dark:text-zinc-500 select-none">
          <span>Khởi động nhanh bằng tổ hợp phím <kbd className="px-1 py-0.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded font-mono font-medium">Ctrl + K</kbd> hoặc <kbd className="px-1 py-0.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded font-mono font-medium">⌘ + K</kbd></span>
          <span className="font-mono">v{systemVersion || '4.0.0'}</span>
        </div>
      </div>
    </Command.Dialog>
  );
}
export { CommandPalette };

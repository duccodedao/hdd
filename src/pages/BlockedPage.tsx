import React from 'react';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

export default function BlockedPage({ reason = 'Your account or IP has been banned due to a violation of our terms.' }: { reason?: string }) {
  const navigate = useNavigate();
  const { setUser, setUserData } = useAuthStore();

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl space-y-8">
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            ACCESS DENIED
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {reason}
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
          <a
            href="mailto:support@bmasshd.com"
            className="block text-sm font-bold text-blue-600 hover:underline"
          >
            Liên hệ hỗ trợ kỹ thuật
          </a>
        </div>
        
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-4">
          BmassHD Ecosystem Security Enforcement
        </p>
      </div>
    </div>
  );
}

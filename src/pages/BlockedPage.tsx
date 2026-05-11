import React from 'react';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

export default function BlockedPage({ 
  title = 'ACCESS DENIED', 
  reason = 'Your account or IP has been banned due to a violation of our terms.' 
}: { title?: string, reason?: string }) {
  const navigate = useNavigate();
  const { setUser, setUserData } = useAuthStore();

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-white/5 rounded-2xl p-10 text-center shadow-2xl space-y-8">
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            {title}
          </h1>
          <p className="text-zinc-400 font-medium">
            {reason}
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-white text-black rounded-2xl font-medium text-sm  tracking-normal hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
          <a
            href="mailto:support@bmasshd.com"
            className="block text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Liên hệ hỗ trợ kỹ thuật
          </a>
        </div>
        
        <p className="text-[10px] font-medium text-zinc-600  tracking-normal pt-4">
          BmassHD Ecosystem Security Enforcement
        </p>
      </div>
    </div>
  );
}

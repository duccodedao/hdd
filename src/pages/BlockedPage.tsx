import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, Home, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function BlockedPage({ 
  title = 'ACCESS DENIED', 
  reason = 'Your account or IP has been banned due to a violation of our terms.',
  isWhitelistBlocked = false,
  ipWifi = ''
}: { title?: string, reason?: string, isWhitelistBlocked?: boolean, ipWifi?: string }) {
  const navigate = useNavigate();
  const { userData, setUser, setUserData } = useAuthStore();
  const [requestSent, setRequestSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkPending = async () => {
      if (!userData?.email || !ipWifi) {
        if (isMounted) setChecking(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'access_requests'),
          where('email', '==', userData.email),
          where('ipWifi', '==', ipWifi),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        if (!snap.empty && isMounted) {
          setRequestSent(true);
        }
      } catch (err) {
        console.error("Error checking pending requests", err);
      } finally {
        if (isMounted) setChecking(false);
      }
    };
    checkPending();
    return () => { isMounted = false; };
  }, [userData?.email, ipWifi]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    navigate('/login');
  };

  const handleSendRequest = async () => {
    if (!userData?.email || !ipWifi) {
      toast.error('Thiếu thông tin người dùng hoặc IP để gửi yêu cầu');
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, 'access_requests'), {
        email: userData.email,
        displayName: userData.displayName || '',
        ipWifi,
        device: navigator.userAgent,
        status: 'pending',
        createdAt: Date.now()
      });
      setRequestSent(true);
      toast.success('Gửi yêu cầu thành công!');
    } catch (err: any) {
      toast.error('Gửi yêu cầu thất bại');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-white/5 rounded-2xl p-10 text-center shadow-2xl space-y-8">
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-zinc-400 font-medium text-sm">
            {reason}
          </p>
          {isWhitelistBlocked && (
            <div className="text-left bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 mt-4">
              <div className="text-xs text-zinc-500">Thông tin thiết bị:</div>
              <div className="text-sm font-mono text-zinc-300">IP Wifi: {ipWifi || 'Đang tải...'}</div>
              <div className="text-sm font-mono text-zinc-300 truncate">Device: {navigator.userAgent.substring(0, 30)}...</div>
              {userData?.email && <div className="text-sm font-mono text-zinc-300">Tài khoản: {userData.email}</div>}
            </div>
          )}
        </div>

        <div className="pt-4 space-y-4">
          {isWhitelistBlocked && checking && userData?.email ? (
            <div className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              <span className="animate-pulse">Đang kiểm tra...</span>
            </div>
          ) : isWhitelistBlocked && !requestSent && userData?.email ? (
            <button 
              onClick={handleSendRequest}
              disabled={sending}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> 
              {sending ? 'Đang gửi...' : 'Gửi yêu cầu truy cập'}
            </button>
          ) : isWhitelistBlocked && requestSent ? (
            <div className="w-full py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-bold text-sm tracking-wide">
              Đã gửi yêu cầu, vui lòng chờ duyệt!
            </div>
          ) : null}

          {userData ? (
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-white text-black rounded-2xl font-medium text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất (Đổi tài khoản)
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-white text-black rounded-2xl font-medium text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Đăng nhập / Chuyển luồng Admin
            </button>
          )}
          <a
            href="mailto:support@bmasshd.com"
            className="block text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Liên hệ hỗ trợ kỹ thuật
          </a>
        </div>
        
        <p className="text-[10px] font-medium text-zinc-600 pt-4">
          BmassHD Ecosystem Security Enforcement
        </p>
      </div>
    </div>
  );
}

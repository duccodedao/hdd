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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-amber-500/5 blur-[150px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full text-center relative z-10"
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-12 inline-block"
        >
          <div className="relative group">
            <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <img 
              src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
              alt="Logo" 
              className="w-28 h-28 md:w-36 md:h-36 mx-auto relative z-10 drop-shadow-xl"
            />
          </div>
        </motion.div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-amber-500/20">
            <Hammer className="w-3.5 h-3.5" /> 
            Hệ thống đang bảo trì
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-display font-medium text-white tracking-tight">
              Chúng tôi đang <br />
              <span className="text-indigo-400 italic">nâng cấp</span> hệ thống
            </h1>

            <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto font-medium leading-relaxed">
              {message || "Hệ sinh thái đang được tinh chỉnh để đạt hiệu năng tối ưu nhất. Các dịch vụ sẽ sớm khả dụng trở lại. Cảm ơn sự kiên nhẫn của bạn."}
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 px-6 py-4 rounded-3xl shadow-sm">
              <div className="relative">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                <div className="absolute inset-0 blur-sm bg-indigo-500/30 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                Trạng thái: <span className="text-indigo-400 italic">Đang cập nhật...</span>
              </span>
            </div>
            
            <div className="flex items-center gap-12 text-zinc-500 pt-2">
               <div className="flex flex-col items-center gap-1.5">
                 <ServerCrash className="w-4 h-4 text-indigo-400" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Nodes</span>
               </div>
               <div className="flex flex-col items-center gap-1.5">
                 <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Sync</span>
               </div>
               <div className="flex flex-col items-center gap-1.5">
                 <Sparkles className="w-4 h-4 text-amber-400" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Core</span>
               </div>
            </div>

            <button 
              onClick={() => setShowAdminLogin(true)}
              className="mt-4 text-[10px] font-bold text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-2"
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10 text-center">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                  <ShieldCheck className="w-7 h-7 text-indigo-400" />
                </div>
                <h2 className="text-xl font-display font-medium text-white uppercase tracking-widest">Admin Access</h2>
                <p className="text-xs text-zinc-400 mt-2 font-medium">Xác thực để truy cập hệ thống bảo trì.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 w-full bg-zinc-900 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-indigo-500/50 transition-all text-sm font-medium text-white placeholder:text-zinc-600"
                        placeholder="admin@bmass.id"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-12 w-full bg-zinc-900 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-indigo-500/50 transition-all text-sm font-medium text-white placeholder:text-zinc-600"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác thực'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Footer Branding */}
      <div className="absolute bottom-10 left-0 w-full text-center">
         <p className="text-[10px] font-medium tracking-[0.4em] text-zinc-600 uppercase">
           Hệ sinh thái • 2026
         </p>
      </div>
    </div>
  );
}

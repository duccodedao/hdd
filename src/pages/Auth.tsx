import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, Loader2, X, Sparkles, User, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, Fingerprint } from 'lucide-react';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegisterRoute = location.pathname.includes('register');
  const [activeCard, setActiveCard] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');
  const [rememberMe, setRememberMe] = useState(false);

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPass = localStorage.getItem('rememberedPass');
    if (savedEmail && savedPass) {
      setLoginEmail(savedEmail);
      setLoginPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const checkAndSaveLocation = async (uid: string) => {
    let ip = 'Unknown';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || 'Unknown';
    } catch(e) {}

    const payload: any = { lastIpAddress: ip, lastLoginAt: Date.now() };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          payload.location = { lat: latitude, lng: longitude };
          await updateDoc(doc(db, 'users', uid), payload);
        } catch(e) {}
      }, undefined, { timeout: 10000 });
    }
    try {
      await updateDoc(doc(db, 'users', uid), payload);
    } catch(e) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return toast.error('Vui lòng nhập đầy đủ thông tin.');
    
    setLoginLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginEmail);
        localStorage.setItem('rememberedPass', loginPassword);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPass');
      }
      await setPersistence(auth, browserLocalPersistence);
      const userCred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      await logActivity(ActivityType.LOGIN, 'Đăng nhập thành công qua ID/Pass');
      await checkAndSaveLocation(userCred.user.uid);
      navigate('/');
    } catch (error: any) {
      toast.error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) return toast.error('Vui lòng nhập đầy đủ thông tin.');
    
    setRegisterLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: userCred.user.email,
        displayName: registerName,
        photoURL: '',
        role: registerEmail === 'sonlyhongduc@gmail.com' ? 'superadmin' : 'user',
        status: 'active',
        createdAt: Date.now(),
        joinedAt: Date.now(),
        lastLoginAt: Date.now()
      });
      await checkAndSaveLocation(userCred.user.uid);
      toast.success('Đăng ký hoàn tất.');
      navigate('/');
    } catch (error: any) {
      toast.error('Tạo tài khoản thất bại.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', userCred.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: userCred.user.uid,
          email: userCred.user.email,
          displayName: userCred.user.displayName || 'Google Entity',
          photoURL: userCred.user.photoURL || '',
          role: userCred.user.email === 'sonlyhongduc@gmail.com' ? 'superadmin' : 'user',
          status: 'active',
          createdAt: Date.now(),
          joinedAt: Date.now(),
          lastLoginAt: Date.now()
        });
      } else {
        await updateDoc(userRef, { lastLoginAt: Date.now() });
      }

      await checkAndSaveLocation(userCred.user.uid);
      await logActivity(ActivityType.LOGIN, 'Social authentication successful');
      navigate('/');
    } catch (error: any) {
       toast.error('Social authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Identifier required.');
    
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      toast.success('Recovery link dispatched.');
      setShowForgotModal(false);
    } catch (error: any) {
      toast.error('Dispatched failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0b] selection:bg-blue-500/10 transition-colors duration-700">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-xl px-10 relative z-10 space-y-16">
        
        {/* Branding */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-24 h-24 glass-card p-5 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/5 ring-1 ring-slate-200 dark:ring-white/10 hover:scale-105 transition-transform duration-500">
            <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-display font-medium tracking-tight italic text-gradient">
              Định danh
            </h1>
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-slate-400">Portal Truy cập Hệ thống</p>
          </div>
        </motion.div>

        {/* Auth Interface */}
        <div className="space-y-10">
          
          <nav className="flex gap-2 p-2 glass rounded-[1.5rem] border border-white/5 max-w-xs mx-auto">
            {[
              { id: 'login', label: 'Xác thực' },
              { id: 'register', label: 'Tham gia' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveCard(tab.id as any)}
                className={cn(
                  "flex-1 h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-500",
                  activeCard === tab.id 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-2xl" 
                    : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="glass p-10 md:p-14 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl"
            >
               {activeCard === 'login' ? (
                 <form onSubmit={handleLogin} className="space-y-10">
                   <header className="space-y-2">
                     <h2 className="text-4xl md:text-5xl font-display font-medium italic tracking-tight text-gradient">Chào mừng trở lại.</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cung cấp thông tin để truy cập</p>
                   </header>

                   <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email đăng ký</label>
                        <div className="relative">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="email" 
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                            placeholder="email@vidu.vn"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Mật khẩu bảo mật</label>
                          <button type="button" onClick={() => setShowForgotModal(true)} className="text-[9px] font-bold text-blue-500 uppercase tracking-widest hover:underline leading-none">Quên link?</button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type={showLoginPassword ? "text" : "password"} 
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full h-14 pl-14 pr-16 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                            placeholder="••••••••"
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-3 ml-1 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center",
                        rememberMe ? 'bg-blue-500 border-blue-500' : 'border-slate-200 dark:border-white/10'
                      )}>
                        {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Duy trì đăng nhập</span>
                   </div>

                   <div className="space-y-6 pt-4">
                      <button 
                        type="submit" 
                        disabled={loginLoading || googleLoading}
                        className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4 group disabled:opacity-50"
                      >
                        {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>Khởi tạo truy cập <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" /></>
                        )}
                      </button>
                      
                      <div className="flex items-center gap-6 px-4">
                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.5em]">Mạng xã hội</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                      </div>

                      <button 
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={loginLoading || googleLoading}
                        className="w-full h-16 glass rounded-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500/30 transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
                      >
                         <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="Google" />
                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Truy cập bằng Google</span>
                      </button>
                   </div>
                 </form>
               ) : (
                 <form onSubmit={handleRegister} className="space-y-10">
                   <header className="space-y-2">
                     <h2 className="text-4xl md:text-5xl font-display font-medium italic tracking-tight text-gradient">Tạo định danh.</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tham gia hệ sinh thái phi tập trung</p>
                   </header>

                   <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                        <div className="relative">
                          <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                            placeholder="Nhập tên của bạn"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email chính</label>
                        <div className="relative">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="email" 
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                            placeholder="email@vidu.vn"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mật khẩu bí mật</label>
                        <div className="relative">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type={showRegisterPassword ? "text" : "password"} 
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="w-full h-14 pl-14 pr-16 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                            placeholder="••••••••"
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                   </div>

                   <button 
                     type="submit" 
                     disabled={registerLoading || googleLoading}
                     className="w-full h-16 bg-blue-500 text-white rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-4 group disabled:opacity-50"
                   >
                     {registerLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                       <>Hoàn tất đăng ký <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /></>
                     )}
                   </button>
                 </form>
               )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Forgot Password Integrated Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass p-10 md:p-14 rounded-[2.5rem] border border-white/10 shadow-full"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-10 right-10 p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
               >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-12 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-medium text-slate-900 dark:text-white italic tracking-tight text-gradient">Khôi phục truy cập.</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gửi liên kết khôi phục tới định danh đã xác thực</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email đã đăng ký</label>
                  <input 
                    type="email" 
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full h-14 px-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold italic text-sm"
                    placeholder="email@vidu.vn"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
                >
                  {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gửi liên kết'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Decoration */}
      <footer className="fixed bottom-10 left-0 right-0 text-center pointer-events-none opacity-30">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em]">Chỉ dành cho các truy cập được ủy quyền</p>
      </footer>
    </div>
  );
}


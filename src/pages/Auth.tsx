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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0c0c12]">
      <div className="w-full max-w-md space-y-12">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center p-3">
            <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-medium text-white tracking-widest uppercase">BMASS</h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide">Hệ sinh thái quản trị tối giản</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveCard('login')}
            className={cn(
              "flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              activeCard === 'login' ? "bg-white text-black" : "text-slate-500 hover:text-white"
            )}
          >
            Đăng nhập
          </button>
          <button 
            onClick={() => setActiveCard('register')}
            className={cn(
              "flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              activeCard === 'register' ? "bg-white text-black" : "text-slate-500 hover:text-white"
            )}
          >
            Đăng ký
          </button>
        </div>

        {/* Form Section */}
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeCard === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                        <input 
                          type="email" 
                          disabled={loginLoading}
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="h-12 w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                          placeholder="name@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mật khẩu</label>
                        <button type="button" onClick={() => setShowForgotModal(true)} className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Quên?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                        <input 
                          type={showLoginPassword ? "text" : "password"} 
                          disabled={loginLoading}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="h-12 w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-12 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                          placeholder="••••••••"
                          required
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loginLoading}
                    className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Đăng nhập hệ thống'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tên của bạn</label>
                      <input 
                        type="text" 
                        disabled={registerLoading}
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                        placeholder="Họ và tên"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
                      <input 
                        type="email" 
                        disabled={registerLoading}
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                        placeholder="name@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                      <input 
                        type={showRegisterPassword ? "text" : "password"} 
                        disabled={registerLoading}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={registerLoading}
                    className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {registerLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Bắt đầu ngay'}
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/5"></div>
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Hoặc</span>
              <div className="flex-1 h-px bg-white/5"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleAuth}
              disabled={loginLoading || registerLoading || googleLoading}
              className="w-full h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Tiếp tục bằng Google</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] font-medium text-slate-600 uppercase tracking-widest">
          BMASS Ecosystem
        </p>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#121218] border border-white/5 p-8 rounded-2xl shadow-2xl"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-all"
               >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6 text-center pt-4 mb-8">
                <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mx-auto border border-white/5">
                  <Mail className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-medium text-white uppercase tracking-widest">Quên mật khẩu?</h3>
                  <p className="text-xs text-slate-500 font-medium">Chúng tôi sẽ gửi liên kết khôi phục qua email.</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email của bạn</label>
                  <input 
                    type="email" 
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 outline-none focus:border-white transition-all text-sm font-medium text-white"
                    placeholder="name@email.com"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Gửi yêu cầu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, X, Sparkles, User, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, Fingerprint, Chrome, Smartphone, ChevronRight, CreditCard } from 'lucide-react';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Helmet } from 'react-helmet-async';
import MiniLoading from '../components/ui/MiniLoading';
import AppLogo from '../components/ui/AppLogo';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegisterRoute = location.pathname.includes('register');
  const [activeCard, setActiveCard] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login states
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('rememberedIdentifier');
    const savedPass = localStorage.getItem('rememberedPass');
    if (savedId && savedPass) {
      setIdentifier(savedId);
      setLoginPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const resolveIdentifierToEmail = async (id: string) => {
    if (id.includes('@')) return id;
    const q = query(collection(db, 'users'), where('phoneNumber', '==', id));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Account identifier not found.');
    return snap.docs[0].data().email;
  };

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
          await setDoc(doc(db, 'users', uid), payload, { merge: true });
        } catch(e) {}
      }, undefined, { timeout: 10000 });
    }
    try {
      await setDoc(doc(db, 'users', uid), payload, { merge: true });
    } catch(e) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!identifier) newErrors.identifier = 'Vui lòng nhập định danh.';
    if (!loginPassword) newErrors.password = 'Vui lòng nhập mật khẩu.';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoginLoading(true);
    setErrors({});
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedIdentifier', identifier);
        localStorage.setItem('rememberedPass', loginPassword);
      } else {
        localStorage.removeItem('rememberedIdentifier');
        localStorage.removeItem('rememberedPass');
      }
      await setPersistence(auth, browserLocalPersistence);
      
      const email = await resolveIdentifierToEmail(identifier);
      const userCred = await signInWithEmailAndPassword(auth, email, loginPassword);
      await logActivity(ActivityType.LOGIN, `Đã đăng nhập qua ${identifier.includes('@') ? 'Email' : 'Giao thức'}`);
      await checkAndSaveLocation(userCred.user.uid);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!registerName) newErrors.registerName = 'Tên không được để trống.';
    if (!registerEmail) newErrors.registerEmail = 'Email không hợp lệ.';
    if (!registerPhone) newErrors.registerPhone = 'Số điện thoại không hợp lệ.';
    if (!registerPassword) newErrors.registerPassword = 'Mật khẩu tối thiểu 6 ký tự.';
    else if (registerPassword.length < 6) newErrors.registerPassword = 'Mật khẩu quá ngắn.';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    if (!agreeToTerms) return toast.error('Vui lòng chấp nhận điều khoản.');
    
    setRegisterLoading(true);
    setErrors({});
    try {
      const qPhone = query(collection(db, 'users'), where('phoneNumber', '==', registerPhone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) throw new Error('Protocol handle already indexed.');

      const userCred = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: userCred.user.email,
        phoneNumber: registerPhone,
        displayName: registerName,
        photoURL: '',
        role: (registerEmail === 'sonlyhongduc@gmail.com' || registerEmail === 'sonlyhongduc1@ghn.vn') ? 'superadmin' : 'user',
        status: 'active',
        createdAt: Date.now(),
        joinedAt: Date.now(),
        lastLoginAt: Date.now()
      });
      await checkAndSaveLocation(userCred.user.uid);
      toast.success('Entity registered.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) return;
    setForgotLoading(true);
    try {
      const email = await resolveIdentifierToEmail(forgotIdentifier);
      await sendPasswordResetEmail(auth, email);
      toast.success('Đã gửi liên kết khôi phục.');
      setShowForgotModal(false);
    } catch (err: any) {
      toast.error('Gửi thất bại. Không tìm thấy tài khoản.');
    } finally {
      setForgotLoading(false);
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
          role: (userCred.user.email === 'sonlyhongduc@gmail.com' || userCred.user.email === 'sonlyhongduc1@ghn.vn') ? 'superadmin' : 'user',
          status: 'active',
          onboardingCompleted: false,
          createdAt: Date.now(),
          joinedAt: Date.now(),
          lastLoginAt: Date.now()
        });
      } else {
        await updateDoc(userRef, { lastLoginAt: Date.now() });
      }

      await checkAndSaveLocation(userCred.user.uid);
      await logActivity(ActivityType.LOGIN, 'Đã thiết lập liên kết hệ thống');
      navigate('/');
    } catch (error: any) {
       toast.error('Neural handshaked failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row relative overflow-hidden selection:bg-indigo-500/30">
      <Helmet>
        <title>{activeCard === 'login' ? 'Đăng nhập' : 'Đăng ký'} | BMASS Dashboard</title>
        <meta name="description" content="Truy cập vào hệ điều hành quản trị bảo mật BMASS." />
      </Helmet>
      
      {/* Visual Side */}
      <div className="hidden md:flex flex-col justify-between p-12 lg:p-20 w-1/2 relative bg-slate-50/50 dark:bg-black/20 border-r border-slate-200 dark:border-white/5 overflow-hidden">
         <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/5 rounded-full blur-[120px]" />
         
         <div className="relative z-10">
            <div className="flex items-center gap-6 mb-20">
               <AppLogo className="w-12 h-12" />
               <span className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-[0.2em] uppercase italic">nucleus.</span>
            </div>

            <div className="space-y-12">
                <h2 className="text-6xl lg:text-8xl font-serif italic font-medium text-slate-900 dark:text-white tracking-tighter leading-[0.85] max-w-lg lowercase">
                   Đăng ký <br /> <span className="text-slate-300 dark:text-zinc-700">tài khoản.</span>
                </h2>
                <p className="text-slate-500 dark:text-zinc-400 text-xl max-w-sm leading-relaxed font-medium italic">
                  Khám phá sự vĩ đại từ những điều cốt lõi. Bảo mật là một đặc quyền, không phải gánh nặng.
                </p>
            </div>
         </div>

         <div className="relative z-10 flex gap-12 lg:gap-24">
            {[
              { label: 'Uptime', val: '99.99%', color: '#eb001b' },
              { label: 'Security', val: 'PROTECTED', color: '#f79e1b' }
            ].map(stat => (
              <div key={stat.label} className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.4em]">{stat.label}</p>
                 <p className="text-4xl font-serif italic font-medium text-slate-900 dark:text-white leading-none">{stat.val}</p>
                 <div className="h-0.5 w-10 mt-2" style={{ backgroundColor: stat.color }} />
              </div>
            ))}
         </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-12">
          <header className="space-y-6">
             <div className="flex items-center justify-between">
                <button 
                  onClick={() => navigate(-1)}
                  className="group flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-all"
                >
                   <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                   Quay lại
                </button>
                <div className="md:hidden flex items-center gap-4">
                   <AppLogo className="w-8 h-8" />
                </div>
             </div>

             <div className="space-y-3">
               <h3 className="text-4xl lg:text-5xl font-serif italic text-slate-900 dark:text-white tracking-tighter lowercase leading-tight">
                 {activeCard === 'login' ? 'Đăng nhập ứng dụng.' : 'Đăng ký tài khoản.'}
               </h3>
               <p className="text-slate-500 dark:text-zinc-400 text-lg font-medium italic leading-relaxed">
                  {activeCard === 'login' ? 'Yêu cầu xác thực để truy cập hệ thống bảo mật.' : 'Đăng ký nhận diện kỹ thuật số của bạn vào hệ sinh thái.'}
               </p>
             </div>
          </header>

          <div className="space-y-8">
            <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
               <button 
                 onClick={() => setActiveCard('login')}
                 className={cn(
                    "flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all", 
                    activeCard === 'login' 
                        ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xl dark:shadow-none' 
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
                 )}
               >
                 Đăng Nhập
               </button>
               <button 
                 onClick={() => setActiveCard('register')}
                 className={cn(
                    "flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all", 
                    activeCard === 'register' 
                        ? 'bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xl dark:shadow-none' 
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
                 )}
               >
                 Đăng Ký
               </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-8"
              >
                {activeCard === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <label className={cn(
                          "text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors",
                          errors.identifier ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                        )}>
                          Số điện thoại/Gmail
                        </label>
                        <div className="relative group">
                          <div className={cn(
                            "absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors",
                            errors.identifier ? "text-rose-500" : "text-slate-400 dark:text-zinc-600 group-focus-within:text-blue-500"
                          )}>
                             <User size={18} />
                          </div>
                          <input 
                            id="identifier"
                            type="text" 
                            autoComplete="username"
                            disabled={loginLoading}
                            value={identifier}
                            onChange={(e) => {
                              setIdentifier(e.target.value);
                              if (errors.identifier) setErrors(prev => {
                                const n = {...prev};
                                delete n.identifier;
                                return n;
                              });
                            }}
                            className={cn(
                              "h-14 w-full bg-slate-50 dark:bg-zinc-900 border rounded-2xl pl-12 pr-6 outline-none transition-all text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-700",
                              errors.identifier 
                                ? "border-rose-500/50 ring-4 ring-rose-500/5" 
                                : "border-slate-200 dark:border-white/5 focus:border-blue-500/50 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-indigo-500/5"
                            )}
                            placeholder="Email hoặc số điện thoại"
                          />
                        </div>
                        {errors.identifier && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{errors.identifier}</p>}
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center px-1">
                          <label className={cn(
                            "text-[10px] font-bold uppercase tracking-widest transition-colors",
                            errors.password ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                          )}>Mật khẩu</label>
                          <button type="button" onClick={() => setShowForgotModal(true)} className="text-[9px] font-bold text-blue-600 dark:text-indigo-400 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Quên mật khẩu?</button>
                        </div>
                        <div className="relative group">
                          <div className={cn(
                            "absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors",
                            errors.password ? "text-rose-500" : "text-slate-400 dark:text-zinc-600 group-focus-within:text-blue-500"
                          )}>
                             <Lock size={18} />
                          </div>
                          <input 
                            id="loginPassword"
                            type={showLoginPassword ? "text" : "password"} 
                            autoComplete="current-password"
                            disabled={loginLoading}
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              if (errors.password) setErrors(prev => {
                                const n = {...prev};
                                delete n.password;
                                return n;
                              });
                            }}
                            className={cn(
                              "h-14 w-full bg-slate-50 dark:bg-zinc-900 border rounded-2xl pl-12 pr-14 outline-none transition-all text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-700",
                              errors.password 
                                ? "border-rose-500/50 ring-4 ring-rose-500/5" 
                                : "border-slate-200 dark:border-white/5 focus:border-blue-500/50 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-indigo-500/5"
                            )}
                            placeholder="••••••••"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                           <div 
                             onClick={() => setRememberMe(!rememberMe)}
                             className={cn(
                               "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                               rememberMe 
                                 ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-xl" 
                                 : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20"
                             )}
                           >
                             {rememberMe && <CheckCircle2 className="w-4 h-4 text-white dark:text-black" />}
                           </div>
                           <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-[0.1em]">Lưu đăng nhập</span>
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loginLoading}
                      className="w-full h-14 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl shadow-slate-900/10 dark:shadow-white/5 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 group/btn"
                    >
                      {loginLoading ? <MiniLoading className="w-5 h-5 text-current" /> : <>Đăng nhập <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className={cn(
                          "text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors",
                          errors.registerName ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                        )}>Tên Hiển Thị</label>
                        <input 
                          id="registerName"
                          type="text" 
                          autoComplete="name"
                          disabled={registerLoading}
                          value={registerName}
                          onChange={(e) => {
                            setRegisterName(e.target.value);
                            if (errors.registerName) setErrors(prev => {
                              const n = {...prev};
                              delete n.registerName;
                              return n;
                            });
                          }}
                          className={cn(
                            "h-12 w-full bg-slate-50 dark:bg-zinc-900 border rounded-2xl px-5 outline-none transition-all text-sm font-semibold text-slate-900 dark:text-white",
                            errors.registerName 
                              ? "border-rose-500/50 ring-4 ring-rose-500/5" 
                              : "border-slate-200 dark:border-white/5 focus:border-blue-500/50 dark:focus:border-indigo-500/50"
                          )}
                          placeholder="Ví dụ: Nguyên Nguyễn"
                        />
                        {errors.registerName && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{errors.registerName}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className={cn(
                          "text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors",
                          errors.registerEmail ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                        )}>Email Đăng Ký</label>
                        <input 
                          id="registerEmail"
                          type="email" 
                          autoComplete="email"
                          disabled={registerLoading}
                          value={registerEmail}
                          onChange={(e) => {
                            setRegisterEmail(e.target.value);
                            if (errors.registerEmail) setErrors(prev => {
                              const n = {...prev};
                              delete n.registerEmail;
                              return n;
                            });
                          }}
                          className={cn(
                            "h-12 w-full bg-slate-50 dark:bg-zinc-900 border rounded-2xl px-5 outline-none transition-all text-sm font-semibold text-slate-900 dark:text-white",
                            errors.registerEmail 
                              ? "border-rose-500/50 ring-4 ring-rose-500/5" 
                              : "border-slate-200 dark:border-white/5 focus:border-blue-500/50 dark:focus:border-indigo-500/50"
                          )}
                          placeholder="name@company.com"
                        />
                        {errors.registerEmail && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{errors.registerEmail}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className={cn(
                          "text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors",
                          errors.registerPhone ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                        )}>Số Điện Thoại</label>
                        <input 
                          id="registerPhone"
                          type="tel" 
                          autoComplete="tel"
                          disabled={registerLoading}
                          value={registerPhone}
                          onChange={(e) => {
                            setRegisterPhone(e.target.value);
                            if (errors.registerPhone) setErrors(prev => {
                              const n = {...prev};
                              delete n.registerPhone;
                              return n;
                            });
                          }}
                          className={cn(
                            "h-12 w-full bg-slate-50 dark:bg-zinc-900 border rounded-2xl px-5 outline-none transition-all text-sm font-semibold text-slate-900 dark:text-white",
                            errors.registerPhone 
                              ? "border-rose-500/50 ring-4 ring-rose-500/5" 
                              : "border-slate-200 dark:border-white/5 focus:border-blue-500/50 dark:focus:border-indigo-500/50"
                          )}
                          placeholder="Ví dụ: 0901234567"
                        />
                        {errors.registerPhone && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{errors.registerPhone}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className={cn(
                          "text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors",
                          errors.registerPassword ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                        )}>Mật khẩu</label>
                        <div className="relative group">
                          <input 
                            id="registerPassword"
                            type={showRegisterPassword ? "text" : "password"} 
                            autoComplete="new-password"
                            disabled={registerLoading}
                            value={registerPassword}
                            onChange={(e) => {
                              setRegisterPassword(e.target.value);
                              if (errors.registerPassword) setErrors(prev => {
                                const n = {...prev};
                                delete n.registerPassword;
                                return n;
                              });
                            }}
                            className={cn(
                              "h-12 w-full bg-slate-50 dark:bg-zinc-900 border rounded-2xl px-5 pr-12 outline-none transition-all text-sm font-semibold text-slate-900 dark:text-white",
                              errors.registerPassword 
                                ? "border-rose-500/50 ring-4 ring-rose-500/5" 
                                : "border-slate-200 dark:border-white/5 focus:border-blue-500/50 dark:focus:border-indigo-500/50"
                            )}
                            placeholder="••••••••"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.registerPassword && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest ml-1 mt-1 animate-in fade-in slide-in-from-top-1">{errors.registerPassword}</p>}
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer group mt-4 pt-1">
                        <div 
                          onClick={() => setAgreeToTerms(!agreeToTerms)}
                          className={cn(
                            "w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition-all shrink-0",
                            agreeToTerms ? "bg-slate-950 dark:bg-white border-slate-950 dark:border-white" : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10"
                          )}
                        >
                          {agreeToTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white dark:text-black" />}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 leading-tight">
                           Tôi chấp nhận các <Link to="/terms" className="text-blue-600 dark:text-indigo-400 hover:underline">Điều khoản Dịch vụ</Link> và <Link to="/privacy" className="text-blue-600 dark:text-indigo-400 hover:underline">Chính sách Bảo mật</Link>.
                        </span>
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={registerLoading}
                      className="w-full h-14 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl dark:shadow-none active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {registerLoading ? <MiniLoading className="w-5 h-5 text-current" /> : 'Đăng ký'}
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="space-y-8 pt-4">
              <div className="flex items-center gap-6">
                 <div className="flex-1 h-px bg-slate-100 dark:bg-white/5"></div>
                 <span className="text-[10px] font-bold text-slate-300 dark:text-zinc-700 uppercase tracking-widest whitespace-nowrap">Access via secure relay</span>
                 <div className="flex-1 h-px bg-slate-100 dark:bg-white/5"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleAuth}
                disabled={loginLoading || registerLoading || googleLoading}
                className="w-full h-14 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 group shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Đăng nhấp bằng Google</span>
              </button>

              <footer className="flex justify-center gap-10 pt-4 opacity-70 hover:opacity-100 transition-opacity">
                 <Link to="/help" className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors">Hỗ trợ</Link>
                 <Link to="/status" className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors">Tình trạng</Link>
                 <Link to="/legal" className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors">Pháp lý</Link>
              </footer>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-10 rounded-[2.5rem] shadow-2xl"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-all bg-slate-100 dark:bg-white/5 rounded-full"
               >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6 text-center pt-4 mb-8">
                <div className="w-16 h-16 bg-blue-500/10 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 dark:border-indigo-500/20">
                  <Mail className="w-8 h-8 text-blue-600 dark:text-indigo-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-2xl font-serif italic text-slate-900 dark:text-white tracking-tight">Khôi Phục Quyền Truy Cập</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-500 font-medium italic">Bảo mật tài khoản liên kết qua email.</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Email Đăng Ký</label>
                  <input 
                    type="text" 
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="h-12 w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-xl px-4 outline-none focus:border-blue-500/50 dark:focus:border-indigo-500/50 transition-all text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="name@company.com"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full h-12 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {forgotLoading ? <MiniLoading className="w-5 h-5 text-current" /> : 'Gửi Yêu Cầu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

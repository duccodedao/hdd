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
import { Mail, Lock, Loader2, X, Sparkles, User, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';

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

  // Register states
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Generic loading for Google
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const checkAndSaveLocation = async (uid: string) => {
    let ip = 'Unknown';
    const ipApis = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api64.ipify.org?format=json'
    ];

    for (const url of ipApis) {
      try {
        const res = await fetch(url);
        const data = await res.json();
        ip = data.ip || 'Unknown';
        if (ip !== 'Unknown') break;
      } catch(e) {}
    }

    const payload: any = { lastIpAddress: ip, lastLoginAt: Date.now() };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          payload.location = { lat: latitude, lng: longitude };
          await updateDoc(doc(db, 'users', uid), payload);
        } catch(e) {
          await updateDoc(doc(db, 'users', uid), payload);
        }
      }, async () => {
        try {
          await updateDoc(doc(db, 'users', uid), payload);
        } catch(e) {}
      }, { timeout: 10000 });
    } else {
      try {
        await updateDoc(doc(db, 'users', uid), payload);
      } catch(e) {}
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return toast.error('Vui lòng nhập đầy đủ thông tin');
    
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
      await logActivity(ActivityType.LOGIN, 'Đăng nhập thành công bằng Email/Mật khẩu');
      await checkAndSaveLocation(userCred.user.uid);
      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast.error('Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('Tài khoản không tồn tại.');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Mật khẩu không chính xác.');
      } else {
        toast.error('Đăng nhập thất bại. Vui lòng kiểm tra lại');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) return toast.error('Vui lòng nhập đầy đủ thông tin');
    
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
      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email này đã được sử dụng bởi một tài khoản khác.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email không hợp lệ.');
      } else {
        toast.error('Đăng ký thất bại. Vui lòng thử lại sau.');
      }
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
          displayName: userCred.user.displayName || 'Người dùng Google',
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
      await logActivity(ActivityType.LOGIN, 'Đăng nhập thành công bằng Google');
      navigate('/');
    } catch (error: any) {
       toast.error('Đăng nhập bằng Google thất bại');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Vui lòng nhập Email');
    
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      toast.success('Link đặt lại mật khẩu đã được gửi vào Email của bạn!');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (error: any) {
      toast.error('Gửi yêu cầu thất bại. Vui lòng kiểm tra lại Email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfdfe] dark:bg-[#050608] text-slate-900 dark:text-white font-sans overflow-hidden relative selection:bg-blue-100 dark:selection:bg-blue-900/30">
      {/* Immersive Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/[0.03] dark:bg-blue-500/[0.02] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/[0.03] dark:bg-indigo-500/[0.02] blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      {/* Floating Logo Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 group"
      >
        <Link to="/" className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border border-slate-100/50 dark:border-white/5 group-hover:scale-105 transition-all duration-500">
            <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 drop-shadow-2xl" />
          </div>
          <div className="text-center">
            <h1 className="font-medium text-xl md:text-2xl tracking-tight  italic bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 leading-none">
              BMass HD
            </h1>
            <p className="text-[9px] font-medium  tracking-[0.3em] text-slate-400 mt-1">Hệ sinh thái</p>
          </div>
        </Link>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl p-10 shadow-full border border-slate-200/50 dark:border-white/10"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all"
               >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20">
                  <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-3xl font-medium tracking-tight  italic text-slate-900 dark:text-white mb-2">QUÊN MẬT KHẨU?</h2>
                <p className="text-slate-500 font-bold text-[11px]  tracking-normal leading-relaxed">Khôi phục tài khoản hệ thống</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Email liên kết</label>
                  <input 
                    type="email" 
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold"
                    placeholder="name@example.com"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-blue-600/20"
                >
                  {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'GỬI LIÊN KẾT KHÔI PHỤC'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 max-w-lg w-full relative z-10 px-6 mt-32 md:mt-16">
        <div className="relative w-full min-h-[600px]">
          
          {/* Action Selector */}
          <div className="flex justify-center mb-10 p-1.5 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-sm max-w-xs mx-auto">
            <button 
              onClick={() => setActiveCard('login')}
              className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-medium  tracking-normal transition-all ${activeCard === 'login' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => setActiveCard('register')}
              className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-medium  tracking-normal transition-all ${activeCard === 'register' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Đăng ký
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeCard === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/80 dark:bg-black/80 backdrop-blur-3xl rounded-2xl p-8 md:p-12 border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
              >
                <div className="mb-10 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight  italic leading-none mb-3">
                    Chào Mừng.
                  </h1>
                  <p className="text-slate-500 font-bold text-[11px]  tracking-[0.2em] opacity-60">Đăng nhập vào tài khoản định danh của bạn</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Email truy cập</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4.5 focus:border-blue-600 outline-none transition-all font-bold text-sm"
                        placeholder="example@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400">Mật khẩu bảo mật</label>
                      <button type="button" onClick={() => setShowForgotModal(true)} className="text-[9px] font-medium text-blue-600  tracking-normal hover:underline">Quên mật khẩu?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type={showLoginPassword ? "text" : "password"} 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-2xl pl-14 pr-16 py-4.5 focus:border-blue-600 outline-none transition-all font-bold text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-2 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-200 dark:border-white/10 bg-transparent group-hover:border-blue-600'}`}>
                      {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-[10px] font-medium  tracking-normal text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Duy trì đăng nhập</span>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loginLoading || googleLoading}
                    className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3 group"
                  >
                    {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        Đăng Nhập <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                  <span className="text-[9px] font-medium text-slate-300  tracking-[0.3em]">TÙY CHỌN XÁC THỰC</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loginLoading || googleLoading}
                  className="w-full mt-8 flex items-center justify-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 py-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                >
                  {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                      <span className="text-[10px] font-medium  tracking-[0.2em] text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Đăng nhập với Nhà cung cấp danh tính</span>
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/80 dark:bg-black/80 backdrop-blur-3xl rounded-2xl p-8 md:p-12 border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
              >
                <div className="mb-10 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight  italic leading-none mb-3 text-blue-600 dark:text-blue-400">
                    Gia Nhập.
                  </h1>
                  <p className="text-slate-500 font-bold text-[11px]  tracking-[0.2em] opacity-60">Tạo định danh truy cập hợp nhất của bạn</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Họ và tên đầy đủ</label> 
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4.5 focus:border-blue-600 outline-none transition-all font-bold text-sm"
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Email ưu tiên</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="email" 
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4.5 focus:border-blue-600 outline-none transition-all font-bold text-sm"
                        placeholder="example@gmail.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-medium  tracking-[0.2em] text-slate-400 ml-1">Tạo mật khẩu bảo mật</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type={showRegisterPassword ? "text" : "password"} 
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full bg-slate-50/50 dark:bg-black/40 border border-slate-200/60 dark:border-white/10 rounded-2xl pl-14 pr-16 py-4.5 focus:border-blue-600 outline-none transition-all font-bold text-sm"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={registerLoading || googleLoading}
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-medium  tracking-normal text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 group"
                  >
                    {registerLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        Xác Nhận Đăng Ký <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                  <span className="text-[9px] font-medium text-slate-300  tracking-[0.3em]">LỐI VÀO MẠNG XÃ HỘI</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={registerLoading || googleLoading}
                  className="w-full mt-8 flex items-center justify-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 py-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                >
                  {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                      <span className="text-[10px] font-medium  tracking-[0.2em] text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Tiếp tục với tài khoản Google</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


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
import { Mail, Lock, Loader2, X, Sparkles, User, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden relative">
      {/* Background Decorative blobs */}
      <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <Link to="/" className="fixed top-4 md:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-2 hover:opacity-80 transition-all z-50 group">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl border border-slate-100 dark:border-white/10 group-hover:scale-110 transition-transform">
          <img src="https://tytpht.hdd.io.vn/img/bmassloadings.png" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-sm" />
        </div>
        <span className="font-black text-sm md:text-xl tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Hệ Sinh Thái</span>
      </Link>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
               >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Quên mật khẩu?</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Nhập email liên kết với tài khoản của bạn để nhận liên kết đặt lại mật khẩu.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 ml-1">Email</label>
                  <input 
                    type="email" 
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="name@example.com"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gửi liên kết đặt lại'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Stacked Cards */}
      <div className="relative w-full max-w-md h-[600px] md:h-[680px] perspective-[1200px] mt-24 md:mt-10 px-4 md:px-0">
        
        {/* Register Card */}
        <motion.div
           layout
           animate={{
              zIndex: activeCard === 'register' ? 10 : 1,
              scale: activeCard === 'register' ? 1 : 0.9,
              y: activeCard === 'register' ? 0 : 50,
              rotate: activeCard === 'register' ? 0 : 4,
              opacity: activeCard === 'register' ? 1 : 0.6,
              filter: activeCard === 'register' ? 'blur(0px)' : 'blur(2px)',
           }}
           transition={{ type: 'spring', stiffness: 350, damping: 30 }}
           className={`absolute inset-x-4 md:inset-0 h-fit flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] ${activeCard !== 'register' ? 'cursor-pointer hover:opacity-80' : ''}`}
           onClick={() => activeCard !== 'register' && setActiveCard('register')}
        >
          {activeCard !== 'register' && <div className="absolute inset-0 z-20 rounded-[2.5rem]" />}
          
          <div className="mb-6 md:mb-8 font-sans">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-1 text-blue-600 dark:text-blue-400">Tạo tài khoản.</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-tight">Gia nhập cộng đồng bmassHD.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
               <label className="text-[10px] md:text-sm font-black uppercase tracking-widest ml-1 text-slate-500">Họ và tên</label>
               <input 
                 type="text" 
                 value={registerName}
                 onChange={(e) => setRegisterName(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 md:py-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                 placeholder="Nguyễn Văn A"
                 required
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] md:text-sm font-black uppercase tracking-widest ml-1 text-slate-500">Email</label>
               <input 
                 type="email" 
                 value={registerEmail}
                 onChange={(e) => setRegisterEmail(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 md:py-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                 placeholder="name@example.com"
                 required
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] md:text-sm font-black uppercase tracking-widest ml-1 text-slate-500">Mật khẩu</label>
               <input 
                 type="password" 
                 value={registerPassword}
                 onChange={(e) => setRegisterPassword(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 md:py-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                 placeholder="Tối thiểu 6 ký tự"
                 required
                 minLength={6}
               />
            </div>

            <div className="pt-2">
               <button 
                 type="submit" 
                 disabled={registerLoading || googleLoading}
                 className="w-full bg-blue-600 text-white font-black py-3 md:py-4 rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-xs md:text-sm uppercase tracking-widest"
               >
                 {registerLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng ký ngay'}
               </button>
            </div>
          </form>

          <div className="my-4 md:my-6 flex items-center gap-4">
             <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hoặc</span>
             <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoogleAuth(); }}
            disabled={registerLoading || googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-black py-3 md:py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99] transition-all text-xs md:text-sm"
          >
            {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />}
            TIẾP TỤC VỚI GOOGLE
          </button>

          <div className="mt-6 md:mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
             Đã có tài khoản?{' '}
             <button type="button" onClick={() => setActiveCard('login')} className="font-black text-slate-900 dark:text-white hover:underline relative z-30 uppercase tracking-tighter">
               Đăng nhập
             </button>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
           layout
           animate={{
              zIndex: activeCard === 'login' ? 10 : 1,
              scale: activeCard === 'login' ? 1 : 0.9,
              y: activeCard === 'login' ? 0 : -50,
              rotate: activeCard === 'login' ? 0 : -4,
              opacity: activeCard === 'login' ? 1 : 0.6,
              filter: activeCard === 'login' ? 'blur(0px)' : 'blur(2px)',
           }}
           transition={{ type: 'spring', stiffness: 350, damping: 30 }}
           className={`absolute inset-x-4 md:inset-0 h-fit flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] ${activeCard !== 'login' ? 'cursor-pointer hover:opacity-80' : ''}`}
           onClick={() => activeCard !== 'login' && setActiveCard('login')}
        >
          {activeCard !== 'login' && <div className="absolute inset-0 z-20 rounded-[2.5rem]" />}

          <div className="mb-6 md:mb-8 font-sans">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-1">Đăng nhập.</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-tight">Chào mừng trở lại bmassHD.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
               <label className="text-[10px] md:text-sm font-black uppercase tracking-widest ml-1 text-slate-500">Email</label>
               <input 
                 type="email" 
                 value={loginEmail}
                 onChange={(e) => setLoginEmail(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 md:py-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                 placeholder="name@example.com"
                 required
               />
            </div>

            <div className="space-y-1">
               <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-500">Mật khẩu</label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] md:text-xs font-black text-blue-600 hover:text-blue-700 transition-colors relative z-30 uppercase tracking-tighter"
                  >
                    Quên mật khẩu?
                  </button>
               </div>
               <input 
                 type="password" 
                 value={loginPassword}
                 onChange={(e) => setLoginPassword(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 md:py-3.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                 placeholder="••••••••"
                 required
               />
            </div>

            <div className="flex items-center justify-between ml-1 py-1">
               <label className="flex items-center gap-2 cursor-pointer group">
                 <div className="relative flex items-center">
                   <input 
                     type="checkbox" 
                     checked={rememberMe}
                     onChange={(e) => setRememberMe(e.target.checked)}
                     className="peer sr-only"
                   />
                   <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                   <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                   </svg>
                 </div>
                 <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Ghi nhớ mật khẩu</span>
               </label>
            </div>

            <div className="pt-2">
               <button 
                 type="submit" 
                 disabled={loginLoading || googleLoading}
                 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none"
               >
                 {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng nhập'}
               </button>
            </div>
          </form>

          <div className="my-4 md:my-6 flex items-center gap-4">
             <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hoặc</span>
             <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoogleAuth(); }}
            disabled={loginLoading || googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-black py-3 md:py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-[0.99] transition-all text-xs md:text-sm"
          >
            {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />}
            TIẾP TỤC VỚI GOOGLE
          </button>

          <div className="mt-6 md:mt-8 text-center text-xs text-slate-500 dark:text-slate-400 pb-2">
             Chưa có tài khoản?{' '}
             <button type="button" onClick={() => setActiveCard('register')} className="font-black text-slate-900 dark:text-white hover:underline relative z-30 uppercase tracking-tighter">
               Đăng ký ngay
             </button>
          </div>
        </motion.div>

      </div>
      
    </div>
  );
}


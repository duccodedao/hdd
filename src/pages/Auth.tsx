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

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegisterRoute = location.pathname.includes('register');
  const [activeCard, setActiveCard] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');
  const [rememberMe, setRememberMe] = useState(false);

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
    if (!identifier || !loginPassword) return toast.error('Incomplete data.');
    
    setLoginLoading(true);
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
    if (!registerName || !registerEmail || !registerPhone || !registerPassword) return toast.error('Incomplete data.');
    if (!agreeToTerms) return toast.error('Mandatory agreement required.');
    
    setRegisterLoading(true);
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
        role: (registerEmail === 'sonlyhongduc@gmail.com' || registerEmail === 'cuong.nguyen1@ghn.vn') ? 'superadmin' : 'user',
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
          role: (userCred.user.email === 'sonlyhongduc@gmail.com' || userCred.user.email === 'cuong.nguyen1@ghn.vn') ? 'superadmin' : 'user',
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row relative overflow-hidden animate-fade-in">
      <Helmet>
        <title>{activeCard === 'login' ? 'Đăng nhập' : 'Đăng ký'} | BMASS Dashboard</title>
        <meta name="description" content="Truy cập vào hệ điều hành quản trị bảo mật BMASS." />
      </Helmet>
      {/* Premium Mastercard-style Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] max-w-[1200px] bg-gradient-to-br from-[#eb001b]/10 to-transparent rounded-full blur-[120px] opacity-40" />
         <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[1000px] bg-gradient-to-tr from-[#f79e1b]/10 to-transparent rounded-full blur-[100px] opacity-30" />
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      </div>

      {/* Visual Side */}
      <div className="hidden md:flex flex-col justify-between p-16 w-1/2 relative bg-slate-100 dark:bg-zinc-950 border-r border-slate-200 dark:border-white/5 overflow-hidden">
         <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] bg-[#eb001b]/5 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-[#f79e1b]/5 rounded-full blur-[100px]" />
         
         <div className="relative z-10">
            <div className="flex items-center gap-6 mb-16">
               <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 w-full h-full bg-[#eb001b] rounded-full mix-blend-screen opacity-80" />
                  <div className="absolute inset-0 w-full h-full bg-[#f79e1b] rounded-full mix-blend-screen opacity-80 translate-x-3" />
                  <CreditCard className="relative z-10 w-5 h-5 text-white" />
               </div>
               <span className="text-2xl font-display font-semibold text-white tracking-[0.3em] uppercase italic">bmass.</span>
            </div>

            <div className="space-y-8">
                <h2 className="text-6xl lg:text-8xl font-serif italic font-medium text-white tracking-tighter leading-[0.85] max-w-md lowercase">
                   Quản trị <br /> <span className="text-zinc-700">định danh.</span>
                </h2>
                <p className="text-zinc-400 text-xl max-w-sm leading-relaxed font-medium italic">
                  Trải nghiệm sự vĩ đại từ những điều nhỏ nhất. Bảo mật là một đặc quyền, không phải gánh nặng.
                </p>
            </div>
         </div>

         <div className="relative z-10 flex gap-20">
            {[
              { label: 'Uptime', val: '99.9%', color: '#eb001b' },
              { label: 'Security', val: 'PRO', color: '#f79e1b' }
            ].map(stat => (
              <div key={stat.label} className="space-y-2">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">{stat.label}</p>
                 <p className="text-4xl font-serif italic font-medium text-white">{stat.val}</p>
                 <div className="h-0.5 w-8" style={{ backgroundColor: stat.color }} />
              </div>
            ))}
         </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md space-y-10">
          <header className="space-y-4">
             <div className="flex items-center justify-between">
                <button 
                  onClick={() => navigate(-1)}
                  className="group flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-all"
                >
                   <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                   Quay lại
                </button>
                <div className="md:hidden flex items-center gap-4">
                   <div className="relative w-8 h-8 flex items-center justify-center">
                      <div className="absolute inset-0 w-full h-full bg-[#eb001b] rounded-full mix-blend-screen opacity-80" />
                      <div className="absolute inset-0 w-full h-full bg-[#f79e1b] rounded-full mix-blend-screen opacity-80 translate-x-2" />
                      <CreditCard className="relative z-10 w-4 h-4 text-white" />
                   </div>
                </div>
             </div>

             <div className="space-y-2 lg:space-y-3">
               <h3 className="text-3xl lg:text-4xl font-serif italic text-white tracking-tighter lowercase">
                 {activeCard === 'login' ? 'Kết nối hệ thống.' : 'Thiết lập định danh.'}
               </h3>
               <p className="text-zinc-400 text-base lg:text-lg font-medium italic leading-tight">
                  {activeCard === 'login' ? 'Yêu cầu xác thực để truy cập hệ thống cốt lõi.' : 'Đăng ký nhận diện kỹ thuật số của bạn vào hệ thống.'}
               </p>
             </div>
          </header>

          <div className="space-y-6">
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
               <button 
                 onClick={() => setActiveCard('login')}
                 className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeCard === 'login' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300')}
               >
                 Đăng Nhập
               </button>
               <button 
                 onClick={() => setActiveCard('register')}
                 className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeCard === 'register' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300')}
               >
                 Đăng Ký
               </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {activeCard === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Định Danh / Email</label>
                        <div className="relative group">
                          <input 
                            id="identifier"
                            type="text" 
                            autoComplete="username"
                            disabled={loginLoading}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="h-11 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white placeholder:text-zinc-700"
                            placeholder="Email hoặc số điện thoại"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1 px-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mật khẩu</label>
                          <button type="button" onClick={() => setShowForgotModal(true)} className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Khôi phục mật khẩu?</button>
                        </div>
                        <div className="relative">
                          <input 
                            id="loginPassword"
                            type={showLoginPassword ? "text" : "password"} 
                            autoComplete="current-password"
                            disabled={loginLoading}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="h-11 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 pr-12 outline-none focus:border-white/20 transition-all text-sm font-medium text-white placeholder:text-zinc-700"
                            placeholder="••••••••"
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer group pt-2">
                        <div 
                          onClick={() => setRememberMe(!rememberMe)}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                            rememberMe ? "bg-white border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-zinc-900 border-white/10 group-hover:border-white/20"
                          )}
                        >
                          {rememberMe && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Giữ trạng thái đăng nhập</span>
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loginLoading}
                      className="w-full h-11 bg-white text-black hover:bg-[#ff5f00] hover:text-white rounded-xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group/btn"
                    >
                      {loginLoading ? <MiniLoading className="w-4 h-4 text-black" /> : <>Access System <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Tên Hiển Thị</label>
                        <input 
                          id="registerName"
                          type="text" 
                          autoComplete="name"
                          disabled={registerLoading}
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className="h-10 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Đăng Ký</label>
                        <input 
                          id="registerEmail"
                          type="email" 
                          autoComplete="email"
                          disabled={registerLoading}
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="h-10 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Số Điện Thoại</label>
                        <input 
                          id="registerPhone"
                          type="tel" 
                          autoComplete="tel"
                          disabled={registerLoading}
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          className="h-10 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                        <input 
                          id="registerPassword"
                          type="password" 
                          autoComplete="new-password"
                          disabled={registerLoading}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className="h-10 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                          required
                        />
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer group mt-4">
                        <div 
                          onClick={() => setAgreeToTerms(!agreeToTerms)}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                            agreeToTerms ? "bg-white border-white" : "bg-zinc-900 border-white/10"
                          )}
                        >
                          {agreeToTerms && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Đồng ý với điều khoản & dịch vụ</span>
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={registerLoading}
                      className="w-full h-11 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                      {registerLoading ? <MiniLoading className="w-4 h-4 text-black" /> : 'Đăng Ký Danh Tính'}
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                 <div className="flex-1 h-px bg-white/5"></div>
                 <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Hoặc</span>
                 <div className="flex-1 h-px bg-white/5"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleAuth}
                disabled={loginLoading || registerLoading || googleLoading}
                className="w-full h-12 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50 group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Đăng nhấp bằng Google</span>
              </button>

              <footer className="flex justify-center gap-8 pt-4">
                 <Link to="/terms" className="text-[9px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Điều khoản</Link>
                 <Link to="/privacy" className="text-[9px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Bảo mật</Link>
                 <Link to="/help" className="text-[9px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Hỗ trợ</Link>
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
              className="relative w-full max-w-sm glass-card border border-white/10 p-10 rounded-[2.5rem] shadow-2xl"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-all bg-white/5 rounded-full"
               >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6 text-center pt-4 mb-8">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Mail className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-white tracking-tight">Khôi Phục Quyền Truy Cập</h3>
                  <p className="text-xs text-zinc-500 font-medium">Bảo mật tài khoản liên kết qua email.</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Đăng Ký</label>
                  <input 
                    type="text" 
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="h-11 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full h-11 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {forgotLoading ? <MiniLoading className="w-4 h-4 text-black" /> : 'Gửi Yêu Cầu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

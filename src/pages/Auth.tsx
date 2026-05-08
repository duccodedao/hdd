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
import { Mail, Lock, X, Sparkles, User, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, Fingerprint } from 'lucide-react';
import { logActivity, ActivityType } from '../services/activityService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
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
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokStatus = params.get('tiktok_status');
    const message = params.get('message');
    
    if (tiktokStatus === 'unlinked') {
       toast.error('Tài khoản TikTok chưa được liên kết. Vui lòng đăng nhập bằng tài khoản sẵn có và liên kết sau.');
       window.history.replaceState({}, '', '/auth');
    } else if (tiktokStatus === 'error') {
       toast.error('Lỗi nhận diện TikTok: ' + (message || 'Vui lòng thử lại.'));
       window.history.replaceState({}, '', '/auth');
    }
  }, []);

  const handleTiktokLogin = () => {
    setTiktokLoading(true);
    window.location.href = '/api/auth/tiktok';
  };
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const resolveIdentifierToEmail = async (id: string) => {
    if (id.includes('@')) return id;
    const q = query(collection(db, 'users'), where('phoneNumber', '==', id));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Tài khoản/Số điện thoại không tồn tại.');
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
    if (!identifier || !loginPassword) return toast.error('Vui lòng nhập đầy đủ thông tin.');
    
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
      await logActivity(ActivityType.LOGIN, `Đăng nhập qua ${identifier.includes('@') ? 'Email' : 'Phone'}`);
      await checkAndSaveLocation(userCred.user.uid);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPhone || !registerPassword) return toast.error('Vui lòng nhập đầy đủ thông tin.');
    if (!agreeToTerms) return toast.error('Bạn cần đồng ý với Điều khoản Dịch vụ để tiếp tục.');
    
    setRegisterLoading(true);
    try {
      // Check phone existence
      const qPhone = query(collection(db, 'users'), where('phoneNumber', '==', registerPhone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        throw new Error('Số điện thoại đã được sử dụng.');
      }

      const userCred = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: userCred.user.email,
        phoneNumber: registerPhone,
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
      toast.error(error.message || 'Tạo tài khoản thất bại.');
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
    if (!forgotIdentifier) return toast.error('Identifier required.');
    
    setForgotLoading(true);
    try {
      const email = await resolveIdentifierToEmail(forgotIdentifier);
      await sendPasswordResetEmail(auth, email);
      toast.success('Recovery link dispatched to Gmail.');
      setShowForgotModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Dispatched failed.');
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email hoặc Số điện thoại</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                        <input 
                          type="text" 
                          disabled={loginLoading}
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="h-12 w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                          placeholder="Email hoặc số điện thoại"
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

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div 
                        onClick={() => setRememberMe(!rememberMe)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                          rememberMe ? "bg-indigo-600 border-indigo-500" : "bg-white/5 border-white/10 group-hover:border-white/20"
                        )}
                      >
                        {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ghi nhớ mật khẩu</span>
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loginLoading}
                    className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {loginLoading ? <MiniLoading className="w-5 h-5 mx-auto" /> : 'Đăng nhập hệ thống'}
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Số điện thoại (Bắt buộc)</label>
                      <input 
                        type="tel" 
                        disabled={registerLoading}
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 outline-none focus:border-white transition-all text-sm font-medium text-white placeholder:text-slate-700"
                        placeholder="09xx xxx xxx"
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

                    <label className="flex items-center gap-3 cursor-pointer group mt-4">
                      <div 
                        onClick={() => setAgreeToTerms(!agreeToTerms)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                          agreeToTerms ? "bg-indigo-600 border-indigo-500" : "bg-white/5 border-white/10 group-hover:border-white/20"
                        )}
                      >
                        {agreeToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tôi đồng ý với Điều khoản Dịch vụ</span>
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={registerLoading}
                    className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {registerLoading ? <MiniLoading className="w-5 h-5 mx-auto" /> : 'Bắt đầu ngay'}
                  </button>

                  <p className="text-[9px] text-slate-600 font-medium text-center uppercase tracking-widest leading-relaxed mt-4">
                    Bằng việc đăng ký, bạn đồng ý với <br />
                    <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Điều khoản</Link> và <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Chính sách bảo mật</Link>
                  </p>
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
              disabled={loginLoading || registerLoading || googleLoading || tiktokLoading}
              className="w-full h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Tiếp tục bằng Google</span>
            </button>

            <button 
              type="button"
              onClick={handleTiktokLogin}
              disabled={loginLoading || registerLoading || googleLoading || tiktokLoading}
              className="w-full h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <img src="https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png" className="w-4 h-4" alt="TikTok" onError={(e) => (e.currentTarget.src = 'https://www.tiktok.com/favicon.ico')} />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">Tiếp tục bằng TikTok</span>
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
                  <p className="text-xs text-slate-500 font-medium">Nhập Email hoặc SĐT để nhận link khôi phục.</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email hoặc SĐT</label>
                  <input 
                    type="text" 
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 outline-none focus:border-white transition-all text-sm font-medium text-white"
                    placeholder="Email hoặc số điện thoại"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full h-12 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {forgotLoading ? <MiniLoading className="w-4 h-4 mx-auto" /> : 'Gửi yêu cầu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


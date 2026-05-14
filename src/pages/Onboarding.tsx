import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  updateDoc, doc, setDoc, query, collection, where, getDocs 
} from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, Lock, Shield, ChevronRight, CheckCircle2, 
  ArrowLeft, Loader2, Copy, Eye, EyeOff 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateSecret, generateURI, verifySync } from 'otplib';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, userData, setUserData } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Phone
  const [phone, setPhone] = useState('');

  // Step 2: Password (Optional)
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Step 3: 2FA (Optional)
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<1 | 2>(1);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (userData?.onboardingCompleted) {
      navigate('/');
    }
  }, [user, userData, navigate]);

  // Init 2FA secret when needed
  useEffect(() => {
    if (show2FAForm && !secret) {
      const gSecret = generateSecret();
      const userEmail = user?.email || 'user';
      const otpauth = generateURI({ issuer: 'BMass ecosystem', label: userEmail, secret: gSecret, strategy: 'totp' });
      setSecret(gSecret);
      setQrCodeUrl(otpauth);
    }
  }, [show2FAForm, secret, user?.email]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return toast.error('Vui lòng nhập số điện thoại');
    
    setLoading(true);
    try {
      // Check if phone exists
      const q = query(collection(db, 'users'), where('phoneNumber', '==', phone));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== user?.uid) {
        throw new Error('Số điện thoại đã được sử dụng bởi tài khoản khác');
      }

      await updateDoc(doc(db, 'users', user!.uid), {
        phoneNumber: phone
      });
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi cập nhật số điện thoại');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (showPasswordForm) {
      if (!password) return toast.error('Vui lòng nhập mật khẩu');
      if (password.length < 6) return toast.error('Mật khẩu phải ít nhất 6 ký tự');
      if (password !== confirmPassword) return toast.error('Mật khẩu xác nhận không khớp');

      setLoading(true);
      try {
        await updatePassword(user!, password);
        toast.success('Đã thiết lập mật khẩu');
        setStep(3);
      } catch (error: any) {
        console.error(error);
        if (error.code === 'auth/requires-recent-login') {
          toast.error('Vui lòng đăng nhập lại để thiết lập mật khẩu');
        } else {
          toast.error('Lỗi khi thiết lập mật khẩu');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setStep(3);
    }
  };

  const handleStep3 = async () => {
    if (show2FAForm) {
      if (verificationCode.length !== 6) return toast.error('Vui lòng nhập mã 6 số');
      
      setLoading(true);
      try {
        const result = verifySync({ token: verificationCode, secret, strategy: 'totp' });
        if (!result.valid) throw new Error('Mã xác thực không đúng');

        await updateDoc(doc(db, 'users', user!.uid), {
          twoFactorEnabled: true,
          onboardingCompleted: true
        });
        await setDoc(doc(db, 'users', user!.uid, 'private', 'security'), {
          twoFactorSecret: secret
        });
        toast.success('Đã hoàn tất thiết lập 2FA');
        navigate('/');
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi bật 2FA');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await updateDoc(doc(db, 'users', user!.uid), {
          onboardingCompleted: true
        });
        toast.success('Chào mừng bạn đến với BMass!');
        navigate('/');
      } catch (error) {
        toast.error('Lỗi khi hoàn tất onboarding');
      } finally {
        setLoading(false);
      }
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[100vw] h-[100vw] max-w-[1200px] bg-gradient-to-br from-blue-600/10 via-indigo-500/5 to-transparent rounded-full blur-[140px] opacity-40 dark:opacity-30" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[80vw] h-[80vw] max-w-[1000px] bg-gradient-to-tr from-emerald-600/10 via-teal-500/5 to-transparent rounded-full blur-[120px] opacity-30 dark:opacity-20" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-[1] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />

      <div className="w-full max-w-xl relative z-10">
        {/* Progress Bar */}
        <div className="flex gap-3 mb-16">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={cn(
                "flex-1 h-1 rounded-full transition-all duration-700 ease-in-out",
                step >= s ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-white/10"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 bg-blue-500/10 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 dark:border-indigo-500/20 mb-8">
                  <Smartphone className="w-7 h-7 text-blue-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-5xl lg:text-6xl font-serif italic font-medium text-slate-900 dark:text-white tracking-tight leading-none">Xác thực <br /> <span className="text-slate-300 dark:text-zinc-700">danh tính.</span></h1>
                <p className="text-slate-500 dark:text-zinc-500 font-medium text-lg italic max-w-md">Chúng tôi cần số điện thoại của bạn để thiết lập các giao thức bảo mật tài khoản.</p>
              </div>

              <form onSubmit={handleStep1} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Số Điện Thoại</label>
                  <input 
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="h-16 w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl px-6 outline-none focus:border-blue-500/50 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-indigo-500/5 transition-all text-xl font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-700"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-2xl shadow-slate-950/10 dark:shadow-white/5"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Tiếp tục <ChevronRight className="w-5 h-5" /></>}
                </button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-8">
                  <Lock className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h1 className="text-5xl lg:text-6xl font-serif italic font-medium text-slate-900 dark:text-white tracking-tight leading-none">Thiết lập <br /> <span className="text-slate-300 dark:text-zinc-700">mật khẩu.</span></h1>
                <p className="text-slate-500 dark:text-zinc-500 font-medium text-lg italic max-w-md">Bạn có muốn thiết lập mật khẩu để đăng nhập trực tiếp qua hệ thống định danh không?</p>
              </div>

              <div className="space-y-8">
                <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <button 
                    onClick={() => setShowPasswordForm(false)}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                      !showPasswordForm ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xl dark:shadow-none" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                    )}
                  >
                    Bỏ qua sau
                  </button>
                  <button 
                    onClick={() => setShowPasswordForm(true)}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                      showPasswordForm ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xl dark:shadow-none" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                    )}
                  >
                    Thiết lập ngay
                  </button>
                </div>

                <AnimatePresence>
                  {showPasswordForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5 overflow-hidden"
                    >
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                        <div className="relative">
                          <input 
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-14 w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl px-5 pr-14 outline-none focus:border-purple-500/50 transition-all text-base font-semibold text-slate-900 dark:text-white"
                            placeholder="Tối thiểu 6 ký tự"
                          />
                          <button 
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                        <input 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-14 w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl px-5 outline-none focus:border-purple-500/50 transition-all text-base font-semibold text-slate-900 dark:text-white"
                          placeholder="Nhập lại mật khẩu"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={handleStep2}
                  disabled={loading}
                  className="w-full h-16 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Tiếp tục <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-8">
                  <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-5xl lg:text-6xl font-serif italic font-medium text-slate-900 dark:text-white tracking-tight leading-none">Bảo mật <br /> <span className="text-slate-300 dark:text-zinc-700">đa lớp.</span></h1>
                <p className="text-slate-500 dark:text-zinc-500 font-medium text-lg italic max-w-md">Kích hoạt mã 2FA để bảo vệ tuyệt đối các truy cập hệ thống của bạn.</p>
              </div>

              <div className="space-y-8">
                <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                  <button 
                    onClick={() => setShow2FAForm(false)}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                      !show2FAForm ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xl dark:shadow-none" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                    )}
                  >
                    Bỏ qua sau
                  </button>
                  <button 
                    onClick={() => setShow2FAForm(true)}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                      show2FAForm ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-xl dark:shadow-none" : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                    )}
                  >
                    Bật ngay
                  </button>
                </div>

                <AnimatePresence>
                  {show2FAForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-8 pt-4"
                    >
                      {twoFactorStep === 1 ? (
                        <div className="space-y-8">
                           <div className="p-10 bg-white rounded-[3rem] flex items-center justify-center shadow-2xl dark:shadow-none mx-auto w-fit">
                              {qrCodeUrl && <QRCodeSVG value={qrCodeUrl} size={200} level="H" includeMargin={true} />}
                           </div>
                           <div className="space-y-3">
                             <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Mã thiết lập dự phòng:</p>
                             <div 
                               onClick={copySecret}
                               className="w-full bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 font-mono text-slate-600 dark:text-zinc-300 tracking-[0.2em] flex items-center justify-between cursor-pointer transition-all group"
                             >
                               <span className="text-sm break-all font-bold uppercase">{secret}</span>
                               {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />}
                             </div>
                           </div>
                           <button 
                             onClick={() => setTwoFactorStep(2)}
                             className="w-full py-5 border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                           >
                             Tôi đã quét mã xác thực
                           </button>
                        </div>
                      ) : (
                        <div className="space-y-8">
                           <div className="space-y-4">
                             <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1 text-center block">Nhập mã định danh 6 số</label>
                             <input 
                               type="text"
                               maxLength={6}
                               value={verificationCode}
                               onChange={(e) => setVerificationCode(e.target.value)}
                               placeholder="000 000"
                               className="w-full h-20 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl text-center text-5xl font-mono font-bold tracking-[0.4em] text-slate-900 dark:text-white outline-none focus:border-blue-500/50 dark:focus:border-indigo-500/50 placeholder:text-slate-200 dark:placeholder:text-zinc-800"
                             />
                           </div>
                           <button 
                             onClick={() => setTwoFactorStep(1)}
                             className="w-full text-[10px] font-bold text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors"
                           >
                             Cần hiển thị lại mã QR?
                           </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={handleStep3}
                  disabled={loading || (show2FAForm && twoFactorStep === 2 && verificationCode.length !== 6)}
                  className="w-full h-16 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : show2FAForm ? 'Kích hoạt & Hoàn tất' : 'Hoàn tất thiết lập'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

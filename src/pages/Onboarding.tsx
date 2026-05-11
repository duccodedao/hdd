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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-lg relative z-10">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={cn(
                "flex-1 h-1 rounded-full transition-all duration-500",
                step >= s ? "bg-white" : "bg-white/10"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-6">
                  <Smartphone className="w-6 h-6 text-indigo-400" />
                </div>
                <h1 className="text-4xl font-display font-medium text-white italic tracking-tight">Xác thực danh tính.</h1>
                <p className="text-zinc-500 font-medium">Chúng tôi cần số điện thoại của bạn để bảo mật tài khoản.</p>
              </div>

              <form onSubmit={handleStep1} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Số Điện Thoại</label>
                  <input 
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="h-14 w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 outline-none focus:border-white/20 transition-all text-lg font-medium text-white placeholder:text-zinc-700"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Tiếp tục <ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-6">
                  <Lock className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="text-4xl font-display font-medium text-white italic tracking-tight">Thiết lập mật khẩu.</h1>
                <p className="text-zinc-500 font-medium">Bạn có muốn thiết lập mật khẩu để đăng nhập trực tiếp không?</p>
              </div>

              <div className="space-y-6">
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
                  <button 
                    onClick={() => setShowPasswordForm(false)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      !showPasswordForm ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Bỏ qua sau
                  </button>
                  <button 
                    onClick={() => setShowPasswordForm(true)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      showPasswordForm ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
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
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                        <div className="relative">
                          <input 
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 pr-12 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                          />
                          <button 
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                          >
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                        <input 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-white/20 transition-all text-sm font-medium text-white"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={handleStep2}
                  disabled={loading}
                  className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : showPasswordForm ? 'Lưu mật khẩu & Tiếp tục' : 'Tiếp tục'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-6">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <h1 className="text-4xl font-display font-medium text-white italic tracking-tight">Bảo mật 2 lớp.</h1>
                <p className="text-zinc-500 font-medium">Tăng cường bảo mật tối đa cho hệ thống định danh của bạn?</p>
              </div>

              <div className="space-y-6">
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
                  <button 
                    onClick={() => setShow2FAForm(false)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      !show2FAForm ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Bỏ qua sau
                  </button>
                  <button 
                    onClick={() => setShow2FAForm(true)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      show2FAForm ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
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
                      className="space-y-6 pt-4"
                    >
                      {twoFactorStep === 1 ? (
                        <div className="space-y-6">
                           <div className="p-8 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl">
                              {qrCodeUrl && <QRCodeSVG value={qrCodeUrl} size={180} level="M" />}
                           </div>
                           <div className="space-y-3">
                             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mã thiết lập thủ công:</p>
                             <div 
                               onClick={copySecret}
                               className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl px-4 py-4 font-mono text-zinc-300 tracking-wider flex items-center justify-between cursor-pointer transition-colors group"
                             >
                               <span className="text-xs break-all">{secret}</span>
                               {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-zinc-600 group-hover:text-white" />}
                             </div>
                           </div>
                           <button 
                             onClick={() => setTwoFactorStep(2)}
                             className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 transition-all"
                           >
                             Tôi đã quét mã
                           </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <div className="space-y-3">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nhập mã 6 số của bạn</label>
                             <input 
                               type="text"
                               maxLength={6}
                               value={verificationCode}
                               onChange={(e) => setVerificationCode(e.target.value)}
                               placeholder="000 000"
                               className="w-full h-16 bg-zinc-900 border border-white/10 rounded-2xl text-center text-3xl font-mono font-bold tracking-[0.5em] text-white outline-none focus:border-indigo-500/50"
                             />
                           </div>
                           <button 
                             onClick={() => setTwoFactorStep(1)}
                             className="w-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                           >
                             Quay lại mã QR
                           </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={handleStep3}
                  disabled={loading || (show2FAForm && twoFactorStep === 2 && verificationCode.length !== 6)}
                  className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : show2FAForm ? 'Kích hoạt & Hoàn tất' : 'Hoàn tất Onboarding'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

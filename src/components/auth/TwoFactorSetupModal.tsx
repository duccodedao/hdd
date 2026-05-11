import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Shield, X, Loader2, Copy, CheckCircle2 } from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TwoFactorSetupModal({ isOpen, onClose }: TwoFactorSetupModalProps) {
  const { user, userData } = useAuthStore();
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && user && !userData?.twoFactorEnabled) {
      const gSecret = generateSecret();
      const userEmail = user.email || 'user';
      const otpauth = generateURI({ issuer: 'BMass ecosystem', label: userEmail, secret: gSecret, strategy: 'totp' });
      setSecret(gSecret);
      setQrCodeUrl(otpauth);
      setSetupStep(1);
      setVerificationCode('');
    }
  }, [isOpen, user, userData?.twoFactorEnabled]);

  const handleVerifyAndEnable = async () => {
    if (!user) return;
    if (verificationCode.length !== 6) {
      toast.error('Vui lòng nhập mã xác thực 6 chữ số');
      return;
    }

    const result = verifySync({ token: verificationCode, secret, strategy: 'totp' });
    if (!result.valid) {
      toast.error('Mã xác thực không đúng. Vui lòng thử lại.');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: true
      });
      await setDoc(doc(db, 'users', user.uid, 'private', 'security'), {
        twoFactorSecret: secret
      });
      toast.success('Đã bật xác thực 2 lớp!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Đã xảy ra lỗi khi lưu cài đặt.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: false
      });
      await setDoc(doc(db, 'users', user.uid, 'private', 'security'), {
        twoFactorSecret: null
      });
      toast.success('Đã vô hiệu hoá xác thực 2 lớp');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Đã xảy ra lỗi khi vô hiệu hoá.');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-8">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-6">
              <Shield className="w-6 h-6" />
            </div>
            
            <h2 className="text-2xl font-display font-medium text-white italic mb-2">Xác thực 2 lớp (2FA)</h2>
            <p className="text-sm font-medium text-zinc-500 mb-8">Bảo vệ tài khoản của bạn bằng cách yêu cầu mã xác thực mỗi khi đăng nhập.</p>

            {userData?.twoFactorEnabled ? (
              <div className="space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center">
                   <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                   </div>
                   <div>
                     <h3 className="text-white font-medium text-lg">2FA Đã được bật</h3>
                     <p className="text-zinc-400 text-sm mt-1">Tài khoản của bạn đang được bảo vệ an toàn.</p>
                   </div>
                </div>
                
                <button
                  onClick={handleDisable}
                  disabled={loading}
                  className="w-full py-4 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Vô hiệu hóa 2FA'}
                </button>
              </div>
            ) : (
               <div className="space-y-6">
                 {setupStep === 1 ? (
                   <div className="space-y-6 relative">
                     <div className="p-6 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                        {qrCodeUrl && <QRCodeSVG value={qrCodeUrl} size={180} level="M" />}
                     </div>
                     <div className="space-y-2">
                       <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Hoặc nhập mã này thủ công:</p>
                       <div 
                         onClick={copySecret}
                         className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-xl px-3 py-3 font-mono text-xs sm:text-sm text-zinc-300 tracking-wider flex items-center justify-between cursor-pointer transition-colors group break-all"
                       >
                         <span className="break-all text-[10px] sm:text-xs leading-none">{secret}</span>
                         <div className="text-zinc-500 group-hover:text-white transition-colors">
                           {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                         </div>
                       </div>
                     </div>
                     <button
                        onClick={() => setSetupStep(2)}
                        className="w-full py-4 text-black bg-white hover:bg-zinc-200 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all"
                      >
                        Tiếp tục
                      </button>
                   </div>
                 ) : (
                   <div className="space-y-6">
                     <div className="space-y-3">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Nhập mã xác thực từ ứng dụng</label>
                       <input
                         type="text"
                         value={verificationCode}
                         onChange={e => setVerificationCode(e.target.value)}
                         placeholder="000000"
                         maxLength={6}
                         className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all font-bold"
                       />
                     </div>
                     <div className="flex gap-4">
                       <button
                          onClick={() => setSetupStep(1)}
                          className="flex-1 py-4 text-zinc-400 bg-zinc-900 hover:bg-zinc-800 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all"
                        >
                          Quay lại
                        </button>
                        <button
                          onClick={handleVerifyAndEnable}
                          disabled={loading || verificationCode.length !== 6}
                          className="flex-1 py-4 text-black bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all"
                        >
                          {loading ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Xác nhận code'}
                        </button>
                     </div>
                   </div>
                 )}
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

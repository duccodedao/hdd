import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, ShieldAlert, LogOut, Delete, HelpCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface AdminPinLockScreenProps {
  expectedPin: string;
  onVerified: () => void;
}

export default function AdminPinLockScreen({ expectedPin, onVerified }: AdminPinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount and whenever clicking the screen
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setError(false);
      const newPin = pin + num;
      setPin(newPin);
      checkPin(newPin);
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPin('');
  };

  const handleNativeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(false);
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(val);
    checkPin(val);
  };

  const checkPin = (currentPin: string) => {
    if (currentPin.length === 4) {
      setLoading(true);
      setTimeout(() => {
        if (currentPin === expectedPin) {
          toast.success('Xác minh lớp bảo mật thành công! Chào mừng Quản trị viên.');
          onVerified();
        } else {
          setError(true);
          setPin('');
          toast.error('Mã PIN bảo mật không chính xác!');
          // Shake effect
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        }
        setLoading(false);
      }, 400); // Small realistic verification delay
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Đã đăng xuất khỏi cổng quản trị.');
    } catch (err: any) {
      toast.error('Lỗi khi đăng xuất: ' + err.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-[#0a0a0c] flex items-center justify-center p-4 font-sans select-none overflow-hidden"
      onClick={handleContainerClick}
    >
      {/* Abstract Glowing Nebula Background */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-rose-600/10 rounded-full blur-[130px] pointer-events-none" />
      
      {/* Hidden Native Input to trigger native numerical keypad on mobile */}
      <input
        ref={inputRef}
        type="tel"
        pattern="[0-9]*"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={handleNativeInputChange}
        className="opacity-0 absolute -z-50 w-px h-px pointer-events-none"
        autoFocus
        autoComplete="one-time-code"
      />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Gateway Card */}
        <motion.div
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full bg-zinc-900/85 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-center"
        >
          {/* Top Decorative bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
          
          <div className="flex flex-col items-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${error ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
              {error ? (
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              ) : pin.length === 4 ? (
                <Unlock className="w-8 h-8 text-emerald-400" />
              ) : (
                <Lock className="w-8 h-8" />
              )}
            </div>
            
            <h2 className="text-xl font-bold text-white mt-4 tracking-tight">XÁC MINH CỔNG QUẢN TRỊ</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs uppercase tracking-wider">Lớp bảo mật Super Admin (4 chữ số)</p>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-6 my-8">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div key={index} className="relative w-5 h-5 flex items-center justify-center">
                  <motion.div
                    animate={isFilled ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      error 
                        ? 'bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                        : isFilled 
                        ? 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.6)]' 
                        : 'border-2 border-zinc-700 bg-transparent'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-400 mb-8 max-w-[260px] mx-auto leading-relaxed">
            Nhấn vào màn hình này để mở bàn phím mặc định của điện thoại hoặc nhấp các phím phía dưới.
          </p>

          {/* Visual Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNumberClick(num);
                }}
                disabled={loading}
                className="w-16 h-16 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 text-white font-extrabold text-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              disabled={loading || pin.length === 0}
              className="w-16 h-16 rounded-2xl text-zinc-500 hover:text-rose-400 font-extrabold text-xs uppercase flex items-center justify-center active:scale-95 transition-all disabled:opacity-30 cursor-pointer"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNumberClick('0');
              }}
              disabled={loading}
              className="w-16 h-16 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 text-white font-extrabold text-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBackspace();
              }}
              disabled={loading || pin.length === 0}
              className="w-16 h-16 rounded-2xl text-zinc-500 hover:text-amber-400 flex items-center justify-center active:scale-95 transition-all disabled:opacity-30 cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Cancel & Logout option */}
          <div className="mt-8 border-t border-white/5 pt-6 flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 hover:border-rose-500/20 text-xs font-bold transition-all uppercase tracking-wider"
            >
              <LogOut className="w-3.5 h-3.5" /> Hủy & Đăng xuất
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, X, Share, PlusSquare, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PwaBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detect standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Don't show if already standalone or dismissed
    if (standalone || localStorage.getItem('pwa-dismissed') === 'true') return;

    // Listen for install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Show iOS instructions if on iOS
    if (ios && !standalone) {
      setTimeout(() => setShow(true), 3000); // Wait 3s
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-dismissed', 'true');
  };

  if (!show || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 z-[9999] md:max-w-md md:left-auto md:right-4"
      >
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-2xl shadow-indigo-500/10">
          <button onClick={dismiss} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Download size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Cài đặt ứng dụng</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Trải nghiệm ứng dụng nhanh hơn, mượt hơn.</p>
            </div>
          </div>

          <div className="mt-4">
            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
                <p className="flex items-center gap-2"><span>1.</span> Nhấn nút <Share size={14} className="inline" /> Share</p>
                <p className="flex items-center gap-2"><span>2.</span> Chọn <PlusSquare size={14} className="inline" /> Add to Home Screen</p>
              </div>
            ) : (
              <button 
                onClick={handleInstall}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Cài đặt ngay
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

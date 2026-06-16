import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Clock, Copy, Check } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import toast from 'react-hot-toast';

export default function AffiliateBanner() {
  const { affiliateAds, snoozeAdUntil, setSnoozeAdUntil } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (affiliateAds && affiliateAds.active) {
      const now = Date.now();
      if (snoozeAdUntil && now < snoozeAdUntil) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
    }
  }, [affiliateAds, snoozeAdUntil]);

  const handleSnooze = () => {
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    setSnoozeAdUntil(oneHourFromNow);
    setIsVisible(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép mã giới thiệu!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVisible || !affiliateAds) return null;

  return (
    <AnimatePresence>
      <div className="relative">
        {/* Desktop Banner */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="hidden md:block w-full bg-indigo-50 dark:bg-zinc-900 border-b border-indigo-100 dark:border-white/10 px-4 py-3 z-[100]"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <img src={affiliateAds.logoUrl} alt={affiliateAds.projectName} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100 dark:border-white/5" />
               <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{affiliateAds.projectName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">{affiliateAds.description}</p>
                    {affiliateAds.codeRef && (
                      <div className="flex items-center gap-1.5 ml-1 px-2 py-0.5 bg-white dark:bg-white/5 border border-indigo-100 dark:border-white/10 rounded text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        <span>Ref: {affiliateAds.codeRef}</span>
                        <button onClick={() => copyToClipboard(affiliateAds.codeRef)} className="hover:text-indigo-800 dark:hover:text-white transition-colors">
                          {copied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                  onClick={handleSnooze}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-white dark:hover:bg-white/5 transition-colors"
                  title="Tắt trong 1 giờ"
               >
                  <Clock size={16} />
               </button>
               <a 
                  href={affiliateAds.linkRef} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm whitespace-nowrap"
               >
                  Mở App
                  <ExternalLink size={12} />
               </a>
               <button 
                  onClick={() => setIsVisible(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white dark:hover:bg-white/5 transition-colors"
               >
                  <X size={16} />
               </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile Pop-up */}
        <div className="md:hidden fixed inset-0 z-[1000] flex items-end justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <img src={affiliateAds.logoUrl} alt={affiliateAds.projectName} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100 dark:border-white/5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{affiliateAds.projectName}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">{affiliateAds.description}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsVisible(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {affiliateAds.codeRef && (
              <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-white/5 border border-dashed border-indigo-200 dark:border-indigo-400/20 rounded-xl mb-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-indigo-500 dark:text-indigo-400 tracking-wider">Mã giới thiệu</span>
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-widest">{affiliateAds.codeRef}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(affiliateAds.codeRef)}
                  className="p-2 bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-white/5 shadow-sm active:scale-95 transition-all"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={handleSnooze}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Clock size={14} />
                Tắt 1h
              </button>
              <a 
                href={affiliateAds.linkRef} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-[2] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                Trải nghiệm ngay
                <ExternalLink size={14} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

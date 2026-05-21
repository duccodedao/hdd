import React, { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AlertCircle, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function NotificationMarquee() {
  const [config, setConfig] = useState({
    active: false,
    message: '',
    isEmergency: false
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists() && snap.data().notificationConfig) {
        setConfig(snap.data().notificationConfig);
      }
    });
    return () => unsub();
  }, []);

  if (!config.active || !config.message) return null;

  return (
    <div className={cn(
      "relative flex items-center overflow-hidden h-8 sm:h-auto py-1 sm:py-1.5 px-2 outline-none border-y shrink-0",
      config.isEmergency 
        ? "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
        : "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400"
    )}>
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[currentColor] opacity-10 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[currentColor] opacity-10 to-transparent pointer-events-none z-10" />
      
      <div className="flex items-center shrink-0 pl-2 pr-3 z-20 bg-inherit border-r border-[currentColor] border-opacity-20 gap-2">
        {config.isEmergency ? <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> : <Zap className="w-3.5 h-3.5" />}
        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">
          {config.isEmergency ? 'Khẩn cấp' : 'Thông báo'}
        </span>
      </div>
      
      {/* Marquee Animation */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full mix-blend-multiply dark:mix-blend-lighten">
        <div className="animate-marquee whitespace-nowrap pl-4 flex items-center">
            <span className="text-xs sm:text-sm font-medium mr-16">{config.message}</span>
            <span className="text-xs sm:text-sm font-medium pr-16">{config.message}</span>
        </div>
      </div>
{/* 
      Adding tailwind animation if needed inside index.css or just relying on a custom config. 
      Let's use an inline style if Tailwind lacks animate-marquee. 
*/}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

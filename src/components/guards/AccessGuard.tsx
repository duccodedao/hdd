import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import LoadingScreen from '../ui/LoadingScreen';
import BlockedPage from '../../pages/BlockedPage';

let ipCheckCache: boolean | null = null;

interface AccessGuardProps {
  children: React.ReactNode;
}

export const AccessGuard = ({ children }: AccessGuardProps) => {
  const { userData } = useAuthStore();
  const [isIpBlocked, setIsIpBlocked] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (userData?.status === 'banned' || userData?.isBanned) {
        setIsIpBlocked(true);
        setChecking(false);
        return;
      }

      if (ipCheckCache !== null) {
        setIsIpBlocked(ipCheckCache);
        setChecking(false);
        return;
      }

      try {
        const ipRes = await fetch('https://api64.ipify.org?format=json');
        if (!ipRes.ok) throw new Error(`IP check failed! status: ${ipRes.status}`);
        const { ip } = await ipRes.json();
        
        const q = query(collection(db, 'blockedIps'), where('ip', '==', ip));
        const snap = await getDocs(q);
        
        const blocked = !snap.empty;
        ipCheckCache = blocked;
        setIsIpBlocked(blocked);
      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
           console.warn("IP check network error, skipping block check");
        } else {
           console.error("Ban check failed:", err);
        }
        // If ban check fails, don't block by default, let user proceed or handle error
        setIsIpBlocked(false); 
      } finally {
        setChecking(false);
      }
    };

    checkBanStatus();
  }, [userData]);

  if (checking) return <LoadingScreen />;
  if (isIpBlocked) return <BlockedPage />;

  return <>{children}</>;
};

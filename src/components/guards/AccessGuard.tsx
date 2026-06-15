import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import LoadingScreen from '../ui/LoadingScreen';
import BlockedPage from '../../pages/BlockedPage';

let ipCheckCache: { blocked: boolean; whitelistBlocked: boolean; ip?: string } | null = null;
let guestLogged = false;

interface AccessGuardProps {
  children: React.ReactNode;
}

export const AccessGuard = ({ children }: AccessGuardProps) => {
  const { userData, user } = useAuthStore();
  const location = useLocation();
  const [isIpBlocked, setIsIpBlocked] = useState<boolean | null>(null);
  const [isWhitelistBlocked, setIsWhitelistBlocked] = useState<boolean | null>(null);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (userData?.status === 'banned' || userData?.isBanned) {
        setIsIpBlocked(true);
        setChecking(false);
        return;
      }

      if (ipCheckCache !== null) {
        setIsIpBlocked(ipCheckCache.blocked);
        setIsWhitelistBlocked(ipCheckCache.whitelistBlocked);
        setCurrentIp(ipCheckCache.ip || null);
        setChecking(false);
        return;
      }

      try {
        const ipRes = await fetch('https://api64.ipify.org?format=json');
        if (!ipRes.ok) throw new Error(`IP check failed! status: ${ipRes.status}`);
        const { ip } = await ipRes.json();
        setCurrentIp(ip);
        
        // 1. Blacklist check
        const q = query(collection(db, 'blockedIps'), where('ip', '==', ip));
        const snap = await getDocs(q);
        
        const blocked = !snap.empty;

        // Log guest visit if not logged in and not already logged this session
        if (!user && !guestLogged && ip) {
          try {
            const guestRef = doc(db, 'guest_visits', ip);
            await setDoc(guestRef, {
              ip,
              device: navigator.userAgent,
              lastActiveAt: Date.now(),
              blocked: blocked
            }, { merge: true });
            guestLogged = true;
          } catch(e) { /* ignore */ }
        }

        // 2. Whitelist check
        let whitelistBlocked = false;
        try {
          const sysSnap = await getDoc(doc(db, 'settings', 'system'));
          if (sysSnap.exists()) {
            const data = sysSnap.data();
            const whitelistEnabled = !!data.ipWhitelistEnabled;
            const whitelistText = data.ipWhitelistText || '';

            if (whitelistEnabled) {
              const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.role === 'review';
              if (!isAdmin) {
                const whitelistedIps = whitelistText
                  .split(/[\n,\s]+/)
                  .map((item: string) => item.trim())
                  .filter((item: string) => item.length > 0);
                
                if (!whitelistedIps.includes(ip)) {
                  whitelistBlocked = true;
                }
              }
            }
          }
        } catch (sysErr) {
          console.error("Error reading system whitelist settings:", sysErr);
        }

        ipCheckCache = { blocked, whitelistBlocked, ip };
        setIsIpBlocked(blocked);
        setIsWhitelistBlocked(whitelistBlocked);
      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
           console.warn("IP check network error, skipping block check");
        } else {
           console.error("Ban check failed:", err?.message || String(err));
        }
        setIsIpBlocked(false);
        setIsWhitelistBlocked(false);
      } finally {
        setChecking(false);
      }
    };

    checkBanStatus();
  }, [userData]);

  if (checking) return <LoadingScreen />;

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/admin-login';
  
  // Admins always bypass IP block
  const isAdminOrReview = userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.role === 'review';
  if (isAdminOrReview) {
    return <>{children}</>;
  }

  // Blacklist IP check overrides even auth routes
  if (isIpBlocked) return <BlockedPage />;

  if (isWhitelistBlocked) {
    // If it's an auth route, allow them to attempt login so that admin can get through
    if (isAuthRoute) {
      return <>{children}</>;
    }

    return (
      <BlockedPage 
        title="THIẾT BỊ HẠN CHẾ" 
        reason="Hệ thống đã bật chế độ giới hạn thiết bị truy cập qua IP/Wifi. Thiết bị hoặc địa chỉ IP của bạn chưa được chỉ định quyền truy cập."
        isWhitelistBlocked={true}
        ipWifi={currentIp || undefined}
      />
    );
  }

  return <>{children}</>;
};

import React, { useEffect } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { logActivity, ActivityType } from '../../services/activityService';
import toast from 'react-hot-toast';

import { useAppStore } from '../../store/appStore';

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleOneTap() {
  const { user } = useAuthStore();
  const { googleClientId } = useAppStore();

  useEffect(() => {
    const clientId = googleClientId || (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    
    if (user || !clientId) return;

    // Skip One Tap in iframes to avoid FedCM NotAllowedError which clutters the console 
    // and is picked up as a critical error by AI Studio.
    if (window.self !== window.top) return;

    // Function to initialize and prompt
    const initializeOneTap = () => {
      if (!window.google?.accounts?.id) return false;

      // Check if we are in an iframe and if the required permission might be missing based on the error
      // Actually, we can't easily check for identity-credentials-get permission programmatically without triggering the error usually.
      // But we can check if FedCM is explicitly supported/allowed.
      
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: false, // Disabling ITP support in frames to avoid NotAllowedError/sandbox issues
          use_fedcm_for_prompt: false, // Explicitly false to avoid the NotAllowedError in many nested contexts
          state_cookie_domain: window.location.hostname
        });

        // Only prompt if not in a restricted sandbox if possible, 
        // but since we want to try anyway, we just wrap it and handle it silently
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            // Suppress trivial logging that clutters console in Dev environment
            if (reason !== 'suppressed_by_user' && reason !== 'opt_out_or_no_session') {
              console.log('One Tap not displayed:', reason);
            }
          }
        });
        return true;
      } catch (error: any) {
        // If it's a security/permission error, log it once but don't crash
        if (error.name === 'NotAllowedError' || error.message?.includes('identity-credentials-get')) {
          console.warn('Google One Tap: "identity-credentials-get" permission is missing. This is common in iframes. Please open in a new tab for full GSI support.');
        } else {
          console.error('Google One Tap error:', error?.message || String(error));
        }
        return false;
      }
    };

    // Try immediately
    if (!initializeOneTap()) {
      // If not ready, poll for Google library
      const interval = setInterval(() => {
        if (initializeOneTap()) {
          clearInterval(interval);
        }
      }, 1000);
      
      // Cleanup after 10 seconds to avoid infinite polling
      setTimeout(() => clearInterval(interval), 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, googleClientId]);

  const handleCallback = async (response: any) => {
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      const userCred = await signInWithCredential(auth, credential);
      
      const userRef = doc(db, 'users', userCred.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          uid: userCred.user.uid,
          email: userCred.user.email,
          displayName: userCred.user.displayName || 'Google Entity',
          photoURL: userCred.user.photoURL || '',
          role: (userCred.user.email === 'sonlyhongduc@gmail.com' || userCred.user.email === 'sonlyhongduc1@ghn.vn') ? 'superadmin' : 'user',
          status: 'active',
          onboardingCompleted: false,
          createdAt: Date.now(),
          joinedAt: Date.now(),
          lastLoginAt: Date.now()
        });
      } else {
        await updateDoc(userRef, { lastLoginAt: Date.now() });
      }

      await logActivity(ActivityType.LOGIN, 'Đăng nhập Google One Tap thành công');
      toast.success('Đăng nhập thành công');
    } catch (error: any) {
      console.error('Google Auth Error:', error?.message || String(error));
      toast.error('Đăng nhập Google thất bại');
    }
  };

  return null;
}

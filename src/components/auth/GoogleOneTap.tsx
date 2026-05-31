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

    // Function to initialize and prompt
    const initializeOneTap = () => {
      if (!window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: false, // Disabling ITP support in frames to avoid NotAllowedError/sandbox issues
          use_fedcm_for_prompt: false, // Keep disabled to fallback to traditional flow
          state_cookie_domain: window.location.hostname
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.log('One Tap not displayed:', reason);
            if (reason === 'opt_out_or_no_session') {
              console.log('User might need to log into Google first or has opted out of One Tap.');
            }
          } else if (notification.isSkippedMoment()) {
            console.log('One Tap skipped:', notification.getSkippedReason());
          } else if (notification.isDismissedMoment()) {
            console.log('One Tap dismissed:', notification.getDismissedReason());
          }
        });
        return true;
      } catch (error) {
        console.error('Google One Tap error:', error?.message || String(error));
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

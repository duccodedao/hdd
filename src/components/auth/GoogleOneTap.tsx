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
    if (user || !window.google || !clientId) {
      if (!clientId && !user) {
        console.warn('Google One Tap: VITE_GOOGLE_CLIENT_ID is not configured in environment variables.');
      }
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.log('One Tap not displayed:', notification.getNotDisplayedReason());
        } else if (notification.isSkippedMoment()) {
          console.log('One Tap skipped:', notification.getSkippedReason());
        } else if (notification.isDismissedMoment()) {
          console.log('One Tap dismissed:', notification.getDismissedReason());
        }
      });
    } catch (error) {
      console.error('Google One Tap error:', error);
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
      console.error('Google Auth Error:', error);
      toast.error('Đăng nhập Google thất bại');
    }
  };

  return null;
}

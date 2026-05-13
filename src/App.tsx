import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore, UserData } from './store/authStore';
import { useAppStore } from './store/appStore';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import LoadingScreen from './components/ui/LoadingScreen';
import ConfirmModal from './components/ui/ConfirmModal';
import GoogleOneTap from './components/auth/GoogleOneTap';
import Auth from './pages/Auth';
import AuthActionPage from './pages/AuthActionPage';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import ComingSoon from './pages/ComingSoon';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import MaintenancePage from './pages/MaintenancePage';
import UtilitiesPage from './pages/UtilitiesPage';
import BlockedPage from './pages/BlockedPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ReleaseNotesPage from './pages/ReleaseNotesPage';
import Onboarding from './pages/Onboarding';
import LandingPage from './pages/LandingPage';
import FormView from './pages/FormView';
import NotFoundPage from './pages/NotFoundPage';
import { TwoFactorChallengePage } from './pages/TwoFactorChallengePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineNotification } from './components/ui/OfflineNotification';
import LocationGuard from './components/guards/LocationGuard';

import { AccessGuard } from './components/guards/AccessGuard';
import { AuthActionRedirector } from './components/guards/AuthActionRedirector';
import { RequireAuth } from './components/guards/RequireAuth';
import { DeviceGuard } from './components/guards/DeviceGuard';
import { TabGuard } from './components/guards/TabGuard';
import { OnboardingGuard } from './components/guards/OnboardingGuard';

import { HelmetProvider, Helmet } from 'react-helmet-async';

export default function App() {
  const { user, userData, is2FAVerified, setUser, setUserData, setLoading, loading, isAdmin } = useAuthStore();
  const { maintenanceMode, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices, setBlockedDevices } = useAppStore();

  useEffect(() => {
    // Offline status listening
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Real-time system settings listener
    const unsubscribeSystem = onSnapshot(doc(db, 'settings', 'system'), (settingsDoc) => {
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setMaintenanceMode(data.maintenanceMode || false);
        if (data.googleClientId) {
          useAppStore.getState().setGoogleClientId(data.googleClientId);
        }
        if (data.maintenanceTabs) {
          setMaintenanceTabs(data.maintenanceTabs);
        }
        if (data.maintenanceDevices) {
          setMaintenanceDevices(data.maintenanceDevices);
        }
        if (data.blockedDevices) {
          setBlockedDevices(data.blockedDevices);
        }
      }
    }, (err) => {
      console.error("Could not fetch system settings", err);
    });

    // Auth listener
    let unsubscribeUser: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clear previous user data listener
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        // Real-time user data listener
        unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          }
        }, (err) => {
          console.error("Error listening to user data:", err);
        });
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      unsubscribeSystem();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setUser, setUserData, setLoading, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices]);

  // Main UI render logic
  if (loading) {
    return <LoadingScreen />;
  }

  if (user && userData?.twoFactorEnabled && !is2FAVerified) {
    return <TwoFactorChallengePage />;
  }

  if (maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>BMASS Dashboard | Hệ sinh thái Bảo mật</title>
        <meta name="description" content="Hệ điều hành quản trị bảo mật và định danh số thế hệ mới. Trải nghiệm tối giản, hiệu năng tối đa." />
        <meta property="og:title" content="BMASS Dashboard" />
        <meta property="og:description" content="Hệ sinh thái quản trị bảo mật nâng cao." />
        <meta property="og:image" content="/logo.png" />
      </Helmet>
      <BrowserRouter>
      <GoogleOneTap />
      <OfflineNotification />
      <AuthActionRedirector />
      <Toaster position="top-right" />
      <ConfirmModal />
      <AccessGuard>
        <ErrorBoundary>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={user ? <Navigate to="/utilities" replace /> : <LandingPage />} />
            
            {/* Standalone Form Page */}
            <Route path="/form/:slug" element={<FormView />} />

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
            </Route>

            <Route path="/auth/action" element={<AuthActionPage />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Main App Routes */}
            <Route element={<DeviceGuard><LocationGuard><OnboardingGuard><MainLayout /></OnboardingGuard></LocationGuard></DeviceGuard>}>
              <Route path="/dashboard" element={<TabGuard tabKey="dashboard"><AboutPage /></TabGuard>} />
              <Route path="/profile" element={<RequireAuth><TabGuard tabKey="profile"><Profile /></TabGuard></RequireAuth>} />
              <Route path="/utilities" element={<TabGuard tabKey="utilities"><UtilitiesPage /></TabGuard>} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/releases" element={<ReleaseNotesPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin-login" />} />
              
              <Route path="/blocked" element={<BlockedPage />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </AccessGuard>
    </BrowserRouter>
    </HelmetProvider>
  );
}

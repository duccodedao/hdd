import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { statsService } from './services/statsService';
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
import GuidePage from './pages/GuidePage';
import MaintenancePage from './pages/MaintenancePage';
import UtilitiesPage from './pages/UtilitiesPage';
import AppsPage from './pages/AppsPage';
import AiTools from './pages/AiTools';
import CalendarPage from './pages/CalendarPage';
import HrmPage from './pages/HrmPage';
import BlockedPage from './pages/BlockedPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import PolicyPage from './pages/PolicyPage';
import ReleaseNotesPage from './pages/ReleaseNotesPage';
import Onboarding from './pages/Onboarding';
import LandingPage from './pages/LandingPage';
import FormView from './pages/FormView';
import NotFoundPage from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineNotification } from './components/ui/OfflineNotification';
import LocationGuard from './components/guards/LocationGuard';

import { AccessGuard } from './components/guards/AccessGuard';
import { AuthActionRedirector } from './components/guards/AuthActionRedirector';
import { RequireAuth } from './components/guards/RequireAuth';
import { DeviceGuard } from './components/guards/DeviceGuard';
import { TabGuard } from './components/guards/TabGuard';
import { OnboardingGuard } from './components/guards/OnboardingGuard';

import CookieConsentComponent from './components/common/CookieConsent';
import { HelmetProvider, Helmet } from 'react-helmet-async';

import HomePage from './pages/HomePage';

import { useAudioStore } from './store/audioStore';

let lastIncrementedPath: string | null = null;
let lastIncrementTime: number = 0;

function getStampPositionStyles(position: string): React.CSSProperties {
  switch (position) {
    case 'top-left':
      return { top: '24px', left: '24px' };
    case 'top-right':
      return { top: '24px', right: '24px' };
    case 'bottom-left':
      return { bottom: '24px', left: '24px' };
    case 'bottom-right':
      return { bottom: '24px', right: '24px' };
    case 'center':
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    default:
      return { bottom: '24px', right: '24px' };
  }
}

function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    const now = Date.now();
    // Only increment if we changed paths, or if it is a fresh page-refresh (represented by passing of time > 2000ms)
    if (lastIncrementedPath !== location.pathname || (now - lastIncrementTime) > 2000) {
      lastIncrementedPath = location.pathname;
      lastIncrementTime = now;
      const increment = async () => {
        try {
          await statsService.incrementVisit(location.pathname);
        } catch (e) {
          console.error("Failed to increment visit", e?.message || "Unknown error");
        }
      };
      increment();
    }
  }, [location.pathname]);

  return null;
}

export default function App() {
  const { user, userData, setUser, setUserData, setLoading, loading, isAdmin, isSuperAdmin } = useAuthStore();
  const { maintenanceMode, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices, setBlockedDevices, stampConfig, setStampConfig, maintenanceStampConfig, setMaintenanceStampConfig, setSystemVersion, setWebLogo } = useAppStore();
  const initAudio = useAudioStore((state) => state.init);
  const [seo, setSeo] = useState({
    title: 'BMASS',
    description: 'Hệ điều hành quản trị bảo mật và định danh số thế hệ mới. Trải nghiệm tối giản, hiệu năng tối đa.',
    imageUrl: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
    faviconUrl: ''
  });

  useEffect(() => {
    initAudio();
  }, [initAudio]);

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
        if (data.stampConfig) {
          setStampConfig(data.stampConfig);
        } else {
          setStampConfig(null);
        }
        if (data.maintenanceStampConfig) {
          setMaintenanceStampConfig(data.maintenanceStampConfig);
        } else {
          setMaintenanceStampConfig(null);
        }
        if (data.appVersion) {
          setSystemVersion(data.appVersion);
        }
      }
    }, (err) => {
      console.error("Could not fetch system settings", err?.message || "Unknown error");
      if (err?.message?.includes('quota') || err?.message?.includes('resource-exhausted') || (err as any)?.code === 'resource-exhausted') {
        useAppStore.getState().setQuotaExceeded(true);
      }
    });

    // Real-time SEO settings listener
    const unsubscribeSeo = onSnapshot(doc(db, 'settings', 'seo'), (seoDoc) => {
      if (seoDoc.exists()) {
        const data = seoDoc.data();
        setSeo({
          title: data.title || 'BMASS',
          description: data.description || 'Hệ điều hành quản trị bảo mật và định danh số thế hệ mới. Trải nghiệm tối giản, hiệu năng tối đa.',
          imageUrl: data.imageUrl || 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
          faviconUrl: data.faviconUrl || ''
        });
      }
    }, (err) => {
      console.error("Could not fetch SEO settings", err?.message || "Unknown error");
    });

    // Real-time about settings listener for Web Logo
    const unsubscribeAbout = onSnapshot(doc(db, 'settings', 'about'), (aboutDoc) => {
      if (aboutDoc.exists()) {
        const data = aboutDoc.data();
        if (data.webLogo) {
          setWebLogo(data.webLogo);
        }
      }
    }, (err) => {
      console.error("Could not fetch About settings", err?.message || "Unknown error");
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
          } else {
            // Document doesn't exist yet, fallback to local user data representation based on auth and auto-create it
            const fallbackUser: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || '',
              role: (firebaseUser.email === 'sonlyhongduc@gmail.com' || firebaseUser.email === 'sonlyhongduc1@ghn.vn') ? 'superadmin' : 'user',
              status: 'active',
              createdAt: Date.now(),
              lastLoginAt: Date.now()
            };
            setUserData(fallbackUser);
            setDoc(doc(db, 'users', firebaseUser.uid), fallbackUser, { merge: true })
              .catch((error) => console.error("Error auto-creating missing user document:", error?.message || "Unknown error"));
          }
        }, (err) => {
          console.error("Error listening to user data:", err?.message || "Unknown error");
          if (err?.message?.includes('quota') || err?.message?.includes('resource-exhausted') || (err as any)?.code === 'resource-exhausted') {
            useAppStore.getState().setQuotaExceeded(true);
          }
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
      unsubscribeSeo();
      unsubscribeAbout();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setUser, setUserData, setLoading, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const darkMode = useAppStore(state => state.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Main UI render logic
  if (loading) {
    return <LoadingScreen />;
  }

  if (maintenanceMode && !isSuperAdmin) {
    return <MaintenancePage />;
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:image" content={seo.imageUrl} />
        {seo.faviconUrl && <link rel="icon" type="image/x-icon" href={seo.faviconUrl} />}
        {seo.faviconUrl && <link rel="apple-touch-icon" href={seo.faviconUrl} />}
        {seo.faviconUrl && <link rel="shortcut icon" href={seo.faviconUrl} />}
      </Helmet>
      <BrowserRouter>
      {/* GLOBAL COPYRIGHT RED SEAL STAMP OVERLAY */}
      {stampConfig && stampConfig.active && stampConfig.imageUrl && (
        <div 
          className="fixed pointer-events-none select-none z-[9999]"
          style={{
            opacity: (stampConfig.opacity || 50) / 100,
            width: `${stampConfig.width || 120}px`,
            height: 'auto',
            ...getStampPositionStyles(stampConfig.position || 'bottom-right')
          }}
        >
          <img 
            src={stampConfig.imageUrl} 
            alt="Stamp Watermark Seal" 
            className="w-full h-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <VisitTracker />
      <div className="space-grid" />
      <div className="stardust" />
      <GoogleOneTap />
      <OfflineNotification />
      <CookieConsentComponent />
      <AuthActionRedirector />
      <Toaster position="top-right" />
      <ConfirmModal />
      <AccessGuard>
        <ErrorBoundary>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<HomePage />} />
            
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
              <Route path="/utilities" element={<TabGuard tabKey="utilities"><UtilitiesPage /></TabGuard>} />
              <Route path="/utilities/:utilityId" element={<TabGuard tabKey="utilities"><UtilitiesPage /></TabGuard>} />
              <Route path="/utilities/chat/:sessionId" element={<TabGuard tabKey="utilities"><UtilitiesPage /></TabGuard>} />
              <Route path="/apps" element={<TabGuard tabKey="apps"><AppsPage /></TabGuard>} />
              <Route path="/ai-tools" element={<TabGuard tabKey="ai_tools"><AiTools /></TabGuard>} />
              <Route path="/tasks" element={<Navigate to="/calendar" replace />} />
              <Route path="/calendar" element={<TabGuard tabKey="calendar"><CalendarPage /></TabGuard>} />
              <Route path="/nhan-su" element={<TabGuard tabKey="hrm"><HrmPage /></TabGuard>} />
              <Route path="/guide" element={<TabGuard tabKey="guide"><GuidePage /></TabGuard>} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/policy" element={<PolicyPage />} />
              <Route path="/releases" element={<ReleaseNotesPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/*" element={isSuperAdmin ? <AdminDashboard /> : <Navigate to="/admin-login" />} />
              
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

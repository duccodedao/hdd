import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { statsService } from './services/statsService';
import { useAuthStore, UserData } from './store/authStore';
import { useAppStore } from './store/appStore';
import { Toaster, toast } from 'react-hot-toast';
import { ShieldAlert, X } from 'lucide-react';
import AdminPinLockScreen from './components/auth/AdminPinLockScreen';
import CommandPalette from './components/ui/CommandPalette';
import {
  registerAdminSession,
  getOrCreateSessionId,
  logoutAllOtherSessions,
  approveSession,
  logoutSessionAndBlockIp
} from './services/sessionSecurityService';

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
import WalletPage from './pages/WalletPage';
import StorePage from './pages/StorePage';
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
import FloatingAdminButton from './components/layout/FloatingAdminButton';
import { HelmetProvider, Helmet } from 'react-helmet-async';

import HomePage from './pages/HomePage';

import { useAudioStore } from './store/audioStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';

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
  useFirebaseSync();
  const { maintenanceMode, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices, setBlockedDevices, stampConfig, setStampConfig, maintenanceStampConfig, setMaintenanceStampConfig, setSystemVersion, setWebLogo, setHasUnapprovedSessions } = useAppStore();
  const initAudio = useAudioStore((state) => state.init);
  const [seo, setSeo] = useState({
    title: 'BMASS',
    description: 'Hệ điều hành quản trị bảo mật và định danh số thế hệ mới. Trải nghiệm tối giản, hiệu năng tối đa.',
    imageUrl: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
    faviconUrl: ''
  });

  const [sessionConflictDetails, setSessionConflictDetails] = useState<any[]>([]);
  const [expectedPin, setExpectedPin] = useState<string>('1234');
  const [pinVerified, setPinVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_pin_verified') === 'true';
  });

  useEffect(() => {
    if (!user || !userData) return;
    
    const isUserAdmin = userData.role === 'admin' || userData.role === 'superadmin' || isAdmin;
    if (!isUserAdmin) return;
    
    let isSubscribed = true;
    let unsubscribeSessionListener: (() => void) | null = null;
    let unsubscribeConflicts: (() => void) | null = null;
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeBlockedIps: (() => void) | null = null;
    let unsubscribeAdminSessions: (() => void) | null = null;
    let unsubscribeInvoices: (() => void) | null = null;
    
    const listenerStartTime = Date.now();
    
    const initSession = async () => {
      try {
        const sessId = getOrCreateSessionId();
        
        const registered = await registerAdminSession(
          user.uid,
          user.email || '',
          userData.displayName || 'Admin',
          userData.photoURL || '',
          userData.role || 'admin'
        );
        
        if (!isSubscribed) return;
        
        // 1. Listen to active status of current session
        unsubscribeSessionListener = onSnapshot(doc(db, 'admin_sessions', sessId), (snap) => {
          if (!isSubscribed) return;
          if (snap.exists()) {
            const data = snap.data();
            if (data.active === false) {
              toast.error("Phiên đăng nhập này đã bị đăng xuất từ xa!", { duration: 10000 });
              auth.signOut();
            }
          } else {
            toast.error("Phiên của bạn đã hết hạn hoặc bị xóa!", { duration: 10000 });
            auth.signOut();
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `admin_sessions/${sessId}`);
        });
        
        // 2. Real-time query matching user's other sessions to spot overlaps instantly
        const qConflicts = query(
          collection(db, 'admin_sessions'),
          where('email', '==', user.email || ''),
          where('active', '==', true)
        );
        
        unsubscribeConflicts = onSnapshot(qConflicts, (snap) => {
          if (!isSubscribed) return;
          const confList: any[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data.id !== sessId && 
              (data.ip !== registered.ip || data.device !== registered.device) && 
              !data.approved
            ) {
              confList.push({ id: docSnap.id, ...data });
            }
          });
          setSessionConflictDetails(confList);
          setHasUnapprovedSessions(confList.length > 0);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'admin_sessions');
        });
 
        // 3. Listen to users collection for new registrations
        unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
          if (!isSubscribed) return;
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.createdAt && data.createdAt > listenerStartTime) {
                toast.success(
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-slate-800 dark:text-zinc-100">🎉 Người dùng mới đăng ký!</span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      {data.displayName || 'Tên ẩn danh'} ({data.email || 'Ẩn danh/Không hiển thị'})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">UID: {change.doc.id.substring(0, 8)}...</span>
                  </div>,
                  { duration: 6000, position: 'top-right' }
                );
              }
            }
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        });
 
        // 4. Listen to blockedIps for new IP bannings (indicates detected threats/suspicious activity)
        unsubscribeBlockedIps = onSnapshot(collection(db, 'blockedIps'), (snap) => {
          if (!isSubscribed) return;
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const blockedAtMs = data.blockedAt?.toMillis ? data.blockedAt.toMillis() : (data.blockedAt instanceof Date ? data.blockedAt.getTime() : (typeof data.blockedAt === 'number' ? data.blockedAt : null));
              
              if (blockedAtMs && blockedAtMs > listenerStartTime) {
                toast.error(
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-rose-500 flex items-center gap-1">
                      🚫 ĐÃ CHẶN IP MỚI!
                    </span>
                    <span className="text-xs text-slate-750 dark:text-zinc-350">
                      Hệ thống đã tự động khóa truy cập đối với IP: <strong className="font-mono bg-rose-500/10 px-1 py-0.5 rounded text-rose-500">{data.ip}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500 italic">
                      Lý do: {data.reason || 'Thiết lập bảo mật / Bảo trì thiết bị'}
                    </span>
                  </div>,
                  { duration: 8500, position: 'top-right' }
                );
              }
            }
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'blockedIps');
        });
 
        // 5. Listen to admin_sessions to highlight suspicious admin entry configurations
        unsubscribeAdminSessions = onSnapshot(collection(db, 'admin_sessions'), (snap) => {
          if (!isSubscribed) return;
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const createdAtMs = data.createdAt;
              const currentSessionId = getOrCreateSessionId();
              
              if (createdAtMs && createdAtMs > listenerStartTime && data.id !== currentSessionId) {
                if (!data.approved) {
                  toast.error(
                    <div className="flex flex-col gap-1 text-left border-l-2 border-amber-500 pl-2">
                      <span className="font-bold text-amber-500 flex items-center gap-1.5 animate-pulse">
                        ⚠️ ĐĂNG NHẬP ADMIN MỚI CHƯA DUYỆT
                      </span>
                      <span className="text-xs text-slate-800 dark:text-zinc-200">
                        Phát hiện truy cập cổng quản trị từ IP: <strong className="font-mono bg-amber-500/10 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400">{data.ip}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Email: {data.email} | Thiết bị: {data.device}
                      </span>
                      <span className="text-[10px] text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded self-start mt-0.5 uppercase tracking-wide">
                        Vị trí: {data.location || 'Chưa xác định'}
                      </span>
                    </div>,
                    { duration: 10000, position: 'top-right' }
                  );
                } else {
                  toast.success(
                    <div className="flex flex-col gap-1 text-left">
                      <span className="font-bold text-emerald-500">
                        🔓 THIẾT BỊ ADMIN ĐÃ XÁC MINH
                      </span>
                      <span className="text-xs text-slate-800 dark:text-zinc-200">
                        Tài khoản <span className="font-semibold">{data.email}</span> đã hoàn thành xác thực PIN bảo mật.
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        IP: {data.ip} | Thiết bị: {data.device}
                      </span>
                    </div>,
                    { duration: 6000, position: 'top-right' }
                  );
                }
              }
            }
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'admin_sessions');
        });

        // 6. Listen to invoices to notify admin about new orders
        unsubscribeInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
          if (!isSubscribed) return;
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt instanceof Date ? data.createdAt.getTime() : (typeof data.createdAt === 'number' ? data.createdAt : 0));
              
              if (createdAtMs > listenerStartTime) {
                toast.success(
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      💳 ĐƠN HÀNG MỚI!
                    </span>
                    <span className="text-xs text-slate-800 dark:text-zinc-200">
                      Đơn: <strong className="font-mono bg-indigo-500/10 px-1 py-0.5 rounded text-indigo-500">{change.doc.id}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Số tiền: {Number(data.totalAmount || 0).toLocaleString()}đ
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {data.type === 'deposit' ? '💳 Nạp tiền' : '🛍️ Mua sắm'}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase">
                        {data.status || 'pending'}
                      </span>
                    </div>
                  </div>,
                  { duration: 8000, position: 'top-right' }
                );
              }
            }
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'invoices');
        });
      } catch (err) {
        console.error("Error setting up security sessions:", err);
      }
    };
    
    initSession();
    
    return () => {
      isSubscribed = false;
      if (unsubscribeSessionListener) unsubscribeSessionListener();
      if (unsubscribeConflicts) unsubscribeConflicts();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeBlockedIps) unsubscribeBlockedIps();
      if (unsubscribeAdminSessions) unsubscribeAdminSessions();
      if (unsubscribeInvoices) unsubscribeInvoices();
    };
  }, [user, userData, isAdmin]);

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
        if (data.adminPin) {
          setExpectedPin(data.adminPin);
        } else {
          setExpectedPin('1234');
        }
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
        sessionStorage.removeItem('admin_pin_verified');
        setPinVerified(false);
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

  const isUserAdmin = user && userData && (userData.role === 'admin' || userData.role === 'superadmin' || isAdmin || isSuperAdmin);

  // Main UI render logic
  if (loading) {
    return <LoadingScreen />;
  }

  if (isUserAdmin && !pinVerified) {
    return (
      <AdminPinLockScreen 
        expectedPin={expectedPin} 
        onVerified={() => {
          sessionStorage.setItem('admin_pin_verified', 'true');
          setPinVerified(true);
        }} 
      />
    );
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
          className="fixed pointer-events-none select-none"
          style={{
            zIndex: stampConfig.zIndex || 9999,
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
      <FloatingAdminButton />
      <CookieConsentComponent />
      <CommandPalette />
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
              <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
              <Route path="/store" element={<StorePage />} />
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

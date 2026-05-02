import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
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
import Home from './pages/Home';
import Auth from './pages/Auth';
import AuthActionPage from './pages/AuthActionPage';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import ComingSoon from './pages/ComingSoon';
import NotificationsPage from './pages/NotificationsPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import MaintenancePage from './pages/MaintenancePage';
import UtilitiesPage from './pages/UtilitiesPage';
import ProductsPage from './pages/ProductsPage';
import DomainRequestPage from './pages/DomainRequestPage';
import NewsPage from './pages/NewsPage';
import AirdropPage from './pages/AirdropPage';
import BanksPage from './pages/BanksPage';
import ExchangesPage from './pages/ExchangesPage';
import BlockedPage from './pages/BlockedPage';
import DnsRequestPage from './pages/DnsRequestPage';
import NotFoundPage from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const TabGuard = ({ children, tabKey }: { children: React.ReactNode, tabKey: 'products' | 'utilities' | 'news' | 'banks' | 'exchanges' }) => {
  const { maintenanceTabs } = useAppStore();
  const { isAdmin } = useAuthStore();
  
  if (maintenanceTabs[tabKey] && !isAdmin) {
    return <MaintenancePage />;
  }
  
  return <>{children}</>;
};

const AccessGuard = ({ children }: { children: React.ReactNode }) => {
  const { userData } = useAuthStore();
  const [isIpBlocked, setIsIpBlocked] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      try {
        // Check if user account is banned
        if (userData?.status === 'banned' || userData?.isBanned) {
          setIsIpBlocked(true);
          setChecking(false);
          return;
        }

        // Check if IP is blocked
        const ipRes = await fetch('https://api64.ipify.org?format=json');
        const { ip } = await ipRes.json();
        
        const q = query(collection(db, 'blockedIps'), where('ip', '==', ip));
        const snap = await getDocs(q);
        
        setIsIpBlocked(!snap.empty);
      } catch (err) {
        console.error("Ban check failed", err);
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

const AuthActionRedirector = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (mode && oobCode && window.location.pathname !== '/auth/action') {
      navigate({
        pathname: '/auth/action',
        search: searchParams.toString()
      }, { replace: true });
    }
  }, [mode, oobCode, navigate, searchParams]);

  return null;
};

export default function App() {
  const { setUser, setUserData, setLoading, loading, isAdmin } = useAuthStore();
  const { maintenanceMode, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setDomainExpiryDate } = useAppStore();

  useEffect(() => {
    // Theme initialization
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Offline status listening
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Real-time system settings listener
    const unsubscribeSystem = onSnapshot(doc(db, 'settings', 'system'), (settingsDoc) => {
      if (settingsDoc.exists()) {
        setMaintenanceMode(settingsDoc.data().maintenanceMode || false);
        if (settingsDoc.data().maintenanceTabs) {
          setMaintenanceTabs(settingsDoc.data().maintenanceTabs);
        }
        if (settingsDoc.data().domainExpiryDate) {
          setDomainExpiryDate(settingsDoc.data().domainExpiryDate);
        } else {
          setDomainExpiryDate(null);
        }
      }
    }, (err) => {
      console.error("Could not fetch system settings", err);
    });

    // Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user data from firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {}
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribeSystem();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setUser, setUserData, setLoading, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setDomainExpiryDate]);

  if (loading) {
    return <LoadingScreen />;
  }

  // Maintenance mode guard
  if (maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <BrowserRouter>
      <AuthActionRedirector />
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-white' }} />
      <ConfirmModal />
      <AccessGuard>
        <ErrorBoundary>
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
            </Route>

            <Route path="/auth/action" element={<AuthActionPage />} />

            {/* Main App Routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="profile" element={<Profile />} />
              <Route path="utilities" element={<TabGuard tabKey="utilities"><UtilitiesPage /></TabGuard>} />
              <Route path="products" element={<TabGuard tabKey="products"><ProductsPage /></TabGuard>} />
              <Route path="news" element={<TabGuard tabKey="news"><NewsPage /></TabGuard>} />
              <Route path="banks" element={<TabGuard tabKey="banks"><BanksPage /></TabGuard>} />
              <Route path="exchanges" element={<TabGuard tabKey="exchanges"><ExchangesPage /></TabGuard>} />
              <Route path="about" element={<AboutPage />} />
              <Route path="airdrop" element={<AirdropPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="dns" element={<DnsRequestPage />} />
              
              {/* Admin Routes */}
              <Route path="admin/*" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
              
              <Route path="blocked" element={<BlockedPage />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            
            {/* Top-level catch all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </AccessGuard>
    </BrowserRouter>
  );
}

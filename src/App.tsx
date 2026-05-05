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
import Auth from './pages/Auth';
import AuthActionPage from './pages/AuthActionPage';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import ComingSoon from './pages/ComingSoon';
import NotificationsPage from './pages/NotificationsPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import MoviesPage from './pages/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage';
import MaintenancePage from './pages/MaintenancePage';
import UtilitiesPage from './pages/UtilitiesPage';
import ProductsPage from './pages/ProductsPage';
import AirdropPage from './pages/AirdropPage';
import BanksPage from './pages/BanksPage';
import ExchangesPage from './pages/ExchangesPage';
import BlockedPage from './pages/BlockedPage';
import NotFoundPage from './pages/NotFoundPage';
import TasksPage from './pages/TasksPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineNotification } from './components/ui/OfflineNotification';
import LocationGuard from './components/guards/LocationGuard';

import { AccessGuard } from './components/guards/AccessGuard';
import { AuthActionRedirector } from './components/guards/AuthActionRedirector';
import { RequireAuth } from './components/guards/RequireAuth';
import { DeviceGuard } from './components/guards/DeviceGuard';
import { TabGuard } from './components/guards/TabGuard';

export default function App() {
  const { setUser, setUserData, setLoading, loading, isAdmin } = useAuthStore();
  const { maintenanceMode, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices, setBlockedDevices } = useAppStore();

  useEffect(() => {
    // Offline status listening
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Real-time system settings listener
    const unsubscribeSystem = onSnapshot(doc(db, 'settings', 'system'), (settingsDoc) => {
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setMaintenanceMode(data.maintenanceMode || false);
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
    };
  }, [setUser, setUserData, setLoading, setMaintenanceMode, setOnlineStatus, setMaintenanceTabs, setMaintenanceDevices]);

  // Main UI render logic
  if (loading) {
    return <LoadingScreen />;
  }

  if (maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <BrowserRouter>
      <OfflineNotification />
      <AuthActionRedirector />
      <Toaster position="top-right" />
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
            <Route path="/" element={<DeviceGuard><LocationGuard><MainLayout /></LocationGuard></DeviceGuard>}>
              <Route index element={<AboutPage />} />
              <Route path="profile" element={<RequireAuth><TabGuard tabKey="profile"><Profile /></TabGuard></RequireAuth>} />
              <Route path="utilities" element={<TabGuard tabKey="utilities"><UtilitiesPage /></TabGuard>} />
              <Route path="products" element={<TabGuard tabKey="products"><ProductsPage /></TabGuard>} />
              <Route path="banks" element={<TabGuard tabKey="banks"><BanksPage /></TabGuard>} />
              <Route path="exchanges" element={<TabGuard tabKey="exchanges"><ExchangesPage /></TabGuard>} />
              <Route path="movies" element={<TabGuard tabKey="movies"><MoviesPage /></TabGuard>} />
              <Route path="movies/:slug" element={<TabGuard tabKey="movies"><MovieDetailPage /></TabGuard>} />
              <Route path="about" element={<AboutPage />} />
              <Route path="airdrop" element={<TabGuard tabKey="airdrop"><AirdropPage /></TabGuard>} />
              <Route path="notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
              <Route path="contact" element={<ContactPage />} />
              
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

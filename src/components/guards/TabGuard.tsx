import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import MaintenancePage from '../../pages/MaintenancePage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TabGuardProps {
  children: React.ReactNode;
  tabKey: string;
}

export const TabGuard = ({ children, tabKey }: TabGuardProps) => {
  const { maintenanceTabs } = useAppStore();
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'tool_permissions'), (docSnap) => {
      if (docSnap.exists()) {
        const config = docSnap.data()[tabKey];
        setIsInternal(config?.internal || false);
      }
      setLoading(false);
    }, (err) => {
      console.error("TabGuard error:", err);
      setLoading(false);
    });
    
    return () => unsub();
  }, [tabKey]);

  if (maintenanceTabs[tabKey] && !isSuperAdmin) {
    return <MaintenancePage />;
  }
  
  if (!loading && isInternal && !isAdmin && !isSuperAdmin) {
     return <Navigate to="/utilities" replace />;
  }
  
  return <>{children}</>;
};

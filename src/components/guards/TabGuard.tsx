import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import MaintenancePage from '../../pages/MaintenancePage';
import BlockedPage from '../../pages/BlockedPage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TabGuardProps {
  children: React.ReactNode;
  tabKey: string;
}

export const TabGuard = ({ children, tabKey }: TabGuardProps) => {
  const { maintenanceTabs } = useAppStore();
  const { user, isAdmin, isSuperAdmin } = useAuthStore();
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
      if (err?.message?.includes('quota') || err?.message?.includes('resource-exhausted') || (err as any)?.code === 'resource-exhausted') {
        useAppStore.getState().setQuotaExceeded(true);
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [tabKey]);

  if (maintenanceTabs[tabKey] && !isSuperAdmin) {
    return <MaintenancePage />;
  }
  
  if (!loading && isInternal && !isAdmin && !isSuperAdmin) {
     return <BlockedPage title="NỘI BỘ" reason="Bạn không có quyền truy cập vào tiện ích hoặc khu vực này. Nó chỉ dành cho nội bộ quản trị." />;
  }
  
  return <>{children}</>;
};

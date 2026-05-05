import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import MaintenancePage from '../../pages/MaintenancePage';

interface TabGuardProps {
  children: React.ReactNode;
  tabKey: string;
}

export const TabGuard = ({ children, tabKey }: TabGuardProps) => {
  const { maintenanceTabs } = useAppStore();
  const { isAdmin } = useAuthStore();
  
  if (maintenanceTabs[tabKey] && !isAdmin) {
    return <MaintenancePage />;
  }
  
  return <>{children}</>;
};

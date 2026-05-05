import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import MaintenancePage from '../../pages/MaintenancePage';
import BlockedPage from '../../pages/BlockedPage';

interface DeviceGuardProps {
  children: React.ReactNode;
}

export const DeviceGuard = ({ children }: DeviceGuardProps) => {
  const { maintenanceDevices, blockedDevices } = useAppStore();
  const { isAdmin } = useAuthStore();
  
  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'pc';
  };

  const getOS = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    return 'other';
  };

  const device = getDeviceType();
  const os = getOS();
  
  if (!isAdmin) {
    if (maintenanceDevices[device]) {
      return <MaintenancePage message={`Hệ thống đang bảo trì cho thiết bị ${device.toUpperCase()}.`} />;
    }
    
    if (os === 'ios' && blockedDevices.ios) {
      return <BlockedPage title="THIẾT BỊ KHÔNG ĐƯỢC HỖ TRỢ" reason="Hệ thống hiện không hỗ trợ truy cập từ thiết bị iOS. Vui lòng sử dụng máy tính để tiếp tục." />;
    }

    if (os === 'android' && blockedDevices.android) {
      return <BlockedPage title="THIẾT BỊ KHÔNG ĐƯỢC HỖ TRỢ" reason="Hệ thống hiện không hỗ trợ truy cập từ thiết bị Android. Vui lòng sử dụng máy tính để tiếp tục." />;
    }
  }
  
  return <>{children}</>;
};

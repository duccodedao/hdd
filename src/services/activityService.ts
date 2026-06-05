import { setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum ActivityType {
  LOGIN = 'LOGIN',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  SECURITY_CHANGE = 'SECURITY_CHANGE',
  UPLOAD_FILE = 'UPLOAD_FILE',
  ADMIN_ACTION = 'ADMIN_ACTION'
}

const ACTION_TITLES: Record<string, string> = {
  LOGIN: 'Đăng nhập hệ thống',
  UPDATE_PROFILE: 'Cập nhật hồ sơ cá nhân',
  SECURITY_CHANGE: 'Thiết lập bảo mật & Cài đặt',
  UPLOAD_FILE: 'Đăng tải tệp tin',
  ADMIN_ACTION: 'Thao tác trình quản trị'
};

export async function logActivity(type: ActivityType, description: string, metadata?: any) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const activityId = `${user.uid}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const activityData: any = {
      userId: user.uid,
      type,
      description,
      action: ACTION_TITLES[type] || type,
      details: description,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      ipAddress: 'Auto',
      userAgent: navigator.userAgent
    };

    if (metadata) {
      activityData.metadata = metadata;
    }

    await setDoc(doc(db, 'activities', activityId), activityData);
  } catch (e) {
    console.error('Error logging activity:', e?.message || String(e));
  }
}

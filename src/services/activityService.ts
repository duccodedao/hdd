import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum ActivityType {
  LOGIN = 'LOGIN',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  SECURITY_CHANGE = 'SECURITY_CHANGE',
  UPLOAD_FILE = 'UPLOAD_FILE',
  ADMIN_ACTION = 'ADMIN_ACTION'
}

export async function logActivity(type: ActivityType, description: string, metadata?: any) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const activityData: any = {
      userId: user.uid,
      type,
      description,
      timestamp: serverTimestamp(),
      ipAddress: 'Auto',
      userAgent: navigator.userAgent
    };

    if (metadata) {
      activityData.metadata = metadata;
    }

    await addDoc(collection(db, 'activities'), activityData);
  } catch (e) {
    console.error('Error logging activity:', e);
  }
}

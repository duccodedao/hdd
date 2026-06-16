import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, Notification } from '../store/notificationStore';
import toast from 'react-hot-toast';

export function useFirebaseSync() {
  const { user, userData } = useAuthStore();

  // Notifications Sync
  useEffect(() => {
    if (!user) {
      useNotificationStore.getState().setNotifications([]);
      useNotificationStore.getState().setReadNotificationIds([]);
      return;
    }

    const startListenerTime = Date.now();

    // 1. Sync read notifications
    const readUnsub = onSnapshot(collection(db, `users/${user.uid}/read_notifications`), (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      useNotificationStore.getState().setReadNotificationIds(ids);
    }, (error) => {
      console.warn("Read notifications sync error:", error);
    });

    // 2. Sync incoming notifications
    const notifQuery = query(collection(db, 'notifications'));
    const notifUnsub = onSnapshot(notifQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      const userRole = userData?.role || 'user';

      const filteredList = list.filter(n => {
        if (n.target === 'all') return true;
        if (n.target === 'user' && n.targetValue === user.uid) return true;
        if (n.target === 'role' && (n.targetValue === userRole || (n.targetValue === 'admin' && (userRole === 'admin' || userRole === 'superadmin')))) return true;
        return false;
      }).sort((a, b) => b.createdAt - a.createdAt);

      useNotificationStore.getState().setNotifications(filteredList);

      // 3. Elegant real-time toasts for new, incoming unread notifications
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const freshData = { id: change.doc.id, ...change.doc.data() } as Notification;
          // Avoid triggering on old historical items loaded on initial fetch
          if (freshData.createdAt && freshData.createdAt > startListenerTime) {
            const targeted = freshData.target === 'all' || 
              (freshData.target === 'user' && freshData.targetValue === user.uid) ||
              (freshData.target === 'role' && (freshData.targetValue === userRole || (freshData.targetValue === 'admin' && (userRole === 'admin' || userRole === 'superadmin'))));

            if (targeted) {
              toast.success(
                `🔔 Có thông báo mới: "${freshData.title}" - Hãy kiểm tra hộp thông báo!`,
                { duration: 6000, position: 'top-right' }
              );
            }
          }
        }
      });
    }, (error) => {
      console.warn("Notification stream sync error:", error);
    });

    return () => {
      readUnsub();
      notifUnsub();
    };
  }, [user, userData]);
}
export default useFirebaseSync;

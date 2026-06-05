import { create } from 'zustand';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'user' | 'role';
  targetValue: string;
  createdAt: number;
  senderName: string;
}

interface NotificationState {
  notifications: Notification[];
  readNotificationIds: string[];
  loading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  setReadNotificationIds: (ids: string[]) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readNotificationIds: [],
  loading: false,
  setNotifications: (notifications) => set({ notifications }),
  setReadNotificationIds: (readNotificationIds) => set({ readNotificationIds }),
  markAsRead: async (notificationId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, `users/${user.uid}/read_notifications`, notificationId), {
        readAt: Date.now()
      });
      set(state => ({
        readNotificationIds: [...state.readNotificationIds, notificationId]
      }));
    } catch (err) {
      console.error("Error marking read:", err);
    }
  },
  markAsUnread: async (notificationId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/read_notifications`, notificationId));
      set(state => ({
        readNotificationIds: state.readNotificationIds.filter(id => id !== notificationId)
      }));
    } catch (err) {
      console.error("Error marking unread:", err);
    }
  },
  markAllAsRead: async () => {
    const user = auth.currentUser;
    if (!user) return;

    const unreadList = get().notifications.filter(n => !get().readNotificationIds.includes(n.id));
    if (unreadList.length === 0) return;

    try {
      const promises = unreadList.map(n => 
        setDoc(doc(db, `users/${user.uid}/read_notifications`, n.id), {
          readAt: Date.now()
        })
      );
      await Promise.all(promises);
      set(state => ({
        readNotificationIds: [...state.readNotificationIds, ...unreadList.map(n => n.id)]
      }));
      toast.success("Đã đánh dấu đọc tất cả thông báo!");
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  }
}));

import { create } from 'zustand';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { logActivity, ActivityType } from '../services/activityService';
import toast from 'react-hot-toast';

export interface Bookmark {
  id: string; // `${userId}_${itemId}`
  userId: string;
  itemId: string;
  title: string;
  type: 'utility' | 'app' | 'page';
  url: string;
  icon?: string;
  createdAt: number;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  loading: boolean;
  setBookmarks: (bookmarks: Bookmark[]) => void;
  toggleBookmark: (item: { itemId: string; title: string; type: 'utility' | 'app' | 'page'; url: string; icon?: string }) => Promise<void>;
  isBookmarked: (itemId: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  loading: false,
  setBookmarks: (bookmarks) => set({ bookmarks }),
  isBookmarked: (itemId) => {
    return get().bookmarks.some(b => b.itemId === itemId);
  },
  toggleBookmark: async (item) => {
    const user = auth.currentUser;
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu dấu trang!');
      return;
    }

    const bookmarkId = `${user.uid}_${item.itemId}`;
    const existing = get().bookmarks.find(b => b.itemId === item.itemId);

    try {
      if (existing) {
        // Remove bookmark
        await deleteDoc(doc(db, 'bookmarks', bookmarkId));
        toast.success(`Đã xóa dấu trang: ${item.title}`);
        await logActivity(ActivityType.SECURITY_CHANGE, `Đã xóa dấu trang: ${item.title}`);
      } else {
        // Add bookmark
        const bookmarkData: Bookmark = {
          id: bookmarkId,
          userId: user.uid,
          itemId: item.itemId,
          title: item.title,
          type: item.type,
          url: item.url,
          icon: item.icon || 'Star',
          createdAt: Date.now()
        };
        await setDoc(doc(db, 'bookmarks', bookmarkId), bookmarkData);
        toast.success(`Đã lưu dấu trang: ${item.title}`, {
          icon: '⭐'
        });
        await logActivity(ActivityType.SECURITY_CHANGE, `Đã thêm dấu trang cho: ${item.title}`);
      }
    } catch (err: any) {
      console.error("Error toggling bookmark:", err);
      toast.error('Có lỗi xảy ra khi cập nhật dấu trang.');
    }
  }
}));

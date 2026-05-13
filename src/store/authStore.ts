import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  userData: UserData | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  is2FAVerified: boolean;
  setUser: (user: User | null) => void;
  setUserData: (data: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  set2FAVerified: (verified: boolean) => void;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  phoneNumber?: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'banned';
  isBanned?: boolean;
  onboardingCompleted?: boolean;
  createdAt: number;
  lastLoginAt: number;
  location?: { lat: number, lng: number, address?: string };
  ip?: string;
  twoFactorEnabled?: boolean;
  notificationPreferences?: {
    system: boolean;
    security: boolean;
    files: boolean;
  };
  socialLinks?: {
    google?: string;
    facebook?: string;
    tiktok?: {
      id: string;
      username: string;
      avatar: string;
      displayName: string;
    };
    playGames?: string;
    gameCenter?: string;
    apple?: string;
    github?: string;
    microsoft?: string;
    twitter?: string;
    yahoo?: string;
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  isAdmin: false,
  isSuperAdmin: false,
  loading: true,
  is2FAVerified: sessionStorage.getItem('is2FAVerified') === 'true',
  setUser: (user) => set((state) => {
    if (!user) sessionStorage.removeItem('is2FAVerified');
    return { user, is2FAVerified: !user ? false : state.is2FAVerified };
  }),
  setUserData: (data) => set({ 
    userData: data,
    isAdmin: data?.role === 'admin' || data?.role === 'superadmin' || data?.email === 'sonlyhongduc@gmail.com' || data?.email === 'cuong.nguyen1@ghn.vn',
    isSuperAdmin: data?.role === 'superadmin' || data?.email === 'sonlyhongduc@gmail.com' || data?.email === 'cuong.nguyen1@ghn.vn'
  }),
  setLoading: (loading) => set({ loading }),
  set2FAVerified: (verified) => {
    if (verified) {
      sessionStorage.setItem('is2FAVerified', 'true');
    } else {
      sessionStorage.removeItem('is2FAVerified');
    }
    set({ is2FAVerified: verified });
  },
}));

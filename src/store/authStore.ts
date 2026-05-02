import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  userData: UserData | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setUserData: (data: UserData | null) => void;
  setLoading: (loading: boolean) => void;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'banned';
  isBanned?: boolean;
  createdAt: number;
  lastLoginAt: number;
  location?: { lat: number, lng: number, address?: string };
  ip?: string;
  notificationPreferences?: {
    system: boolean;
    security: boolean;
    files: boolean;
  };
  socialLinks?: {
    google?: string;
    facebook?: string;
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
  setUser: (user) => set({ user }),
  setUserData: (data) => set({ 
    userData: data,
    isAdmin: data?.role === 'admin' || data?.role === 'superadmin' || data?.email === 'sonlyhongduc@gmail.com',
    isSuperAdmin: data?.role === 'superadmin' || data?.email === 'sonlyhongduc@gmail.com'
  }),
  setLoading: (loading) => set({ loading }),
}));

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
  phoneNumber?: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'banned';
  isBanned?: boolean;
  onboardingCompleted?: boolean;
  createdAt: number;
  lastLoginAt: number;
  location?: { lat: number, lng: number, address?: string };
  ip?: string;
  assignedUtilities?: string[];
  notificationPreferences?: {
    system: boolean;
    security: boolean;
    files: boolean;
  };
  personalGithubConfig?: {
    username?: string;
    repo?: string;
    token?: string;
    branch?: string;
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
  setUser: (user) => set({ user }),
  setUserData: (data) => set({ 
    userData: data,
    isAdmin: data?.role === 'admin' || data?.role === 'superadmin' || data?.email === 'sonlyhongduc@gmail.com' || data?.email === 'sonlyhongduc1@ghn.vn',
    isSuperAdmin: data?.role === 'superadmin' || data?.email === 'sonlyhongduc@gmail.com' || data?.email === 'sonlyhongduc1@ghn.vn'
  }),
  setLoading: (loading) => set({ loading }),
}));

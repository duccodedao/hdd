import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  maintenanceMode: boolean;
  setMaintenanceMode: (status: boolean) => void;
  maintenanceTabs: { [key: string]: boolean };
  setMaintenanceTabs: (tabs: { [key: string]: boolean }) => void;
  maintenanceDevices: { pc: boolean; mobile: boolean; tablet: boolean };
  setMaintenanceDevices: (devices: { pc: boolean; mobile: boolean; tablet: boolean }) => void;
  blockedDevices: { ios: boolean; android: boolean };
  setBlockedDevices: (devices: { ios: boolean; android: boolean }) => void;
  isOnline: boolean;
  setOnlineStatus: (status: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  googleClientId: string | null;
  setGoogleClientId: (id: string | null) => void;
  aiActive: boolean;
  setAiActive: (active: boolean) => void;
  quotaExceeded: boolean;
  setQuotaExceeded: (exceeded: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: window.innerWidth >= 1024,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  maintenanceMode: false,
  setMaintenanceMode: (status) => set({ maintenanceMode: status }),
  maintenanceTabs: {
    dashboard: false,
    profile: false,
    utilities: false,
    tools: false,
    features: false,
    products: false,
    games: false,
    banks: false,
    exchanges: false,
    news: false,
    tasks: false,
    airdrop: false,
    'utility_ai-scanner': false,
    'utility_image-to-pdf': false,
    'utility_pdf-to-word': false,
  },
  setMaintenanceTabs: (tabs) => set({ maintenanceTabs: tabs }),
  maintenanceDevices: {
    pc: false,
    mobile: false,
    tablet: false,
  },
  setMaintenanceDevices: (devices) => set({ maintenanceDevices: devices }),
  blockedDevices: {
    ios: false,
    android: false,
  },
  setBlockedDevices: (devices) => set({ blockedDevices: devices }),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnlineStatus: (status) => set({ isOnline: status }),
  darkMode: typeof window !== 'undefined' ? (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) : false,
  toggleDarkMode: () => set((state) => {
    const nextMode = !state.darkMode;
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    return { darkMode: nextMode };
  }),
  googleClientId: null,
  setGoogleClientId: (id) => set({ googleClientId: id }),
  aiActive: false,
  setAiActive: (active) => set({ aiActive: active }),
  quotaExceeded: false,
  setQuotaExceeded: (exceeded) => set({ quotaExceeded: exceeded }),
}));

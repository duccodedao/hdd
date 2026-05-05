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
  isOnline: boolean;
  setOnlineStatus: (status: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  maintenanceMode: false,
  setMaintenanceMode: (status) => set({ maintenanceMode: status }),
  maintenanceTabs: {
    tools: false,
    features: false,
    products: false,
    utilities: false,
    games: false,
    banks: false,
    exchanges: false,
    movies: false,
    news: false,
    tasks: false,
    airdrop: false,
    profile: false,
    dns: false,
  },
  setMaintenanceTabs: (tabs) => set({ maintenanceTabs: tabs }),
  maintenanceDevices: {
    pc: false,
    mobile: false,
    tablet: false,
  },
  setMaintenanceDevices: (devices) => set({ maintenanceDevices: devices }),
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
}));

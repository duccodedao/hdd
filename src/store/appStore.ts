import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  maintenanceMode: boolean;
  setMaintenanceMode: (status: boolean) => void;
  maintenanceTabs: { [key: string]: boolean };
  setMaintenanceTabs: (tabs: { [key: string]: boolean }) => void;
  domainExpiryDate: string | null;
  setDomainExpiryDate: (date: string | null) => void;
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
    files: false,
    news: false,
    market: false,
    banks: false,
    exchanges: false,
  },
  setMaintenanceTabs: (tabs) => set({ maintenanceTabs: tabs }),
  domainExpiryDate: null,
  setDomainExpiryDate: (date) => set({ domainExpiryDate: date }),
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

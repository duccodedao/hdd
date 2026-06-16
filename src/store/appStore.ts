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
  stampConfig: {
    active: boolean;
    imageUrl: string;
    width: number;
    opacity: number;
    position: string;
    zIndex?: number;
  } | null;
  setStampConfig: (config: any) => void;
  maintenanceStampConfig: {
    imageUrl: string;
    width: number;
    opacity: number;
  } | null;
  setMaintenanceStampConfig: (config: any) => void;
  systemVersion: string;
  setSystemVersion: (v: string) => void;
  webLogo: string;
  setWebLogo: (logo: string) => void;
  hasUnapprovedSessions: boolean;
  setHasUnapprovedSessions: (val: boolean) => void;
  affiliateAds: {
    active: boolean;
    logoUrl: string;
    projectName: string;
    description: string;
    linkRef: string;
    codeRef: string;
  } | null;
  setAffiliateAds: (ads: any) => void;
  snoozeAdUntil: number | null;
  setSnoozeAdUntil: (time: number | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  webLogo: 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
  setWebLogo: (logo) => set({ webLogo: logo }),
  hasUnapprovedSessions: false,
  setHasUnapprovedSessions: (val) => set({ hasUnapprovedSessions: val }),
  affiliateAds: null,
  setAffiliateAds: (ads) => set({ affiliateAds: ads }),
  snoozeAdUntil: null,
  setSnoozeAdUntil: (time) => set({ snoozeAdUntil: time }),
  sidebarOpen: false,
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
    'utility_word-covers': false,
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
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
    return { darkMode: nextMode };
  }),
  googleClientId: null,
  setGoogleClientId: (id) => set({ googleClientId: id }),
  aiActive: false,
  setAiActive: (active) => set({ aiActive: active }),
  quotaExceeded: false,
  setQuotaExceeded: (exceeded) => set({ quotaExceeded: exceeded }),
  stampConfig: null,
  setStampConfig: (config) => set({ stampConfig: config }),
  maintenanceStampConfig: null,
  setMaintenanceStampConfig: (config) => set({ maintenanceStampConfig: config }),
  systemVersion: '',
  setSystemVersion: (v) => set({ systemVersion: v }),
}));

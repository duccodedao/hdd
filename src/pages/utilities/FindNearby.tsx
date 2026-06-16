import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Phone, 
  Mail, 
  User, 
  Map as MapIcon, 
  Share2, 
  X, 
  ShieldAlert, 
  Check, 
  Compass, 
  RefreshCw, 
  Copy,
  Info,
  Edit,
  Camera,
  Search,
  Lock,
  UserPlus
} from 'lucide-react';
import { collection, setDoc, doc, onSnapshot, updateDoc, deleteDoc, query, getDocs, where, or } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

// Presets for profile avatar selection
const PRESET_AVATARS = [
  { name: 'Nữ năng động', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop' },
  { name: 'Nam thanh lịch', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop' },
  { name: 'Nữ công sở', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
  { name: 'Nam kỹ sư', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
  { name: 'Nữ tự do', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop' },
  { name: 'Nam phong cách', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' },
  { name: 'Logo BMASS', url: 'https://tytpht.hdd.io.vn/img/bmassloadings.png' },
];

interface LocationUser {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  updatedAt: number;
  isMock?: boolean;
}

// Map Styles available for selection
const MAP_TILES = [
  {
    id: 'voyager',
    name: 'Sáng hiện đại',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap'
  },
  {
    id: 'dark',
    name: 'Tối huyền bí',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  },
  {
    id: 'positron',
    name: 'Tối giản',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
];

// Dynamic CDN Loader for Leaflet
const loadLeaflet = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }
    // Load CSS safely
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.id = 'leaflet-css';
      document.head.appendChild(link);
    }

    // Load JS safely
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.id = 'leaflet-js';
      script.onload = () => {
        setTimeout(() => {
          resolve((window as any).L);
        }, 150);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      // Script tagged, check if object becomes defined
      const checkL = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkL);
          resolve((window as any).L);
        }
      }, 50);
    }
  });
};

export default function FindNearby({ onBack }: { onBack: () => void }) {
  const { user, userData, isAdmin } = useAuthStore();
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    return localStorage.getItem(`geo_consent_${user?.uid}`) === 'true';
  });
  
  const [activeUsers, setActiveUsers] = useState<LocationUser[]>([]);
  const [currentUserPos, setCurrentUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<LocationUser | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark');
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  // Search query state for filtering by phone number, email, and name
  const [searchQuery, setSearchQuery] = useState('');

  // User profile update states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync state values on load/on opening editor
  useEffect(() => {
    if (user || userData) {
      setEditDisplayName(user?.displayName || userData?.displayName || '');
      setEditPhotoURL(user?.photoURL || userData?.photoURL || 'https://tytpht.hdd.io.vn/img/bmassloadings.png');
      setEditPhoneNumber(userData?.phoneNumber || '');
    }
  }, [user, userData, isEditingProfile]);

  // Contact Details modal
  const [contactModalUser, setContactModalUser] = useState<LocationUser | null>(null);

  // Friendships and Requests logic
  const [friendships, setFriendships] = useState<any[]>([]);

  // Sync / Subscribe to friendships
  useEffect(() => {
    if (!user) return;

    // We query documents where the current user is either the sender or the receiver.
    const qFriendships = query(
      collection(db, 'nearby_friendships'),
      or(
        where('senderId', '==', user.uid),
        where('receiverId', '==', user.uid)
      )
    );

    const unsub = onSnapshot(qFriendships, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      setFriendships(list);
    }, (err) => {
      console.error("Firestore friendships connection error:", err);
    });

    return () => unsub();
  }, [user]);

  const maskEmail = (email: string) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 4) {
      return name.slice(0, 2) + '****' + '@' + domain;
    }
    return name.slice(0, Math.min(6, name.length - 2)) + '****' + '@' + domain;
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const clean = phone.trim();
    if (clean.length <= 6) return '***';
    const first3 = clean.slice(0, 3);
    const last3 = clean.slice(-3);
    const middleLength = clean.length - 6;
    const stars = '*'.repeat(middleLength > 0 ? middleLength : 6);
    return `${first3}${stars}${last3}`;
  };

  const getFriendshipStatus = (targetId: string) => {
    if (isAdmin) return 'accepted';
    if (user?.uid === targetId) return 'accepted';
    const friendship = friendships.find(f => 
      (f.senderId === user?.uid && f.receiverId === targetId) ||
      (f.senderId === targetId && f.receiverId === user?.uid)
    );
    if (!friendship) return 'none';
    return friendship.status; // 'pending' | 'accepted' | 'declined'
  };

  const getFriendshipObj = (targetId: string) => {
    return friendships.find(f => 
      (f.senderId === user?.uid && f.receiverId === targetId) ||
      (f.senderId === targetId && f.receiverId === user?.uid)
    );
  };

  const handleSendFriendRequest = async (target: LocationUser) => {
    if (!user) {
      toast.error("Bạn cần đăng nhập!");
      return;
    }
    const friendshipId = `${user.uid}_${target.userId}`;
    try {
      await setDoc(doc(db, 'nearby_friendships', friendshipId), {
        id: friendshipId,
        senderId: user.uid,
        receiverId: target.userId,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      toast.success(`Đã gửi lời mời kết bạn đến ${target.displayName}`);
    } catch (err) {
      toast.error("Gửi lời mời kết bạn thất bại!");
      console.error(err);
    }
  };

  const handleCancelFriendRequest = async (friendshipId: string) => {
    try {
      await deleteDoc(doc(db, 'nearby_friendships', friendshipId));
      toast.success("Đã huỷ lời mời kết bạn");
    } catch (err) {
      toast.error("Huỷ lời mời thất bại");
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      await updateDoc(doc(db, 'nearby_friendships', friendshipId), {
        status: 'accepted',
        updatedAt: Date.now()
      });
      toast.success("Hai bạn đã là bạn bè! Đã chia sẻ thông tin liên lạc.");
    } catch (err) {
      toast.error("Chấp nhận kết bạn thất bại!");
    }
  };

  const handleDeclineFriendRequest = async (friendshipId: string) => {
    try {
      await deleteDoc(doc(db, 'nearby_friendships', friendshipId));
      toast.success("Đã từ chối kết bạn.");
    } catch (err) {
      toast.error("Từ chối thất bại!");
    }
  };

  const handleUnfriend = async (friendshipId: string) => {
    if (!confirm("Bạn có chắc chắn muốn huỷ kết bạn không?")) return;
    try {
      await deleteDoc(doc(db, 'nearby_friendships', friendshipId));
      toast.success("Đã huỷ kết bạn.");
    } catch (err) {
      toast.error("Huỷ kết bạn thất bại!");
    }
  };

  // References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const ownMarkerRef = useRef<any>(null);
  const leafletInstanceRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  // HCM City Center center fallback (~Bưu điện Thành phố)
  const FALLBACK_LAT = 10.779782;
  const FALLBACK_LNG = 10.699305;

  // Initialize consent check
  useEffect(() => {
    const savedConsent = localStorage.getItem(`geo_consent_${user?.uid}`);
    if (savedConsent === 'true') {
      setHasConsent(true);
    }
  }, [user]);

  // Haversine formula to compute distance in meters
  const computeDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Humanized distance tag generator
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Main system activation: GPS retrieval and database registration
  const startLocationServices = async (forceGps: boolean = false) => {
    setIsLocating(true);

    // If not forcing physical GPS, and user has cached location, use it instantly!
    if (!forceGps && userData?.location?.lat && userData?.location?.lng) {
      const { lat, lng } = userData.location;
      setCurrentUserPos({ lat, lng });
      registerLocation(lat, lng);
      setIsLocating(false);
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị Geolocation. Sử dụng vị trí mặc định.');
      registerLocation(FALLBACK_LAT, FALLBACK_LNG);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentUserPos({ lat: latitude, lng: longitude });
        registerLocation(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation API error:", error);
        toast.error('Không thể cập nhật vị trí tự động qua GPS. Sử dụng vị trí mặc định.');
        setCurrentUserPos({ lat: FALLBACK_LAT, lng: FALLBACK_LNG });
        registerLocation(FALLBACK_LAT, FALLBACK_LNG);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Register or update our position in Firebase
  const registerLocation = async (lat: number, lng: number) => {
    if (!user) return;
    const targetDoc = doc(db, 'shared_locations', user.uid);
    try {
      await setDoc(targetDoc, {
        userId: user.uid,
        displayName: user.displayName || userData?.displayName || 'Người dùng BMASS',
        email: user.email || userData?.email || 'N/A',
        photoURL: user.photoURL || userData?.photoURL || 'https://tytpht.hdd.io.vn/img/bmassloadings.png',
        phoneNumber: userData?.phoneNumber || 'Chưa cung cấp SĐT',
        latitude: lat,
        longitude: lng,
        updatedAt: Date.now()
      });
      setCurrentUserPos({ lat, lng });
    } catch (e) {
      console.error("Failed to update position on Firebase:", e);
    }
  };

  // Stop sharing location and clean up Firebase doc
  const stopSharingLocation = async () => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'shared_locations', user.uid));
    } catch (e) {
      console.warn("Could not delete locator document:", e);
    }
  };

  // Delete coordinate document when component unmounts
  useEffect(() => {
    if (hasConsent) {
      startLocationServices(false);
    }
    return () => {
      stopSharingLocation();
    };
  }, [hasConsent]);

  // Listen to Firestore active users list
  useEffect(() => {
    if (!hasConsent || !currentUserPos) return;

    const unsub = onSnapshot(collection(db, 'shared_locations'), (snapshot) => {
      const realList: LocationUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId && data.userId !== user?.uid && data.latitude && data.longitude) {
          realList.push(data as LocationUser);
        }
      });

      // Sort by proximity and parse distance
      const combined = realList.map(item => {
        return {
          ...item,
          distance: computeDistance(currentUserPos.lat, currentUserPos.lng, item.latitude, item.longitude)
        };
      });

      combined.sort((a, b) => {
        const distA = computeDistance(currentUserPos.lat, currentUserPos.lng, a.latitude, a.longitude);
        const distB = computeDistance(currentUserPos.lat, currentUserPos.lng, b.latitude, b.longitude);
        return distA - distB;
      });

      setActiveUsers(combined);
    }, (err) => {
      console.error("Firestore active users connection error:", err);
    });

    return () => unsub();
  }, [hasConsent, currentUserPos, user?.uid]);

  // Leaflet map renderer & update markers
  useEffect(() => {
    if (!hasConsent || !currentUserPos || !mapContainerRef.current) return;

    let L: any;
    
    const initializeMap = async () => {
      try {
        L = await loadLeaflet();
        leafletInstanceRef.current = L;

        if (mapRef.current) {
          // If already initialized, just set center and redraw
          mapRef.current.setView([currentUserPos.lat, currentUserPos.lng]);
          updateMarkersList(L);
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
            }
          }, 150);
          return;
        }

        // Initialize Map Instance
        const map = L.map(mapContainerRef.current, {
          center: [currentUserPos.lat, currentUserPos.lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapRef.current = map;

        // Apply Layer style
        const activeLayerObj = MAP_TILES.find(t => t.id === mapStyle) || MAP_TILES[0];
        const tileLayer = L.tileLayer(activeLayerObj.url, {
          maxZoom: 20,
          attribution: activeLayerObj.attribution
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        updateMarkersList(L);

        // Force a robust resize trigger right after loading
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 300);
      } catch (err) {
        console.error("Leaflet initialization failed: ", err);
      }
    };

    initializeMap();

    // Resize listener for desktop card layouts and sandbox frames
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    // Dynamic sizing helper to make sure map tiles snap correctly
    const initialSizeTimeout = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 450);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialSizeTimeout);
      // Clean up map instance when the utility is closed/unmounted
      if (mapRef.current) {
        try {
          if (routeLineRef.current) {
            routeLineRef.current.remove();
          }
        } catch (e) {}
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn("Leaflet map cleanup error:", e);
        }
        mapRef.current = null;
        ownMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, [hasConsent, currentUserPos?.lat, currentUserPos?.lng]);

  // Handle tile layout adjustments (dark/light switch)
  useEffect(() => {
    const L = leafletInstanceRef.current;
    if (mapRef.current && tileLayerRef.current && L) {
      mapRef.current.removeLayer(tileLayerRef.current);
      const activeLayerObj = MAP_TILES.find(t => t.id === mapStyle) || MAP_TILES[0];
      const newLayer = L.tileLayer(activeLayerObj.url, {
        maxZoom: 20,
        attribution: activeLayerObj.attribution
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    }
  }, [mapStyle]);

  // Redraw markers whenever filteredUsers list, selected user, or self position updates
  useEffect(() => {
    const L = leafletInstanceRef.current;
    if (mapRef.current && L && currentUserPos) {
      updateMarkersList(L);
    }
  }, [searchQuery, activeUsers, selectedUser, currentUserPos, friendships]);

  // Method to redraw all markers dynamically based on state
  const updateMarkersList = (L: any) => {
    const map = mapRef.current;
    if (!map || !currentUserPos) return;

    // 1. Draw/Update Own Marker (Blue avatar frame with pulsing radar)
    if (ownMarkerRef.current) {
      ownMarkerRef.current.remove();
    }

    const selfGravatar = user?.photoURL || userData?.photoURL || 'https://tytpht.hdd.io.vn/img/bmassloadings.png';
    const selfIconHtml = `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute inset-0 w-12 h-12 bg-indigo-500 rounded-full animate-ping opacity-45"></div>
        <div class="absolute inset-2 w-8 h-8 rounded-full border-2 border-indigo-500 bg-indigo-500/20"></div>
        <img src="${selfGravatar}" class="w-10 h-10 rounded-full object-cover border-2 border-indigo-500 shadow-xl relative z-10" />
        <div class="absolute -bottom-1 bg-indigo-600 text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap z-20 shadow">BẠN</div>
      </div>
    `;

    const selfCustomIcon = L.divIcon({
      html: selfIconHtml,
      className: 'custom-div-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    ownMarkerRef.current = L.marker([currentUserPos.lat, currentUserPos.lng], {
      icon: selfCustomIcon,
      zIndexOffset: 1000
    }).addTo(map);

    ownMarkerRef.current.bindPopup(`
      <div class="p-1 text-slate-900 border-none">
        <p class="font-bold text-sm mb-0.5">Bạn đang ở đây</p>
        <p class="text-[10px] text-slate-500 font-medium">Vị trí cập nhật tự động</p>
      </div>
    `);

    // 2. Draw active users markers
    // Clear old marker references
    Object.keys(markersRef.current).forEach((key) => {
      markersRef.current[key].remove();
    });
    markersRef.current = {};

    // Filter local active users dynamically
    const queryLower = searchQuery.toLowerCase().trim();
    const filteredUsers = activeUsers.filter(item => {
      if (!queryLower) return true;
      return (
        (item.displayName || '').toLowerCase().includes(queryLower) ||
        (item.email || '').toLowerCase().includes(queryLower) ||
        (item.phoneNumber || '').toLowerCase().includes(queryLower)
      );
    });

    filteredUsers.forEach((target) => {
      const isSelected = selectedUser?.userId === target.userId;
      const userDist = computeDistance(currentUserPos.lat, currentUserPos.lng, target.latitude, target.longitude);
      
      const customIconHtml = `
        <div class="relative flex items-center justify-center w-12 h-12 group transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute inset-0 w-12 h-12 rounded-full border-2 border-emerald-500/30 group-hover:animate-pulse"></div>
          <div class="absolute inset-1.5 w-9 h-9 border border-emerald-400 bg-emerald-400/10 rounded-full"></div>
          <img src="${target.photoURL}" class="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-lg relative z-10" />
          <div class="absolute -bottom-1 bg-slate-900/90 text-[8px] text-zinc-100 px-1 py-0.5 rounded-full font-bold whitespace-nowrap z-20 shadow ring-1 ring-white/10">
            ${formatDistance(userDist)}
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-div-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const markerInstance = L.marker([target.latitude, target.longitude], {
        icon: divIcon
      }).addTo(map);

      // Save marker reference
      markersRef.current[target.userId] = markerInstance;

      // Handle marker Click
      markerInstance.on('click', () => {
        setSelectedUser(target);
        setMobileTab('list');
      });

      // Simple map popup setup
      const fStatus = getFriendshipStatus(target.userId);
      const isFriend = fStatus === 'accepted';
      const mEmail = isFriend ? target.email : maskEmail(target.email);
      const mPhone = isFriend ? target.phoneNumber : maskPhone(target.phoneNumber);

      markerInstance.bindPopup(`
        <div class="p-2 text-slate-900 dark:text-zinc-100 max-w-[210px] space-y-1">
          <div class="flex items-center gap-2 mb-1.5 border-b border-slate-100 pb-1">
            <img src="${target.photoURL}" class="w-6 h-6 rounded-full object-cover border border-emerald-500" />
            <p class="font-bold text-xs truncate m-0">${target.displayName}</p>
          </div>
          <p class="text-[10px] m-0"><span class="font-medium text-slate-400">Cách:</span> ${formatDistance(userDist)}</p>
          <p class="text-[10px] m-0"><span class="font-medium text-slate-400">SĐT:</span> ${mPhone}</p>
          <p class="text-[10px] m-0"><span class="font-medium text-slate-400">Email:</span> ${mEmail}</p>
          ${!isFriend ? `<p class="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1">Gợi ý: Nhấp vào danh sách để gửi lời mời Kết bạn</p>` : ''}
        </div>
      `);
    });

    // 3. Draw route line connecting to selectedUser if available
    if (routeLineRef.current) {
      try {
        routeLineRef.current.remove();
      } catch (e) {}
      routeLineRef.current = null;
    }

    if (selectedUser) {
      const isStillActive = activeUsers.some(u => u.userId === selectedUser.userId);
      if (isStillActive) {
        try {
          const coords = [
            [currentUserPos.lat, currentUserPos.lng],
            [selectedUser.latitude, selectedUser.longitude]
          ];
          routeLineRef.current = L.polyline(coords, {
            color: '#6366f1',
            weight: 3,
            opacity: 0.8,
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
        } catch (e) {
          console.warn("Could not draw Leaflet polyline route:", e);
        }
      }
    }
  };

  // Center Map on any selected user
  const panToUser = (target: LocationUser) => {
    setSelectedUser(target);
    if (mapRef.current) {
      mapRef.current.setView([target.latitude, target.longitude], 16, { animate: true, duration: 1 });
      const targetMarker = markersRef.current[target.userId];
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }
  };

  // Handle accepting permission and loading the utility
  const handleAcceptConsent = () => {
    localStorage.setItem(`geo_consent_${user?.uid}`, 'true');
    setHasConsent(true);
    toast.success('Đã kích hoạt Tiện ích Tìm Quanh Đây!', { icon: '🗺️' });
  };

  // Handle decline and backing away
  const handleDeclineConsent = () => {
    toast.error('Bạn cần cho phép chia sẻ vị trí để sử dụng tính năng này.');
    onBack();
  };

  // Safe copying helpers
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  // Render the authorization consent wall if not approved
  if (!hasConsent) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
        <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8 shadow-xl shadow-indigo-500/5">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>

        <h1 className="text-3xl font-display font-black tracking-tight text-slate-950 dark:text-white mb-4">
          Tiện ích: Tìm Quanh Đây
        </h1>
        
        <p className="text-slate-600 dark:text-zinc-400 max-w-xl mx-auto text-base leading-relaxed mb-8 font-medium">
          Hệ thống cần quyền chia sẻ vị trí địa lý của bạn để cung cấp radar bản đồ, đo đạc khoảng cách thực tế thời gian thực và hiển thị vị trí của bạn với những người dùng khác trong khu vực. 
        </p>

        <div className="glass-card max-w-lg p-6 mb-10 text-left border border-indigo-500/20 bg-indigo-500/5 rounded-2xl">
          <div className="flex gap-4">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-200">Điều khoản & Bảo mật Quyền riêng tư:</h4>
              <ul className="text-xs text-slate-600 dark:text-zinc-400 space-y-1.5 list-disc pl-5">
                <li>Vị trí của bạn được cập nhật thời gian thực chỉ khi bạn đang truy cập tiện ích này.</li>
                <li>Dữ liệu vị trí sẽ được tự động xóa bỏ hoàn toàn khỏi máy chủ ngay khi bạn đóng tiện ích hoặc thoát ứng dụng.</li>
                <li>Các thông tin cơ bản (Ảnh đại diện, Tên hiển thị, Email và Số điện thoại liên hệ) sẽ hiển thị công khai trên bản đồ radar để hỗ trợ kết nối.</li>
                <li>Hệ thống tự động sử dụng toạ độ trung tâm TP. HCM làm vị trí mặc định nếu thiết bị của bạn không có GPS trực tiếp.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleDeclineConsent}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm cursor-pointer"
          >
            Từ chối & Quay lại
          </button>
          <button
            onClick={handleAcceptConsent}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition-all text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            Đồng ý Chia sẻ & Truy cập
            <Navigation className="w-4 h-4 fill-white/20" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto py-4 lg:py-8 relative min-h-[85vh] animate-fade-in flex flex-col h-full font-sans text-slate-900 dark:text-zinc-300">
      
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 bg-transparent border-b border-slate-100 dark:border-white/5 pb-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-none">Find Nearby</h1>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 select-none animate-pulse">Radar Live</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium mt-1">
              Vị trí của bạn đang được chia sẻ tự động theo thời gian thực
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Map Style Selector */}
          <div className="flex items-center bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/15 rounded-xl p-1 shadow-sm">
            {MAP_TILES.map((t) => (
              <button
                key={t.id}
                onClick={() => setMapStyle(t.id)}
                className={cn(
                  "px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all cursor-pointer",
                  mapStyle === t.id 
                    ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" 
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Quick Refresh Geolocation */}
          <button
            onClick={() => startLocationServices(true)}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-55"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-500", isLocating && "animate-spin")} />
            <span>Định vị lại</span>
          </button>

          {/* Stop Sharing Option */}
          <button
            onClick={() => {
              localStorage.removeItem(`geo_consent_${user?.uid}`);
              stopSharingLocation();
              setHasConsent(false);
              toast.success('Đã tắt định vị & xoá khỏi hệ thống.');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-500/20 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dừng chia sẻ</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Swapper */}
      <div className="flex md:hidden bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-1 mb-4 select-none shrink-0">
        <button
          onClick={() => setMobileTab('map')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 cursor-pointer",
            mobileTab === 'map' ? "bg-white dark:bg-zinc-850 shadow text-slate-900 dark:text-white" : "text-slate-500"
          )}
        >
          <MapIcon className="w-4 h-4 text-indigo-500" />
          Màn hình Bản đồ (4/5)
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 cursor-pointer",
            mobileTab === 'list' ? "bg-white dark:bg-zinc-850 shadow text-slate-900 dark:text-white" : "text-slate-500"
          )}
        >
          <User className="w-4 h-4 text-emerald-500" />
          Thành viên quanh bạn
        </button>
      </div>

      {/* Main Content Area: Split 1/5 and 4/5 */}
      <div className="w-full h-auto min-h-[550px] md:h-[650px] lg:h-[calc(100vh-220px)] max-h-[1100px] flex flex-col md:flex-row gap-5">
        
        {/* Left Side: 1/5 width Scrollable List - Shows users who have shared position */}
        <div className={cn(
          "w-full md:w-[30%] lg:w-[28%] xl:w-[25%] min-w-[320px] flex flex-col bg-white/40 dark:bg-zinc-900/30 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden glass-card shadow-sm h-[550px] md:h-full",
          mobileTab !== 'list' && "hidden md:flex"
        )}>
          {/* Own Profile Integration Block */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Hồ sơ cá nhân</span>
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-700 dark:text-zinc-200 cursor-pointer shadow-xs transition-all"
              >
                <Edit className="w-2.5 h-2.5" />
                <span>Chỉnh sửa</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <img 
                src={user?.photoURL || userData?.photoURL || 'https://tytpht.hdd.io.vn/img/bmassloadings.png'} 
                className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-md shrink-0" 
                alt="My Avatar"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://tytpht.hdd.io.vn/img/bmassloadings.png' }}
              />
              <div className="flex-1 min-w-0 pr-3">
                <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {user?.displayName || userData?.displayName || 'Người dùng BMASS'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                  {user?.email || userData?.email || 'N/A'}
                </p>
                {userData?.phoneNumber && (
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5 truncate flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 shrink-0" />
                    <span>{userData.phoneNumber}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sleek Search Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/30 dark:bg-zinc-950/20">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm SĐT, email hoặc tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Header */}
          <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              <span className="font-extrabold text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Xung quanh</span>
            </div>
            <span className="text-[10px] font-extrabold px-3 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
              {(() => {
                const queryLower = searchQuery.toLowerCase().trim();
                const filteredCount = activeUsers.filter(item => {
                  if (!queryLower) return true;
                  return (
                    (item.displayName || '').toLowerCase().includes(queryLower) ||
                    (item.email || '').toLowerCase().includes(queryLower) ||
                    (item.phoneNumber || '').toLowerCase().includes(queryLower)
                  );
                }).length;
                return `${filteredCount} kết quả`;
              })()}
            </span>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 custom-scrollbar p-2 space-y-1">
            {(() => {
              const queryLower = searchQuery.toLowerCase().trim();
              const filteredList = activeUsers.filter(item => {
                if (!queryLower) return true;
                return (
                  (item.displayName || '').toLowerCase().includes(queryLower) ||
                  (item.email || '').toLowerCase().includes(queryLower) ||
                  (item.phoneNumber || '').toLowerCase().includes(queryLower)
                );
              });

              if (filteredList.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 dark:text-zinc-600 flex flex-col items-center justify-center gap-3 h-full">
                    <Navigation className="w-8 h-8 opacity-40 animate-pulse text-indigo-500" />
                    <p className="text-xs font-semibold">Chưa phát hiện ai gần đây...</p>
                    <p className="text-[10px]">Quét radar/Nhập từ khoá tìm kiếm khác</p>
                  </div>
                );
              }

              return filteredList.map((item) => {
                const isSelected = selectedUser?.userId === item.userId;
                const distanceVal = computeDistance(
                  currentUserPos?.lat || 0,
                  currentUserPos?.lng || 0,
                  item.latitude,
                  item.longitude
                );

                return (
                  <div
                    key={item.userId}
                    onClick={() => panToUser(item)}
                    className={cn(
                      "p-3 rounded-2xl transition-all cursor-pointer flex flex-col gap-2 relative border border-transparent",
                      isSelected 
                        ? "bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-500/15" 
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                    )}
                  >
                    {/* Top line Info: Avt + Name + Badge */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img 
                          src={item.photoURL} 
                          className="w-10 h-10 rounded-full object-cover shadow-sm border border-emerald-500" 
                          alt={item.displayName} 
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-zinc-900 bg-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-1.5 justify-between">
                          <p className="font-extrabold text-xs text-slate-900 dark:text-zinc-100 truncate leading-snug">
                            {item.displayName}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                          {getFriendshipStatus(item.userId) === 'accepted' ? item.email : maskEmail(item.email)}
                        </p>
                      </div>
                    </div>

                    {/* Middle Line: Meter Distance */}
                    <div className="flex items-center justify-between text-[11px] font-black tracking-tight mt-1">
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                        <MapPin className="w-3 h-3" />
                        <span>Khoảng cách: {formatDistance(distanceVal)}</span>
                      </div>
                    </div>

                    {/* Contact & Friend Actions */}
                    <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      {(() => {
                        const fStatus = getFriendshipStatus(item.userId);
                        const fObj = getFriendshipObj(item.userId);
                        
                        if (fStatus === 'accepted') {
                          return (
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex gap-1.5 w-full animate-fadeIn">
                                <a
                                  href={`tel:${item.phoneNumber}`}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid panning when dialing
                                    toast.success(`Đang gọi ${item.displayName}...`);
                                  }}
                                  className="flex-1 text-center py-1.5 bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm shadow-emerald-600/10 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Phone className="w-3 h-3 fill-white/20" />
                                  Gọi điện
                                </a>

                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&origin=${currentUserPos?.lat},${currentUserPos?.lng}&destination=${item.latitude},${item.longitude}&travelmode=driving`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 text-center py-1.5 bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] text-white font-bold text-[10px] rounded-lg transition-all shadow-sm shadow-indigo-650/10 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Navigation className="w-3 h-3 fill-white/20" />
                                  Di chuyển đến
                                </a>
                              </div>
                              <div className="flex gap-1.5 w-full">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContactModalUser(item);
                                  }}
                                  className="flex-1 py-1 px-2.5 bg-slate-105 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 font-extrabold text-[10px] rounded-lg transition-all border border-slate-250 dark:border-white/10 cursor-pointer"
                                >
                                  Chi tiết
                                </button>

                                {fObj && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnfriend(fObj.id);
                                    }}
                                    className="p-1 px-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-extrabold text-[10px] rounded-lg border border-red-500/20 cursor-pointer transition-all shrink-0"
                                    title="Huỷ kết bạn"
                                  >
                                    Huỷ KB
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        } else if (fStatus === 'pending') {
                          if (fObj?.senderId === user?.uid) {
                            return (
                              <div className="flex gap-1.5 items-center justify-between w-full">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                  Chờ đồng ý...
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelFriendRequest(fObj.id);
                                    }}
                                    className="px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer transition-all"
                                  >
                                    Huỷ lời mời
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContactModalUser(item);
                                    }}
                                    className="p-1 px-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-350 font-extrabold text-[10px] rounded-lg transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
                                  >
                                    Chi tiết
                                  </button>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex flex-col gap-1.5 w-full">
                                <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 animate-pulse text-left mb-1">
                                  ✉️ Nhận lời mời kết bạn!
                                </p>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptFriendRequest(fObj.id);
                                    }}
                                    className="flex-1 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                                  >
                                    Đồng ý
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeclineFriendRequest(fObj.id);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-150 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] rounded-lg cursor-pointer hover:bg-slate-200 transition-all border border-slate-200 dark:border-white/10"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContactModalUser(item);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-605 dark:text-zinc-300 font-extrabold text-[10px] rounded-lg cursor-pointer transition-all border border-slate-200"
                                  >
                                    Chi tiết
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        } else {
                          return (
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex gap-1.5 w-full animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendFriendRequest(item);
                                  }}
                                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02]"
                                >
                                  <User className="w-3 h-3" />
                                  Kết bạn để xem
                                </button>

                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&origin=${currentUserPos?.lat},${currentUserPos?.lng}&destination=${item.latitude},${item.longitude}&travelmode=driving`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 text-center py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-[10px] rounded-lg transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Navigation className="w-3 h-3 text-indigo-500" />
                                  Di chuyển đến
                                </a>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContactModalUser(item);
                                }}
                                className="w-full py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-400 font-extrabold text-[10px] rounded-lg cursor-pointer transition-all"
                              >
                                Chi tiết
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>

                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Right Side: 4/5 width Interactive Leaflet Map wrapper */}
        <div className={cn(
          "w-full md:w-[70%] lg:w-[72%] xl:w-[75%] flex flex-col bg-slate-950 rounded-3xl overflow-hidden glass-card relative h-[450px] md:h-full min-h-[400px] md:min-h-0",
          mobileTab !== 'map' && "hidden md:flex"
        )}>
          {/* Map Container Ref */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[400px] md:min-h-0 relative z-10" />

          {/* Quick HUD Overlays */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none select-none flex flex-col gap-2">
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Hệ thống Radar GPS</p>
                <p className="text-xs font-bold text-white leading-none mt-0.5">Tự động quét thành viên thời gian thực</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 max-w-[280px] shadow-2xl text-[10px] select-none text-zinc-300 gap-1.5 flex flex-col">
            <p className="font-extrabold uppercase text-white leading-none tracking-widest text-indigo-400 mb-1">Mẹo Radar:</p>
            <p>1. Bản đồ tự động cập nhật vị trí GPS chính xác của bạn.</p>
            <p>2. Chọn một người dùng trong danh sách để tự động xoay bản đồ và mở popup thông tin liên lạc.</p>
          </div>

          {/* Fallback load state */}
          {(!leafletInstanceRef.current) && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center gap-4 z-30">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-slate-300">Đang khởi tạo Radar Bản đồ...</p>
            </div>
          )}
        </div>

      </div>

      {/* Modern Contact details pop up modal */}
      <AnimatePresence>
        {contactModalUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-white/10 max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="relative p-6 text-center border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/80">
                <button
                  type="button"
                  onClick={() => setContactModalUser(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {/* Avatar frame */}
                <div className="relative inline-block mt-4">
                  <img 
                    src={contactModalUser.photoURL} 
                    className="w-24 h-24 rounded-[2rem] object-cover border-4 border-indigo-100 dark:border-indigo-500/20 shadow-xl" 
                    alt={contactModalUser.displayName} 
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-[3px] border-white dark:border-zinc-900">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white leading-none">
                    {contactModalUser.displayName}
                  </h3>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1.5 bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10 inline-block">
                    Khoảng cách: {formatDistance(computeDistance(currentUserPos?.lat || 0, currentUserPos?.lng || 0, contactModalUser.latitude, contactModalUser.longitude))}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Email line */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Email</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {getFriendshipStatus(contactModalUser.userId) === 'accepted' ? contactModalUser.email : maskEmail(contactModalUser.email)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (getFriendshipStatus(contactModalUser.userId) !== 'accepted') {
                        toast.error('Nhấn nút Kết Bạn và đợi đối phương đồng ý để nhận thông tin liên lạc!');
                        return;
                      }
                      copyToClipboard(contactModalUser.email, 'Đã sao chép địa chỉ Email!');
                    }}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all text-slate-400 hover:text-slate-900 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Phone line */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Số điện thoại</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {getFriendshipStatus(contactModalUser.userId) === 'accepted' ? contactModalUser.phoneNumber : maskPhone(contactModalUser.phoneNumber)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (getFriendshipStatus(contactModalUser.userId) !== 'accepted') {
                        toast.error('Nhấn nút Kết Bạn và đợi đối phương đồng ý để nhận thông tin liên lạc!');
                        return;
                      }
                      copyToClipboard(contactModalUser.phoneNumber, 'Đã sao chép Số điện thoại!');
                    }}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all text-slate-400 hover:text-slate-900 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dial or Friend Action directly */}
              <div className="p-6 pt-0">
                {(() => {
                  const fStatus = getFriendshipStatus(contactModalUser.userId);
                  const fObj = getFriendshipObj(contactModalUser.userId);

                  if (fStatus === 'accepted') {
                    return (
                      <div className="space-y-3">
                        <a
                          href={`tel:${contactModalUser.phoneNumber}`}
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          <Phone className="w-4 h-4 fill-white/10 animate-shake" />
                          Quay số gọi điện ngay
                        </a>
                        {fObj && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUnfriend(fObj.id);
                              setContactModalUser(null);
                            }}
                            className="w-full py-2 bg-red-500/10 dark:bg-red-500/5 hover:bg-red-600 hover:text-white text-red-500 font-bold text-xs rounded-xl cursor-pointer transition-all border border-red-500/20"
                          >
                            Hủy kết bạn
                          </button>
                        )}
                      </div>
                    );
                  } else if (fStatus === 'pending') {
                    if (fObj?.senderId === user?.uid) {
                      return (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-3">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                             Lời mời kết bạn đã gửi. Đang chờ phản hồi...
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              handleCancelFriendRequest(fObj.id);
                              setContactModalUser(null);
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Huỷ lời mời kết bạn
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col gap-3">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 text-center animate-pulse">
                             Nhận được lời mời kết bạn từ {contactModalUser.displayName}!
                          </p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                handleAcceptFriendRequest(fObj.id);
                                setContactModalUser(null);
                              }}
                              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                            >
                              Đồng ý kết bạn
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeclineFriendRequest(fObj.id);
                                setContactModalUser(null);
                              }}
                              className="flex-1 py-3 bg-slate-105 dark:bg-zinc-800 text-slate-700 dark:text-zinc-350 hover:bg-slate-200 transition-all font-bold text-xs rounded-xl cursor-pointer border border-slate-200 dark:border-white/10"
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      );
                    }
                  } else {
                    return (
                      <div className="p-4 bg-slate-50 dark:bg-zinc-950/20 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col gap-3 items-center text-center">
                        <Lock className="w-6 h-6 text-indigo-500" />
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">Thông tin đang được ẩn</p>
                          <p className="text-[10px] text-slate-500 max-w-[240px] mt-1">Kết bạn để xem đầy đủ thông tin số điện thoại và email của {contactModalUser.displayName}.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleSendFriendRequest(contactModalUser);
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-550 hover:to-violet-550 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          Gửi lời mời kết bạn
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Profile Editing Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200 dark:border-white/10 max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="relative p-6 text-center border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/80">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">Thiết lập Hồ sơ Của Bạn</h3>
                <p className="text-xs text-slate-500 mt-1">Thay đổi tên hiển thị và định dạng ảnh đại diện trên Radar</p>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {/* Display Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider block text-left">Tên hiển thị:</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Phone number input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider block text-left">Số điện thoại liên hệ:</label>
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Photo URL Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider block text-left">URL ảnh đại diện tùy chỉnh (hoặc chọn bên dưới):</label>
                  <input
                    type="text"
                    value={editPhotoURL}
                    onChange={(e) => setEditPhotoURL(e.target.value)}
                    placeholder="Nhập liên kết hình ảnh..."
                    className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>

                {/* Avatar presets selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider block text-left">Chọn nhanh ảnh đại diện:</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                    {PRESET_AVATARS.map((av, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setEditPhotoURL(av.url)}
                        title={av.name}
                        className={cn(
                          "relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 shrink-0 bg-slate-100",
                          editPhotoURL === av.url ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-transparent"
                        )}
                      >
                        <img src={av.url} className="w-full h-full object-cover" alt={av.name} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Preview */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 text-left">
                  <img 
                    src={editPhotoURL || 'https://tytpht.hdd.io.vn/img/bmassloadings.png'} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shrink-0 bg-slate-200" 
                    alt="Preview avatar" 
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://tytpht.hdd.io.vn/img/bmassloadings.png' }} 
                  />
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Xem trước hiển thị:</h4>
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-200 mt-0.5 truncate">{editDisplayName || 'Tên hiển thị'}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{editPhoneNumber || 'Chưa nhận dạng SĐT'}</p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 pt-0 border-t border-slate-100 dark:border-white/5 flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-3 text-center bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    if (!editDisplayName.trim()) {
                      toast.error('Tên hiển thị không được để trống.');
                      return;
                    }
                    setIsSavingProfile(true);
                    try {
                      // 1. Update Firebase Auth Profile
                      await updateProfile(user, {
                        displayName: editDisplayName.trim(),
                        photoURL: editPhotoURL.trim()
                      });

                      // 2. Update Firestore 'users' collection
                      const userRef = doc(db, 'users', user.uid);
                      await updateDoc(userRef, {
                        displayName: editDisplayName.trim(),
                        photoURL: editPhotoURL.trim(),
                        phoneNumber: editPhoneNumber.trim()
                      });

                      // 3. Update Firestore 'shared_locations'
                      const sharedRef = doc(db, 'shared_locations', user.uid);
                      try {
                        await updateDoc(sharedRef, {
                          displayName: editDisplayName.trim(),
                          photoURL: editPhotoURL.trim(),
                          phoneNumber: editPhoneNumber.trim()
                        });
                      } catch (e) {
                        console.warn("Could not find shared_location doc to update, skipping direct update:", e);
                      }

                      toast.success('Cập nhật hồ sơ thành công!');
                      setIsEditingProfile(false);
                      // Force local position re-update or restart refresh
                      if (currentUserPos) {
                        registerLocation(currentUserPos.lat, currentUserPos.lng);
                      }
                    } catch (error: any) {
                      console.error(error);
                      toast.error('Lỗi khi lưu hồ sơ: ' + error.message);
                    } finally {
                      setIsSavingProfile(false);
                    }
                  }}
                  disabled={isSavingProfile}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu Cập nhật</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

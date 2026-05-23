import { useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

export default function GuestTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const trackGuest = async () => {
      try {
        let guestId = localStorage.getItem('bmass_guest_id');
        if (!guestId) {
          guestId = uuidv4();
          localStorage.setItem('bmass_guest_id', guestId);
        }

        let ipData: any = {};
        try {
          const res = await fetch('https://freeipapi.com/api/json');
          if (res.ok) {
            ipData = await res.json();
          }
        } catch (e) {
          console.warn("Failed to fetch IP details for tracking", e);
        }

        const payload = {
          lastSeen: serverTimestamp(),
          userAgent: navigator.userAgent,
          ip: ipData.ipAddress || 'Unknown',
          country: ipData.countryName || 'Unknown',
          city: ipData.cityName || 'Unknown',
          region: ipData.regionName || 'Unknown',
          latitude: ipData.latitude || null,
          longitude: ipData.longitude || null,
        };

        const guestRef = doc(db, 'guests', guestId);
        const guestSnap = await getDoc(guestRef);

        if (!guestSnap.exists()) {
          await setDoc(guestRef, {
            ...payload,
            firstSeen: serverTimestamp(),
            visits: 1
          });
        } else {
          await setDoc(guestRef, {
            ...payload,
            visits: (guestSnap.data().visits || 1) + 1
          }, { merge: true });
        }
      } catch (e) {
        console.error("Guest tracking error:", e);
      }
    };

    trackGuest();
  }, []);

  return null;
}

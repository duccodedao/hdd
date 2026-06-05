import { db } from '../lib/firebase';
import { doc, writeBatch, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

// In-memory cache to throttle duplicate increments (e.g., from React Strict Mode, fast clicks, re-renders)
const recentPageVisits = new Map<string, number>();
const recentUtilityVisits = new Map<string, number>();
let hasTrackedSiteVisit = false;

export const statsService = {
  async incrementVisit(path: string = window.location.pathname) {
    // Only increment total/daily site visit count once per page-refresh/access session
    if (hasTrackedSiteVisit) {
      return;
    }
    hasTrackedSiteVisit = true;

    const now = Date.now();
    const normalDateInput = new Date(now);
    const today = format(normalDateInput, 'yyyy-MM-dd');
    const month = format(normalDateInput, 'yyyy-MM');
    const year = format(normalDateInput, 'yyyy');

    let deviceId = localStorage.getItem('site_device_id');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('site_device_id', deviceId);
    }
    const lastDeviceTrackDate = localStorage.getItem('last_device_track_date');
    const shouldTrackDevice = lastDeviceTrackDate !== today;

    if (shouldTrackDevice) {
      localStorage.setItem('last_device_track_date', today);
    }

    const statIds = [
      { id: 'total', inc: increment(1) },
      { id: `day_${today}`, inc: increment(1) },
      { id: `month_${month}`, inc: increment(1) },
      { id: `year_${year}`, inc: increment(1) }
    ];

    if (shouldTrackDevice) {
      statIds.push({ id: `devices_day_${today}`, inc: increment(1) });
    }

    const batch = writeBatch(db);

    for (const stat of statIds) {
      const ref = doc(db, 'site_visitation_stats', stat.id);
      try {
        batch.set(ref, {
          count: stat.inc,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error(`Error adding to batch for ${stat.id}:`, e?.message || String(e));
      }
    }

    try {
      await batch.commit();
    } catch (e) {
      console.error("Error committing stats batch:", e?.message || String(e));
    }
  },

  async incrementUtilityVisit(utilityId: string) {
    const now = Date.now();
    const lastTime = recentUtilityVisits.get(utilityId) || 0;
    
    // Cooldown of 10 seconds per utility
    if (now - lastTime < 10000) {
      return;
    }
    recentUtilityVisits.set(utilityId, now);

    const ref = doc(db, 'utility_stats', utilityId);
    try {
      const batch = writeBatch(db);
      batch.set(ref, {
        count: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      await batch.commit();
    } catch (e) {
      console.error(`Error incrementing utility stats for ${utilityId}:`, e?.message || String(e));
    }
  }
};

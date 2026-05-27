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

    const statIds = [
      'total',
      `day_${today}`,
      `month_${month}`,
      `year_${year}`
    ];

    const batch = writeBatch(db);

    for (const id of statIds) {
      const ref = doc(db, 'site_visitation_stats', id);
      try {
        // We use a small trick: if we don't know if doc exists, 
        // we can either try to get it first or just use set with merge.
        // But increment(1) on a non-existent field works if the doc exists.
        // For atomic batch with increment, set with merge is safer if doc might not exist.
        batch.set(ref, {
          count: increment(1),
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error(`Error adding to batch for ${id}:`, e);
      }
    }

    try {
      await batch.commit();
    } catch (e) {
      console.error("Error committing stats batch:", e);
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
      console.error(`Error incrementing utility stats for ${utilityId}:`, e);
    }
  }
};

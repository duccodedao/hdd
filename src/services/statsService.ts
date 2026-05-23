import { db } from '../lib/firebase';
import { doc, writeBatch, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

export const statsService = {
  async incrementVisit() {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const month = format(now, 'yyyy-MM');
    const year = format(now, 'yyyy');

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
  }
};

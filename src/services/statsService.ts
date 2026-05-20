import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';

export const statsService = {
  async incrementVisit() {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const month = format(now, 'yyyy-MM');
    const year = format(now, 'yyyy');

    // Use session storage to avoid multiple increments in the same session
    const sessionKey = `visited_${today}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, 'true');

    const statDocs = [
      { id: 'total' },
      { id: `day_${today}` },
      { id: `month_${month}` },
      { id: `year_${year}` }
    ];

    for (const stat of statDocs) {
      const ref = doc(db, 'site_visitation_stats', stat.id);
      try {
        await updateDoc(ref, {
          count: increment(1),
          lastUpdated: serverTimestamp()
        });
      } catch (e: any) {
        if (e.code === 'not-found') {
          await setDoc(ref, {
            count: 1,
            lastUpdated: serverTimestamp()
          });
        } else {
          console.error(`Error incrementing stat ${stat.id}:`, e);
        }
      }
    }
  }
};

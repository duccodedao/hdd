import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { formatRelative } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Activity {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: any;
}

export default function ActivityFeed() {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!user) {
      setActivities([]);
      return;
    }

    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activeData);
    }, (error) => {
      console.error("Activity feed snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shadow-lg">
      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-widest mb-4">
        Hoạt động gần đây
      </h3>
      <div className="space-y-4">
        {!user ? (
          <p className="text-zinc-500 text-sm text-center py-4">Vui lòng đăng nhập để xem hoạt động gần đây</p>
        ) : activities.length === 0 ? (
          <p className="text-zinc-500 text-sm">Chưa có hoạt động nào...</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-slate-700 dark:text-zinc-200 font-medium">{activity.action}</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">{activity.details}</p>
                <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-0.5">
                  {formatRelative(activity.createdAt?.toDate ? activity.createdAt.toDate() : new Date(activity.createdAt), new Date(), { locale: vi })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

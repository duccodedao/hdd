import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';
import { useAuthStore } from '../../store/authStore';

export default function AdminIpBlocking() {
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [newIp, setNewIp] = useState('');
  const [reason, setReason] = useState('');
  const { openConfirm } = useConfirmStore();
  const { userData } = useAuthStore();

  useEffect(() => {
    const q = query(collection(db, 'blockedIps'), orderBy('blockedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBannedIps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleBlockIp = async () => {
    if (!newIp) return toast.error('Vui lòng nhập IP');
    try {
      await addDoc(collection(db, 'blockedIps'), {
        ip: newIp,
        reason: reason || 'N/A',
        blockedAt: serverTimestamp(),
        blockedBy: userData?.displayName || 'Admin'
      });
      toast.success('Đã chặn IP!');
      setNewIp('');
      setReason('');
    } catch (err) {
      toast.error('Lỗi khi chặn IP.');
    }
  };

  const handleUnblockIp = (id: string, ip: string) => {
    openConfirm({
      title: 'Bỏ chặn IP',
      message: `Bạn có chắc chắn muốn bỏ chặn IP ${ip}?`,
      confirmText: 'Bỏ chặn',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'blockedIps', id));
          toast.success('Đã bỏ chặn IP!');
        } catch (err) {
          toast.error('Lỗi khi bỏ chặn IP.');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" /> Chặn IP Truy cập
        </h3>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={newIp} 
            onChange={(e) => setNewIp(e.target.value)} 
            placeholder="Nhập IP (ví dụ: 192.168.1.1)" 
            className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none"
          />
          <input 
            type="text" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="Lý do chặn" 
            className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none"
          />
          <button onClick={handleBlockIp} className="bg-rose-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-rose-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Chặn
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-4">IP</th>
              <th className="px-6 py-4">Lý do</th>
              <th className="px-6 py-4">Ngày chặn</th>
              <th className="px-6 py-4">Bởi</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {bannedIps.map(b => (
              <tr key={b.id}>
                <td className="px-6 py-4 font-mono">{b.ip}</td>
                <td className="px-6 py-4">{b.reason}</td>
                <td className="px-6 py-4">{format(toSafeDate(b.blockedAt), 'dd/MM/yyyy HH:mm')}</td>
                <td className="px-6 py-4">{b.blockedBy}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleUnblockIp(b.id, b.ip)} className="text-red-500 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

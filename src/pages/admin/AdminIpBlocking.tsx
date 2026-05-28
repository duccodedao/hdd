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
    }, (err) => {
      console.error("AdminIpBlocking: blockedIps listener error:", err);
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
        blockedBy: userData?.displayName || 'Quản trị'
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
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" /> Quản lý danh sách đen (IP Ban)
        </h3>
        <p className="text-slate-600 text-sm mb-6">Thêm địa chỉ IP để chặn quyền truy cập vào hệ thống của bạn.</p>
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            value={newIp} 
            onChange={(e) => setNewIp(e.target.value)} 
            placeholder="Nhập địa chỉ IP (ví dụ: 192.168.1.1)" 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-900"
          />
          <input 
            type="text" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="Lý do chặn (tùy chọn)" 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-900"
          />
          <button onClick={handleBlockIp} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Chặn IP
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <table className="w-full text-left text-sm text-slate-900 min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Địa chỉ IP</th>
                <th className="px-6 py-4 whitespace-nowrap">Lý do</th>
                <th className="px-6 py-4 whitespace-nowrap">Ngày chặn</th>
                <th className="px-6 py-4 whitespace-nowrap">Bởi</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bannedIps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium whitespace-nowrap">Chưa có IP nào bị chặn.</td>
                </tr>
              ) : (
                bannedIps.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-rose-600 whitespace-nowrap">{b.ip}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{b.reason || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{format(toSafeDate(b.blockedAt), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{b.blockedBy}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => handleUnblockIp(b.id, b.ip)} className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Bỏ chặn">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

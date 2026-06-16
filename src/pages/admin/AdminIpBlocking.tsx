import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, Trash2, Plus, CheckSquare, Square, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { toSafeDate } from '../../lib/utils';
import { useConfirmStore } from '../../store/confirmStore';
import { useAuthStore } from '../../store/authStore';

export default function AdminIpBlocking() {
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [newIp, setNewIp] = useState('');
  const [reason, setReason] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { openConfirm } = useConfirmStore();
  const { userData } = useAuthStore();

  useEffect(() => {
    if (userData?.role === 'review') {
      setBannedIps([]);
      return;
    }
    const q = query(collection(db, 'blockedIps'), orderBy('blockedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBannedIps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("AdminIpBlocking: blockedIps listener error:", err?.message || String(err));
    });
    return () => unsub();
  }, []);

  const handleBlockIp = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
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

  const toggleSelectAll = () => {
    if (selectedIds.length === bannedIps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bannedIps.map(b => b.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác này.');
      return;
    }
    if (selectedIds.length === 0) return;
    openConfirm({
      title: 'Bỏ chặn hàng loạt',
      message: `Bạn có chắc chắn muốn bỏ chặn ${selectedIds.length} địa chỉ IP đã chọn?`,
      confirmText: 'Bỏ chặn tất cả',
      cancelText: 'Hủy',
      variant: 'danger',
      onConfirm: async () => {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, 'blockedIps', id));
        });
        await batch.commit();
        setSelectedIds([]);
        toast.success(`Đã bỏ chặn ${selectedIds.length} IP`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" /> Quản lý danh sách đen (IP Ban)
        </h3>
        <p className="text-slate-600 dark:text-zinc-400 text-sm mb-6">Thêm địa chỉ IP để chặn quyền truy cập vào hệ thống của bạn.</p>
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            value={newIp} 
            onChange={(e) => setNewIp(e.target.value)} 
            placeholder="Nhập địa chỉ IP (ví dụ: 192.168.1.1)" 
            className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-900 dark:text-white"
          />
          <input 
            type="text" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="Lý do chặn (tùy chọn)" 
            className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-900 dark:text-white"
          />
          <button onClick={handleBlockIp} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Chặn IP
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
               {selectedIds.length}
            </div>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">địa chỉ IP đã chọn</span>
          </div>
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-colors"
          >
            <Trash size={14} /> Bỏ chặn tất cả
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[1000px] border-separate border-spacing-0">
            <thead className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-zinc-500 border-b border-slate-200 dark:border-white/5 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4 w-12">
                   <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">
                      {selectedIds.length === bannedIps.length && bannedIps.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                   </button>
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Địa chỉ IP</th>
                <th className="px-6 py-4 whitespace-nowrap">Lý do</th>
                <th className="px-6 py-4 whitespace-nowrap">Ngày chặn</th>
                <th className="px-6 py-4 whitespace-nowrap">Bởi</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {bannedIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500 font-medium whitespace-nowrap">Chưa có IP nào bị chặn.</td>
                </tr>
              ) : (
                bannedIps.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 italic">
                       <button onClick={() => toggleSelect(b.id)} className={selectedIds.includes(b.id) ? "text-indigo-600" : "text-slate-300"}>
                          {selectedIds.includes(b.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                       </button>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-rose-600 whitespace-nowrap">{b.ip}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-zinc-400 whitespace-nowrap">{b.reason || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-zinc-400 whitespace-nowrap">{format(toSafeDate(b.blockedAt), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{b.blockedBy}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => handleUnblockIp(b.id, b.ip)} className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Bỏ chặn">
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

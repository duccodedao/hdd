import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Save, UploadCloud } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function AdminAffiliate() {
  const { userData } = useAuthStore();
  const [config, setConfig] = useState({
    active: false,
    logoUrl: '',
    projectName: '',
    description: '',
    linkRef: '',
    codeRef: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      if (userData?.role === 'review') {
        setConfig({
          active: false,
          logoUrl: '',
          projectName: '',
          description: '',
          linkRef: '',
          codeRef: '',
        });
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'settings', 'affiliate_ads'));
        if (snap.exists()) {
          setConfig(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.error("Error fetching affiliate config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (userData?.role === 'review') {
      toast.error('Tài khoản ở chế độ Review (Chỉ xem), không thể thực hiện thao tác chỉnh sửa này.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'affiliate_ads'), config);
      toast.success('Đã lưu cấu hình quảng cáo thành công');
    } catch (err) {
      toast.error('Lỗi khi lưu cấu hình');
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cấu hình Quảng cáo (Affiliate)</h2>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={config.active} 
            onChange={(e) => setConfig(prev => ({ ...prev, active: e.target.checked }))} 
            className="w-4 h-4"
          />
          <span className="font-bold text-sm">Kích hoạt quảng cáo (Show trên trang chủ)</span>
        </label>

        <div className="grid gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500">Tên dự án</label>
            <input type="text" value={config.projectName} onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))} className="w-full bg-slate-50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200 dark:border-white/5" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500">Mô tả</label>
            <textarea value={config.description} onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))} className="w-full bg-slate-50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200 dark:border-white/5" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500">Logo URL (Dùng link ảnh)</label>
            <input type="text" value={config.logoUrl} onChange={(e) => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))} className="w-full bg-slate-50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200 dark:border-white/5" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500">Link Ref</label>
            <input type="text" value={config.linkRef} onChange={(e) => setConfig(prev => ({ ...prev, linkRef: e.target.value }))} className="w-full bg-slate-50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200 dark:border-white/5" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500">Code Ref</label>
            <input type="text" value={config.codeRef} onChange={(e) => setConfig(prev => ({ ...prev, codeRef: e.target.value }))} className="w-full bg-slate-50 dark:bg-zinc-950 p-2 rounded-lg border border-slate-200 dark:border-white/5" />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold uppercase text-sm hover:bg-indigo-700" 
        >
          <Save size={16} /> Lưu cấu hình
        </button>
      </div>
    </div>
  );
}

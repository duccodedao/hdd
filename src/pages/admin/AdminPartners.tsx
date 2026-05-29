import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Link as LinkIcon, Upload, Image as ImageIcon, Users } from 'lucide-react';
import { githubService } from '../../services/githubService';
import { useConfirmStore } from '../../store/confirmStore';

export default function AdminPartners({ ghConfig }: { ghConfig: any }) {
  const [partners, setPartners] = useState<{ id: string, logoUrl: string, name: string }[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'partners'), (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any));
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!newPartnerName.trim()) {
      toast.error('Vui lòng nhập tên đối tác trước khi tải ảnh lên');
      return;
    }

    if (!ghConfig || !ghConfig.owner || !ghConfig.repo || !ghConfig.token) {
      toast.error('Vui lòng hoàn thiện cấu hình GitHub ở tab Hệ thống');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Đang tải ảnh đối tác lên GitHub...');
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uploadPath = `partners/${Date.now()}_${cleanFileName}`;
      
      const githubData = await githubService.uploadFile(
        ghConfig,
        file,
        uploadPath,
        `Upload partner logo: ${newPartnerName}`
      );

      await addDoc(collection(db, 'partners'), {
        name: newPartnerName.trim(),
        logoUrl: githubData.url,
        createdAt: new Date().toISOString()
      });

      setNewPartnerName('');
      toast.success('Thêm đối tác thành công', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh: ' + (error.message || 'Unknown'), { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deletePartner = (id: string, name: string) => {
    openConfirm({
      title: 'Xóa đối tác',
      message: `Bạn có chắc chắn muốn xóa đối tác "${name}" không? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'partners', id));
          toast.success('Đã xóa đối tác');
        } catch (e: any) {
          toast.error('Không thể xóa đối tác');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <LinkIcon className="w-5 h-5 text-indigo-500" /> Quản lý Đối tác
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Tên đối tác
              </label>
              <input 
                type="text" 
                value={newPartnerName} 
                onChange={(e) => setNewPartnerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                placeholder="Ví dụ: Google, Microsoft..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Tải lên Logo
              </label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex items-center justify-center gap-2 ${uploading ? 'opacity-50' : ''}`}>
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600 dark:text-zinc-400 text-sm font-medium">
                    {uploading ? 'Đang tải lên...' : 'Chọn file ảnh logo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatePresence>
          {partners.map(partner => (
            <motion.div
              layout
              key={partner.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-slate-200 dark:border-white/10 relative group flex flex-col items-center justify-center"
            >
              <button 
                onClick={() => deletePartner(partner.id, partner.name)}
                className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="h-24 w-full flex items-center justify-center mb-3">
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt={partner.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-slate-300 dark:text-zinc-700" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white text-center line-clamp-1">{partner.name}</h3>
            </motion.div>
          ))}
        </AnimatePresence>
        {partners.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-zinc-500">
            Chưa có đối tác nào. Vui lòng thêm đối tác mới ở trên.
          </div>
        )}
      </div>
    </div>
  );
}

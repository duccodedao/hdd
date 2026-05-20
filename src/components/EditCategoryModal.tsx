import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, description: string) => void;
  category: { name: string; description: string };
}

export default function EditCategoryModal({ isOpen, onClose, onConfirm, category }: EditCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(category.name);
      setDescription(category.description);
    }
  }, [isOpen, category]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-white/10"
          >
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Đổi tên danh mục</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tên cũ</label>
                <input type="text" value={category.name} disabled className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Mô tả cũ</label>
                <textarea value={category.description} disabled className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tên mới</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Mô tả mới</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs uppercase tracking-widest">Hủy</button>
              <button onClick={() => { onConfirm(name, description); onClose(); }} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest">Lưu</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import React from 'react';
import { Rocket } from 'lucide-react';

export default function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5">
      <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
        <Rocket className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title} sắp ra mắt</h3>
      <p className="text-slate-500 mt-2">Dữ liệu cho phần này đang được cập nhật và sẽ sớm ra mắt.</p>
    </div>
  );
}

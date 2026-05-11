import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'K'], label: 'Tìm kiếm toàn cục' },
    { keys: ['Esc'], label: 'Đóng modal/popup' },
    { keys: ['Ctrl', 'S'], label: 'Lưu thay đổi' },
    { keys: ['Shift', '?'], label: 'Mở Lối tắt bàn phím' },
    { keys: ['Ctrl', '1...9'], label: 'Chuyển tab' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                <Command className="w-6 h-6 text-indigo-600" />
                Lối tắt bàn phím
              </h2>
              <button 
                onClick={onClose}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {shortcuts.map((sc, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-600">{sc.label}</span>
                  <div className="flex items-center gap-1.5">
                    {sc.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm font-mono uppercase">
                          {k}
                        </kbd>
                        {j < sc.keys.length - 1 && <span className="text-slate-400 text-xs">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  openConfirm: (options: Omit<ConfirmState, 'isOpen' | 'openConfirm' | 'closeConfirm'>) => void;
  closeConfirm: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy bỏ',
  onConfirm: () => {},
  openConfirm: (options) => set({ ...options, isOpen: true }),
  closeConfirm: () => set({ isOpen: false }),
}));

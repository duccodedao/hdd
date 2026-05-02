import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export default function OfflineIndicator() {
  const { isOnline } = useAppStore();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-2 pointer-events-none"
        >
          <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            <span>Không có kết nối mạng. Đang sử dụng dữ liệu ngoại tuyến.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

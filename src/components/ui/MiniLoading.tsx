import { motion } from 'motion/react';
import { useAppStore } from '../../store/appStore';

export default function MiniLoading({ className = "w-5 h-5" }) {
  const { webLogo } = useAppStore();
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={` ${className}`}
    >
      <img 
        src={webLogo || "https://tytpht.hdd.io.vn/img/bmassloadings.png"} 
        alt="Loading" 
        className="w-full h-full object-contain"
      />
    </motion.div>
  );
}

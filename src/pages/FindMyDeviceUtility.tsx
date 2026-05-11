import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Loader2, Search, Smartphone, Apple, MonitorSmartphone } from 'lucide-react';
import { motion } from 'motion/react';

export default function FindMyDeviceUtility({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios'>('android');
  const { user } = useAuthStore();

  const handleFind = async () => {
    setLoading(true);
    try {
      // Log usage
      await addDoc(collection(db, 'utility_usage'), {
        utilityId: `find-my-device-${deviceType}`,
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'N/A',
        timestamp: Date.now()
      });

      // Redirect
      if (deviceType === 'ios') {
        window.location.href = 'https://www.icloud.com/find/';
      } else {
        window.location.href = 'https://www.google.com/android/find/?hl=vi';
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors w-fit font-bold text-sm tracking-wider">
        ← Quay lại Tiện ích
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-white/5 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Smartphone className="w-64 h-64 text-blue-500" />
        </div>

        <div className="text-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-inner">
            {deviceType === 'ios' ? (
               <Apple className="w-10 h-10 text-zinc-300" />
            ) : (
               <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.2"/><path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" fill="currentColor"/></svg>
            )}
          </div>
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight italic">
            {deviceType === 'ios' ? 'iCloud Find My' : 'Google Find My Device'}
          </h2>
          <p className="text-zinc-400 mt-4 font-medium leading-relaxed max-w-sm mx-auto">Click "Tìm ngay" để được điều hướng tới trình quản lý, tìm kiếm thiết bị của bạn.</p>
        </div>

        <div className="space-y-8 relative z-10">
          {/* OS Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setDeviceType('android')}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${deviceType === 'android' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              <MonitorSmartphone className="w-4 h-4" />
              Android
            </button>
            <button 
              onClick={() => setDeviceType('ios')}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${deviceType === 'ios' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              <Apple className="w-4 h-4" />
              iOS (iPhone)
            </button>
          </div>

          <div className={`${deviceType === 'ios' ? 'bg-zinc-950/50 border-white/5' : 'bg-blue-500/5 border-blue-500/10'} border p-5 rounded-2xl transition-colors`}>
            <h4 className={`${deviceType === 'ios' ? 'text-zinc-300' : 'text-blue-400'} font-bold mb-2 tracking-wide text-xs`}>Lưu ý quan trọng:</h4>
            <ul className={`list-disc pl-5 text-sm ${deviceType === 'ios' ? 'text-zinc-400' : 'text-blue-400/80'} space-y-1 font-medium leading-relaxed`}>
              <li>Tài khoản {deviceType === 'ios' ? 'iCloud (Apple ID)' : 'Google'} của bạn đang sử dụng <b>cũng đang đăng nhập</b> trên thiết bị bạn muốn tìm.</li>
              <li>Thiết bị đó phải đảm bảo đang có kết nối internet (Wifi/4G).</li>
              <li>Thiết bị đó đang được bật vị trí.</li>
            </ul>
          </div>

          <button 
            onClick={handleFind}
            disabled={loading}
            className={`w-full py-4 ${deviceType === 'ios' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-2xl font-bold tracking-normal text-sm transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] uppercase`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Search className="w-5 h-5" />
                Tìm Ngay
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

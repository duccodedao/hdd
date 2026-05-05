import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show if not already dismissed in this session
    const dismissed = sessionStorage.getItem('disclaimer-dismissed');
    if (!dismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('disclaimer-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[80vh]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-white mb-4 tracking-tight">
                MIỄN TRỪ TRÁCH NHIỆM
              </h2>
              
              <div className="text-slate-400 text-sm space-y-4 leading-relaxed overflow-y-auto">
                <p>Website của chúng tôi sử dụng API từ bên thứ ba (kkphim.com) để tổng hợp và hiển thị nội dung video/phim. Chúng tôi <strong>không trực tiếp lưu trữ, kiểm soát hoặc chỉnh sửa nội dung video</strong> được phát trên hệ thống.</p>
                <p>Trong quá trình xem phim, có thể xuất hiện các nội dung quảng cáo (bao gồm nhưng không giới hạn: quảng cáo cá cược, trò chơi, dịch vụ bên ngoài, v.v.). Những nội dung này <strong>không thuộc quyền quản lý hoặc kiểm duyệt của website chúng tôi</strong>.</p>
                <p>Chúng tôi <strong>không chịu trách nhiệm</strong> đối với:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Nội dung hiển thị trong video</li>
                    <li>Quảng cáo phát sinh trong quá trình xem</li>
                    <li>Hành vi hoặc thiệt hại phát sinh từ việc người dùng tương tác với các quảng cáo hoặc nội dung bên thứ ba</li>
                </ul>
                <p>Người dùng được khuyến nghị:</p>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>Tự cân nhắc và chịu trách nhiệm khi truy cập hoặc sử dụng các dịch vụ được quảng cáo</li>
                    <li>Không cung cấp thông tin cá nhân cho các nguồn không đáng tin cậy</li>
                </ul>
                <p>Nếu có nội dung không phù hợp, vui lòng liên hệ với chúng tôi để được hỗ trợ xử lý.</p>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl font-bold bg-white text-black hover:bg-slate-200 transition-colors"
                >
                  Tôi đã hiểu
                </button>
              </div>
            </motion.div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

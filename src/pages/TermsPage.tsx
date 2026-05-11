import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ScrollText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-24 relative min-h-screen">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-16">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay lại
        </button>

        <div className="space-y-6">
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full"
          >
            <ScrollText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400">Legal Framework</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-medium tracking-tighter uppercase italic leading-[0.8] text-white"
          >
            Khuôn khổ <br/> Pháp lý.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl leading-relaxed"
          >
            Quy định chung và thỏa thuận cấp phép áp dụng cho toàn bộ người dùng và hệ thống trực thuộc không gian ảo của BMASS.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                <h2 className="text-3xl font-display font-medium text-white tracking-tight italic mb-8 flex items-center gap-4">
                  <span className="text-indigo-500">01.</span> Chấp nhận các điều khoản
                </h2>
                <p className="text-zinc-400 font-medium leading-relaxed mb-6 text-lg">
                  Bằng việc truy cập, thiết lập và vận hành nền tảng BMASS, bạn (người dùng cuối/tổ chức) mặc định đồng ý với toàn bộ các giao thức, điều khoản và điều kiện được ghi chú trong tài liệu này mà không có ngoại lệ.
                </p>
                <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex flex-col md:flex-row gap-6 items-start mt-8">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-950 flex flex-shrink-0 items-center justify-center border border-white/5">
                     <ShieldAlert className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm md:text-base text-indigo-300 font-medium leading-relaxed flex-1">
                    Các đặc quyền truy cập của người dùng được phân mức độ dựa vào IAM (Identity and Access Management). Hệ thống có quyền thu hồi tài khoản không cần báo trước nếu phát hiện vi phạm bảo mật.
                  </p>
                </div>
             </div>

             <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                <h2 className="text-3xl font-display font-medium text-white tracking-tight italic mb-8 flex items-center gap-4">
                  <span className="text-indigo-500">02.</span> Trách nhiệm người dùng
                </h2>
                <div className="space-y-8">
                  {[
                    { title: 'Tính Chính xác Dữ liệu', desc: 'Đảm bảo thông tin KYC/định danh khai báo trên hệ thống ở mức v1.0 phải luôn chính xác và được cập nhật liên tục.' },
                    { title: 'Ủy quyền', desc: 'Nghiêm cấm hành vi sử dụng nền tảng nhằm mô phỏng, tấn công mạng, bot brute-force hoặc can thiệp vào các API ngầm của trung tâm dữ liệu.' },
                    { title: 'Kiểm soát Truy cập', desc: 'Mỗi thiết bị truy cập vào hệ thống sẽ lưu vết theo footprint. Bạn hoàn toàn chịu trách nhiệm cho hành vi bắt nguồn từ tài khoản.' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="w-8 h-8 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-colors mt-1">
                         <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white tracking-tight">{item.title}</h3>
                        <p className="text-zinc-400 font-medium leading-relaxed mt-2 text-base">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             
             <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                <h2 className="text-3xl font-display font-medium text-white tracking-tight italic mb-8 flex items-center gap-4">
                  <span className="text-indigo-500">03.</span> Bản quyền & Hệ thống
                </h2>
                <p className="text-zinc-400 font-medium leading-relaxed text-lg">
                  Toàn bộ source code, thiết kế kiến trúc, cơ sở dữ liệu và cấu trúc vi mạch ảo của BMASS là tài sản sở hữu trí tuệ độc quyền. Việc dịch ngược (reverse engineering) hoặc nhái giao diện UI/UX sẽ chịu sự chế tài tối cao của pháp luật.
                </p>
             </div>
          </div>
          <div className="space-y-8">
             <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-8 pb-12 shadow-2xl flex flex-col items-center text-center">
                <div className="w-full aspect-square bg-zinc-950 rounded-[2rem] border border-white/5 mb-8 flex items-center justify-center p-8">
                   <ScrollText className="w-full h-full text-zinc-800 opacity-50" />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight mb-4">Chứng nhận hợp chuẩn</h3>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                   Tài liệu này được soạn thảo và kiểm duyệt tự động dựa trên giao thức pháp lý v2.4. Tính hiệu lực áp dụng toàn cầu kể từ tháng 5/2026.
                </p>
             </div>
          </div>
        </motion.div>
        
        <div className="text-center pt-16 border-t border-white/5">
           <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Cập nhật lần cuối: Tháng 05 - 2026</p>
        </div>
      </div>
    </div>
  );
}

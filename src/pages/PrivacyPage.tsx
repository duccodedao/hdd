import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeft, Fingerprint, Lock, Database, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-24 relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="absolute top-[30%] left-[20%] w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full" />
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
             className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400">Zero-Knowledge</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-medium tracking-tighter uppercase italic leading-[0.8] text-white"
          >
            Chính sách <br/> Bảo mật.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-zinc-400 font-medium max-w-2xl leading-relaxed"
          >
            Dữ liệu của bạn là bất khả xâm phạm. Kiến trúc của BMASS được thiết kế từ cốt lõi để bảo vệ và cách ly toàn bộ thông tin cá nhân.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Database, title: "Mã hóa cấp cao", desc: "Tất cả dữ liệu nghỉ (data at rest) và truyền dẫn (data in transit) đều được mã hóa AES-256." },
              { icon: EyeOff, title: "Không theo dõi", desc: "Chúng tôi loại bỏ các tracker bên thứ ba. Hành vi của bạn không bị bán cho các nhà quảng cáo." },
              { icon: Lock, title: "Bảo mật tài khoản", desc: "Chứng thực chặt chẽ, IAM phân quyền và lưu vết footprint thiết bị với kiến trúc Zero-Trust." }
            ].map((feature, i) => (
              <div key={i} className="bg-zinc-900 border border-white/5 rounded-[3rem] p-10 hover:border-emerald-500/30 transition-all duration-500 shadow-xl group">
                 <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-950 flex justify-center items-center mb-8 border border-white/5 group-hover:scale-110 group-hover:bg-emerald-500/10 transition-all duration-500">
                    <feature.icon className="w-8 h-8 text-emerald-400" />
                 </div>
                 <h3 className="text-xl font-display font-medium text-white mb-4 italic tracking-tight">{feature.title}</h3>
                 <p className="text-zinc-400 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <h2 className="text-3xl font-display font-medium text-white tracking-tight italic mb-8 flex items-center gap-4">
               Thu thập & Sử dụng dữ liệu
            </h2>
            <div className="space-y-6 text-lg text-zinc-400 font-medium leading-relaxed relative z-10 max-w-4xl">
              <p>
                 Chúng tôi chỉ thu thập những thông tin thiết yếu nhất để duy trì định danh và cấp quyền truy cập. Những thông tin này bao gồm: Email, tên người dùng, và token mã hóa của chuỗi đăng nhập.
              </p>
              <p>
                 Khi bạn sử dụng BMASS, Firestore Security Rules đảm bảo rằng không một ai - kể cả quản trị viên cấp cao nhất - có thể vượt quyền để đọc các tài liệu riêng tư nếu chưa được ủy quyền minh bạch thông qua Access Control.
              </p>
              <div className="p-8 bg-zinc-950/50 border border-white/10 rounded-[2rem] mt-8 flex items-start gap-6 backdrop-blur-sm">
                 <Fingerprint className="w-8 h-8 text-zinc-500 flex-shrink-0" />
                 <p className="text-zinc-300 font-medium">Bất kỳ thay đổi nào trong chính sách bảo mật đều sẽ được thông báo tự động (push notification) tới toàn hệ sinh thái trước ít nhất 7 ngày.</p>
              </div>
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

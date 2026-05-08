import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, ScrollText, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-300 py-20 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <ScrollText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-medium text-white tracking-tight">Điều khoản Dịch vụ</h1>
              <p className="text-sm text-slate-500">Cập nhật lần cuối: 08 tháng 05, 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 bg-white/5 border border-white/5 rounded-3xl p-8 md:p-12 backdrop-blur-xl">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              1. Chấp nhận điều khoản
            </h2>
            <p className="leading-relaxed">
              Bằng việc truy cập và sử dụng hệ thống BMASS, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu tại đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              2. Quyền hạn người dùng
            </h2>
            <div className="space-y-3">
              {[
                'Sử dụng dịch vụ theo đúng mục đích và quy định pháp luật.',
                'Bảo mật thông tin tài khoản và mật khẩu truy cập.',
                'Chịu trách nhiệm về mọi hoạt động xảy ra dưới tài khoản của mình.',
                'Thông báo ngay cho quản trị viên nếu phát hiện truy cập trái phép.'
              ].map((text, i) => (
                <div key={i} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              3. Hành vi bị nghiêm cấm
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-slate-400">
              <li>Xâm nhập trái phép, phá hoại hệ thống hoặc dữ liệu.</li>
              <li>Sử dụng dịch vụ cho mục đích lừa đảo hoặc vi phạm pháp luật.</li>
              <li>Sao chép, sửa đổi hoặc phân phối lại mã nguồn mà không có sự cho phép.</li>
              <li>Sử dụng các công cụ tự động (bots, scrapers) truy cập hệ thống trái phép.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              4. Giới hạn trách nhiệm
            </h2>
            <p className="leading-relaxed italic text-slate-400">
              BMASS cung cấp dịch vụ trên cơ sở "hiện có". Chúng tôi không đảm bảo hệ thống luôn hoạt động không có lỗi 100% nhưng cam kết sẽ nỗ lực tối đa để khắc phục và tối ưu hóa trải nghiệm người dùng.
            </p>
          </section>

          <footer className="pt-8 border-t border-white/5 text-[10px] uppercase tracking-widest font-bold text-slate-600 text-center">
            BMASS ID Ecosystem • Toàn vẹn & Bảo mật
          </footer>
        </div>
      </div>
    </div>
  );
}

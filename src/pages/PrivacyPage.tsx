import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, Lock, EyeOff, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
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
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-medium text-white tracking-tight">Chính sách Bảo mật</h1>
              <p className="text-sm text-slate-500">Quyền riêng tư của bạn là ưu tiên hàng đầu.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 bg-white/5 border border-white/5 rounded-3xl p-8 md:p-12 backdrop-blur-xl">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <Database className="w-5 h-5" />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">1. Thu thập dữ liệu</h2>
            </div>
            <p className="leading-relaxed">
              Chúng tôi chỉ thu thập thông tin cần thiết để cung cấp dịch vụ, bao gồm:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-4">
              <li>Thông tin định danh: Email, Tên hiển thị, Số điện thoại.</li>
              <li>Dữ liệu kết nối: Thông tin từ các nền tảng liên kết (Google, TikTok).</li>
              <li>Nhật ký hệ thống: Địa chỉ IP, loại thiết bị và lịch sử hoạt động bảo mật.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <Lock className="w-5 h-5" />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">2. Bảo vệ thông tin</h2>
            </div>
            <p className="leading-relaxed">
              Dữ liệu của bạn được mã hóa và lưu trữ an toàn trên nền tảng Firebase của Google. Chúng tôi thực hiện các biện pháp bảo mật đa lớp để ngăn chặn truy cập trái phép.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <EyeOff className="w-5 h-5" />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">3. Chia sẻ thông tin</h2>
            </div>
            <p className="leading-relaxed">
              BMASS <span className="text-emerald-400 font-bold">KHÔNG</span> bán hoặc chia sẻ dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc lợi nhuận. Thông tin chỉ được sử dụng trong phạm vi hệ sinh thái dịch vụ bạn đã đăng ký.
            </p>
          </section>

          <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <p className="text-xs leading-relaxed text-slate-400 italic">
              "Chúng tôi tin rằng bảo mật không chỉ là mã hóa, mà là sự tôn trọng tuyệt đối quyền riêng tư của mỗi cá nhân."
            </p>
          </div>

          <footer className="pt-8 border-t border-white/5 text-[10px] uppercase tracking-widest font-bold text-slate-600 text-center">
            Sơn Lý Hồng Đức • Privacy First Security
          </footer>
        </div>
      </div>
    </div>
  );
}

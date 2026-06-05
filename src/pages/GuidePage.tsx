import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Home, Wrench, AppWindow, Calendar, Users, Shield, 
  ChevronRight, Scan, Folders, FileText, FileImage, FilePlus,
  Settings, Lock, Wrench as Tool, Wrench as UtilitiesIcon,
  Laptop, FolderOpen, ImageIcon, Box, FileArchive, Scissors
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState, useEffect } from 'react';

export default function GuidePage() {
  const { userData } = useAuthStore();
  const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';
  const [internalConfigs, setInternalConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'tool_permissions'), (docSnap) => {
      if (docSnap.exists()) {
        setInternalConfigs(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  const isVisible = (tabKey: string) => {
    if (isAdmin) return true;
    const config = internalConfigs[tabKey];
    return !(config?.internal);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
          Hướng dẫn sử dụng
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Khám phá các tính năng và học cách sử dụng hệ thống một cách hiệu quả nhất.
        </p>
      </div>

      <div className="space-y-12">
        {/* Phần nền tảng (Người dùng) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Box className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nền tảng</h2>
          </div>

          <div className="grid gap-6">

            {/* Mục Tiện ích */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/10">
                  <Wrench className="w-6 h-6 text-slate-700 dark:text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tiện ích</h3>
                  <p className="text-sm text-slate-500">Các công cụ hỗ trợ công việc hằng ngày</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {isVisible('utilities') && (
                  <SubGuideCard
                    icon={Wrench}
                    title="Tất cả tiện ích"
                    link="/utilities"
                    description="Bấm vào (Tiện ích) để xem toàn danh sách."
                    details={[
                      "Hiển thị giao diện danh sách thẻ tiện ích.",
                      "Hỗ trợ ghim các tiện ích yêu thích (Bấm icon ngôi sao).",
                      "Tìm kiếm nhanh và lọc theo trạng thái Nội Bộ / Công Khai."
                    ]}
                  />
                )}
                {isVisible('avatar-frame') && (
                  <SubGuideCard
                    icon={ImageIcon}
                    title="Khung Ảnh Đại Diện"
                    link="/utilities/avatar-frame"
                    description="Ghép khung cho ảnh đại diện của bạn dự theo các sự kiện."
                    details={[
                      "1. Chọn khung mẫu (Frame) từ danh sách được cung cấp.",
                      "2. Tải lên hình ảnh cá nhân (Avatar) của bạn.",
                      "3. Điều chỉnh kích thước và tải xuống bức ảnh hoàn chỉnh."
                    ]}
                  />
                )}
                {isVisible('file-manager') && (
                  <SubGuideCard
                    icon={Laptop}
                    title="Quản Lý File Cá Nhân"
                    link="/utilities/file-manager"
                    description="Tải lên và quản lý tệp tin bí mật/riêng tư cá nhân."
                    details={[
                      "Phân loại tệp tin theo thư mục (Folder) một cách ngăn nắp.",
                      "Tải lên an toàn tài liệu, hình ảnh, văn bản.",
                      "Dễ dàng xem trước, đổi tên, và tải xuống."
                    ]}
                  />
                )}
                {isVisible('kho-van-ban') && (
                  <SubGuideCard
                    icon={FolderOpen}
                    title="Kho Văn Bản"
                    link="/utilities/kho-van-ban"
                    description="Lưu trữ tài liệu văn bản quan trọng của tổ chức."
                    details={[
                      "Tìm kiếm văn bản nhanh theo tên hoặc ngày tạo.",
                      "Xem trước tài liệu Word/PDF ngay trong trình duyệt.",
                      "Công cụ giúp quản lý văn bản nội bộ phân quyền rõ ràng."
                    ]}
                  />
                )}
                {isVisible('ai-scanner') && (
                  <SubGuideCard
                    icon={Scan}
                    title="Quét Văn Bản AI"
                    link="/utilities/ai-scanner"
                    description="Nhận diện chữ cái (OCR) từ hình ảnh."
                    details={[
                      "1. Upload bức ảnh chứa nội dung chữ (Biên lai, Sách, Hóa đơn).",
                      "2. AI sẽ quét và bóc tách toàn bộ phần chữ ra văn bản thuần.",
                      "3. Sao chép và dùng trực tiếp kết quả."
                    ]}
                  />
                )}
                {isVisible('image-to-pdf') && (
                  <SubGuideCard
                    icon={FileImage}
                    title="Ảnh sang PDF"
                    link="/utilities/image-to-pdf"
                    description="Ghép một hay nhiều ảnh thành tệp PDF."
                    details={[
                      "1. Kéo thả nhiều ảnh cùng lúc, hoặc chọn từng ảnh rời.",
                      "2. Có thể sắp xếp, thay đổi thứ tự các trang ảnh.",
                      "3. Xuất ra một file PDF duy nhất."
                    ]}
                  />
                )}
                {isVisible('pdf-to-word') && (
                  <SubGuideCard
                    icon={FileText}
                    title="PDF sang Word"
                    link="/utilities/pdf-to-word"
                    description="Trích xuất PDF thành tệp Word có thể chỉnh sửa."
                    details={[
                      "1. Tải lên file PDF bạn cần thay đổi nội dung.",
                      "2. Hệ thống chuyển đổi thành một tệp Word (.docx).",
                      "3. Có thể tải về chỉnh sửa trên Office."
                    ]}
                  />
                )}
                {isVisible('pdf-merger') && (
                  <SubGuideCard
                    icon={FilePlus}
                    title="Ghép PDF"
                    link="/utilities/pdf-merger"
                    description="Ghép nhiều file PDF thành 1 file hiển thị xuyên suốt dòng tài liệu."
                    details={[
                      "1. Tải lên hoặc kéo thả nhiều file PDF cùng một lúc.",
                      "2. Có thể sắp xếp thứ tự các file PDF trước khi bắt đầu nối.",
                      "3. Nhận về 1 tệp văn bản PDF hợp nhất dùng liền."
                    ]}
                  />
                )}
                {isVisible('pdf-splitter') && (
                  <SubGuideCard
                    icon={Scissors}
                    title="Tách PDF"
                    link="/utilities/pdf-splitter"
                    description="Tách một file PDF lớn thành các trang nhỏ để thu trích xuất trang cần."
                    details={[
                      "Hỗ trợ gõ các trang hoặc khoảng trang để tách (VD: 1-5, 8).",
                      "Thời gian cắt lấy linh hoạt và nhanh chóng."
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Các Mục Khác */}
            {isVisible('apps') && (
              <GuideCard
                icon={AppWindow}
                title="Ứng dụng"
                description="Bấm vào biểu tượng các cửa sổ xếp chồng (AppWindow) ở menu để xem một số ứng dụng bổ sung."
                link="/apps"
                features={[
                  { icon: ChevronRight, text: "Sử dụng thanh tìm kiếm để lọc nhanh số lượng ứng dụng nhiều." },
                  { icon: ChevronRight, text: "Nắm bắt trạng thái bảo trì hoặc tag Nội Bộ để dùng cho đặc quyền nhân sự." },
                  { icon: ChevronRight, text: "Bấm nút 'Mở' để truy cập ứng dụng hoặc liên kết ra nền tảng cung cấp bên ngoài." }
                ]}
              />
            )}

            {isVisible('calendar') && (
              <GuideCard
                icon={Calendar}
                title="Lịch làm việc"
                description="Bấm vào biểu tượng cuốn lịch (Calendar) ở menu để quản lý lịch trình."
                link="/calendar"
                features={[
                  { icon: ChevronRight, text: "Hiển thị tổng quan các sự kiện trong tháng, tuần, ngày." },
                  { icon: ChevronRight, text: "Click đúp vào ô lịch ngày đó để tạo mới sự kiện / phân bổ công việc nhanh." },
                  { icon: ChevronRight, text: "Tạo các Todo-list nhỏ dạng 'Đầu việc' theo từng lịch hẹn." },
                  { icon: ChevronRight, text: "Kéo giãn ngày, di chuyển sự kiện giữa các ngày qua thao tác kéo và thả." }
                ]}
              />
            )}

            {isVisible('hrm') && (
              <GuideCard
                icon={Users}
                title="Nhân sự"
                description="Bấm vào biểu tượng người dùng (Users) ở menu để quản lý hồ sơ nhân sự."
                link="/nhan-su"
                features={[
                  { icon: ChevronRight, text: "Danh bạ liên lạc nhân sự chuyên nghiệp với bố cục gọn gàng." },
                  { icon: ChevronRight, text: "Tìm kiếm nhân sự nhanh qua tên, số điện thoại, tag phòng ban." },
                  { icon: ChevronRight, text: "Chỉ định rõ thẻ thành viên là Công khai hay nhân sự Nội bộ." }
                ]}
              />
            )}
          </div>
        </section>

        {/* Phần dành cho Admin */}
        {isAdmin && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Dành cho Quản Trị Viên (Admin)</h2>
            </div>

            <div className="grid gap-6">
              <GuideCard
                icon={Settings}
                title="Hệ Thống Tổng"
                description="Bấm vào mục Hệ thống (có hình bánh răng) ở dưới cùng bên trái để tiến vào bảng điều khiển."
                link="/admin"
                isRed
                features={[
                  { icon: Shield, text: "Màn hình Trạng Thái: Xem số liệu truy cập tức thời, quản trị viên đang trực, phần cứng server." },
                  { icon: Lock, text: "Chế Độ Bảo Trì Tổng: Khóa đăng nhập để tiến hành nâng cấp, kèm hệ thống bảo trì nhỏ giọt từng tab." },
                  { icon: Tool, text: "Bảo Mật Bức Tường Lửa (Firewall): Cấm thiết bị hoặc IP Address đang Spam, DoS truy cập vào website." },
                  { icon: AppWindow, text: "Quản Lý Ứng Dụng (Apps): Tạo nút ứng dụng mới, sửa URL, gắn icon hình ảnh, phân quyền đối tượng Nội Bộ hay Công Khai." },
                  { icon: Users, text: "Trạm Quản Lý Nhân Sự (HR): Import nhiều hồ sơ từ file mẫu Excel (XLSX), hiển thị Dashboard báo cáo, số lượng cấp bậc." },
                  { icon: Folders, text: "Cấu hình Kho Văn Bản Github: Nhập Access Token PAT của Github cá nhân để lưu Database văn bản tập trung." }
                ]}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function GuideCard({ 
  icon: Icon, 
  title, 
  description, 
  link, 
  features,
  isRed = false
}: { 
  icon: any, 
  title: string, 
  description: string, 
  link: string, 
  features: { icon: any, text: string }[],
  isRed?: boolean
}) {
  return (
    <div className={`p-6 rounded-2xl border bg-white dark:bg-white/5 transition-all
      ${isRed 
        ? 'border-rose-100 dark:border-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30 shadow-sm hover:shadow-md' 
        : 'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-lg shadow-sm'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isRed ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-slate-50 dark:bg-white/10'}`}>
              <Icon className={`w-6 h-6 ${isRed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-zinc-300'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {title}
                <Link 
                  to={link}
                  className={`text-xs px-2 py-1 rounded-md font-bold transition-colors inline-flex items-center gap-1
                    ${isRed 
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20' 
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20'
                    }`}
                >
                  Mở thẻ <ChevronRight className="w-3 h-3" />
                </Link>
              </h3>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
          </div>

          <ul className="space-y-3 pt-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <feature.icon className={`w-4 h-4 shrink-0 mt-0.5 ${isRed ? 'text-rose-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                <span className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SubGuideCard({ icon: Icon, title, link, description, details }: { icon: any, title: string, link: string, description: string, details?: string[] }) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex flex-col gap-2 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-500" />
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{title}</h4>
        </div>
        <Link 
          to={link}
          className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 transition-colors flex items-center"
        >
          Mở thẻ <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
      {details && details.length > 0 && (
        <ul className="mt-1 space-y-1.5 list-disc list-outside ml-3 text-xs text-slate-600 dark:text-zinc-300">
          {details.map((detail, idx) => (
            <li key={idx} className="leading-relaxed">{detail}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

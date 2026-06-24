import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Heart, Play, Youtube, Clock, User, FileText, HelpCircle, 
  ChevronRight, ArrowRight, ShieldCheck, Laptop, Search, Calendar
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface HealthVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration?: string;
  speaker?: string;
  createdAt?: any;
}

const DEFAULT_VIDEOS: HealthVideo[] = [
  {
    id: 'default-1',
    title: 'Phim Ngắn: Hướng dẫn tích hợp Sổ Sức Khỏe Điện Tử trên VNeID',
    description: 'Chi tiết các bước cài đặt và liên thông dữ liệu Sổ Sức khỏe điện tử hữu ích trên nền tảng định danh công dân VNeID quốc gia dành cho mọi công dân.',
    videoUrl: 'https://drive.google.com/file/d/1QaXE-OWjpi5vpsqdQnjf-zHLzy9jeN1c/view',
    duration: '03:45',
    speaker: 'Cục Cảnh sát QLHC về TTXH',
  },
  {
    id: 'default-2',
    title: 'Quy trình Khám Chữa Bệnh bằng Sổ Sức Khỏe Điện Tử tại cơ sở Y tế',
    description: 'Hướng dẫn cụ thể cho người dân và cán bộ y tế khi quét mã QR, đối chiếu lịch sử khám bệnh và chia sẻ thông tin bệnh lý an toàn thông qua nền tảng số.',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '12:30',
    speaker: 'Cục Quản lý Khám Chữa Bệnh',
  }
];

const FAQS = [
  {
    q: "Sổ sức khỏe điện tử là gì và có bắt buộc phải cài đặt không?",
    a: "Sổ sức khỏe điện tử là ứng dụng số giúp mỗi người dân quản lý thông tin sức khỏe của bản thân, chủ động trong phòng bệnh và chăm sóc sức khỏe. Việc cài đặt không bắt buộc nhưng được khuyến khích mạnh mẽ nhằm đơn giản hóa thủ tục khám chữa bệnh, loại bỏ sổ giấy và bảo hiểm giấy."
  },
  {
    q: "Thông tin trên Sổ sức khỏe điện tử có được bảo mật bảo mật không?",
    a: "Hoàn toàn bảo mật. Dữ liệu sức khỏe của công dân được mã hóa, lưu trữ tại Trung tâm dữ liệu quốc gia và chỉ được truy cập khi người dân chủ động xuất trình mã QR xác thực cho bác sĩ tại cơ sở khám chữa bệnh có thẩm quyền."
  },
  {
    q: "Làm thế nào để cập nhật dữ liệu tiêm chủng hoặc bệnh án cũ bị thiếu?",
    a: "Bạn có thể gửi yêu cầu phản hồi trực tiếp ngay trên ứng dụng, đính kèm ảnh chụp giấy xác nhận tiêm chủng hoặc sổ khám bệnh cũ. Hệ thống y tế cơ sở sẽ kiểm tra chéo và bổ sung dữ liệu trong vòng 24 - 48 giờ làm việc."
  }
];

export default function HealthPage() {
  const { userData } = useAuthStore();
  const [videos, setVideos] = useState<HealthVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'handbook' | 'faq'>('video');
  const [selectedVideo, setSelectedVideo] = useState<HealthVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Disable snapshot for review mode
    if (userData?.role === 'review') {
      setVideos(DEFAULT_VIDEOS);
      setSelectedVideo(DEFAULT_VIDEOS[0]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'health_videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthVideo));
      const combined = items.length > 0 ? items : DEFAULT_VIDEOS;
      setVideos(combined);
      setSelectedVideo(combined[0]);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching health videos:", error);
      setVideos(DEFAULT_VIDEOS);
      setSelectedVideo(DEFAULT_VIDEOS[0]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // Helper to parse Embeddable video link
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;
    if (url.includes('youtube.com/watch?v=')) {
      const vid = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${vid}`;
    }
    if (url.includes('youtu.be/')) {
      const vid = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${vid}`;
    }
    if (url.includes('drive.google.com/')) {
      const driveUrl = url.replace(/\/view(\?.*)?$/, '/preview').replace(/\/edit(\?.*)?$/, '/preview');
      if (!driveUrl.includes('/preview')) {
        if (driveUrl.includes('/file/d/')) {
          const parts = driveUrl.split('/file/d/');
          const fileId = parts[1].split('/')[0];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }
      return driveUrl;
    }
    return url; // Return direct video link or fallback
  };

  const isYoutube = (url: string) => {
    return url?.includes('youtube.com') || url?.includes('youtu.be');
  };

  const isIframeCompatible = (url: string) => {
    return isYoutube(url) || url?.includes('drive.google.com');
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 p-4 lg:p-8">
      <Helmet>
        <title>Sổ sức khỏe điện tử & Đào tạo sức khỏe | Hệ thống Công dân Số</title>
      </Helmet>

      {/* Header section with Glassmorphism */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 lg:p-10 text-white shadow-xl shadow-blue-500/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-150 uppercase tracking-wider border border-white/10">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> Đào Tạo Sức Khỏe Số
              </span>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                Sổ Sức Khỏe Điện Tử
              </h1>
              <p className="text-sm md:text-base text-blue-100 max-w-2xl leading-relaxed">
                Hệ thống đăng tải tài liệu trực quan, video hướng dẫn và cẩm nang số giúp cơ quan quản lý và người dân nhanh chóng làm quen, sử dụng hiệu quả sổ sức khỏe điện tử.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar / Menu */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border shrink-0 text-left ${
              activeTab === 'video'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/10'
                : 'bg-white dark:bg-zinc-900 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Play className="w-4 h-4" />
            <div className="flex-1">
              <p className="leading-tight">Video tập huấn</p>
              <span className="text-[10px] opacity-75 font-normal">Học trực quan qua video</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('handbook')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border shrink-0 text-left ${
              activeTab === 'handbook'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/10'
                : 'bg-white dark:bg-zinc-900 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <div className="flex-1">
              <p className="leading-tight">Cẩm nang hướng dẫn</p>
              <span className="text-[10px] opacity-75 font-normal">Tài liệu số & Bản in PDF</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border shrink-0 text-left ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/10'
                : 'bg-white dark:bg-zinc-900 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <div className="flex-1">
              <p className="leading-tight">Câu hỏi thường gặp</p>
              <span className="text-[10px] opacity-75 font-normal font-sans">Giải đáp thắc mắc FAQs</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </button>

          {/* Banner quảng bá VNeID */}
          <div className="mt-4 p-5 rounded-3xl bg-gradient-to-b from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-center relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Tích Hợp VNeID</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                Sổ sức khỏe điện tử hiện đã được liên thông hoàn toàn với hệ thống định danh VNeID mức độ 2 toàn quốc.
              </p>
              <a 
                href="https://vneid.gov.vn" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1.5"
              >
                Chi tiết cổng VNeID <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Tab content space */}
        <div className="lg:col-span-9 space-y-6">
          
          <AnimatePresence mode="wait">
            
            {activeTab === 'video' && (
              <motion.div
                key="video-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                
                {/* Embedded Player details */}
                <div className="md:col-span-2 space-y-4">
                  {selectedVideo ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-white/5 overflow-hidden shadow-sm">
                      <div className="aspect-video w-full bg-slate-950 relative">
                        {isIframeCompatible(selectedVideo.videoUrl) ? (
                          <iframe
                            src={getEmbedUrl(selectedVideo.videoUrl)}
                            title={selectedVideo.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={selectedVideo.videoUrl}
                            controls
                            className="w-full h-full object-contain"
                            poster="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80"
                          />
                        )}
                      </div>
                      
                      <div className="p-6 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-500 flex items-center gap-1">
                            <Heart className="w-3" /> Sổ sức khỏe số
                          </span>
                          {selectedVideo.speaker && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                              <User className="w-3.5 h-3.5" /> {selectedVideo.speaker}
                            </span>
                          )}
                          {selectedVideo.duration && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                              <Clock className="w-3.5 h-3.5" /> {selectedVideo.duration}
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                          {selectedVideo.title}
                        </h2>
                        
                        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {selectedVideo.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center text-slate-400">
                      Chưa có video nào được chọn hoặc đăng tải.
                    </div>
                  )}
                </div>

                {/* Playlist Sidebar */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-slate-200/60 dark:border-white/5 space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm video tập huấn..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider px-1">Danh sách bài giảng ({filteredVideos.length})</div>
                    
                    <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
                      {filteredVideos.map((video) => {
                        const isSelected = selectedVideo?.id === video.id;
                        return (
                          <button
                            key={video.id}
                            onClick={() => setSelectedVideo(video)}
                            className={`w-full flex gap-3 p-2.5 rounded-2xl transition-all border text-left ${
                              isSelected
                                ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30'
                                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200/50 dark:border-white/5 flex items-center justify-center shrink-0 relative overflow-hidden select-none">
                              {isYoutube(video.videoUrl) ? (
                                <Youtube className={`w-6 h-6 ${isSelected ? 'text-rose-500' : 'text-slate-400'}`} />
                              ) : (
                                <Play className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-extrabold leading-snug truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                                {video.title}
                              </p>
                              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                                {video.speaker || "Bộ Y Tế"}
                              </span>
                            </div>
                          </button>
                        );
                      })}

                      {filteredVideos.length === 0 && (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">
                          Không tìm thấy kết quả phù hợp.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'handbook' && (
              <motion.div
                key="handbook-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-6 lg:p-10 border border-slate-200/60 dark:border-white/5 space-y-8"
              >
                <div className="text-center max-w-xl mx-auto space-y-3">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cẩm nang hướng dẫn sử dụng</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                    Tải về tài liệu chuyển đổi số y tế cơ sở và hướng dẫn nhanh dành cho tổ công nghệ số cộng đồng và người dân.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Item 1 */}
                  <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-3xl border border-slate-200/40 dark:border-white/5 flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Cẩm nang hướng dẫn người dân</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal">
                        Bản tóm tắt infographic các bước thiết lập, liên kết bảo hiểm y tế và tra cứu kết quả xét nghiệm trực tiếp trên điện thoại.
                      </p>
                      <button 
                        onClick={() => toast.success('Đang bắt đầu tải xuống tài liệu Cẩm nang Người dân (PDF)...')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-2"
                      >
                        Tải bản PDF <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="bg-slate-50 dark:bg-zinc-950 p-6 rounded-3xl border border-slate-200/40 dark:border-white/5 flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Tài liệu phục vụ tập huấn y tế cơ sở</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal">
                        Dành cho cán bộ quản lý trạm y tế, bệnh viện tuyến huyện để thực hiện đồng bộ dữ liệu tiêm chủng phòng chống dịch cũ.
                      </p>
                      <button 
                        onClick={() => toast.success('Đang tải xuống Bộ tài liệu Y tế Cơ sở (DOCX)...')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-650 dark:text-teal-400 hover:underline pt-2"
                      >
                        Tải tài liệu tập huấn <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {activeTab === 'faq' && (
              <motion.div
                key="faq-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-6 lg:p-8 border border-slate-200/60 dark:border-white/5 space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Giải đáp thắc mắc (FAQs)</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Thông tin chính xác, giải quyết nhanh các khó khăn của người dân khi chuyển đổi từ sổ giấy sang sổ điện tử VNeID.</p>
                </div>

                <div className="space-y-4">
                  {FAQS.map((faq, index) => (
                    <div 
                      key={index}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/30 dark:border-white/5 space-y-2"
                    >
                      <div className="flex gap-2 items-start">
                        <HelpCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200">{faq.q}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium pl-6">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ChevronLeft, 
  Loader2, 
  Calendar, 
  MapPin, 
  Tag, 
  Info, 
  Monitor, 
  LayoutGrid, 
  Share2,
  Clock,
  Globe,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Lock
} from 'lucide-react';
import { OfflineGuard } from '../components/OfflineGuard';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface MovieDetail {
  movie: {
    _id: string;
    name: string;
    slug: string;
    origin_name: string;
    content: string;
    type: string;
    status: string;
    poster_url: string;
    thumb_url: string;
    is_copyright: boolean;
    sub_docquyen: boolean;
    chieurap: boolean;
    time: string;
    episode_current: string;
    episode_total: string;
    quality: string;
    lang: string;
    notify: string;
    showtimes: string;
    year: number;
    view: number;
    actor: string[];
    director: string[];
    category: { id: string; name: string; slug: string }[];
    country: { id: string; name: string; slug: string }[];
  };
  episodes: {
    server_name: string;
    server_data: {
      name: string;
      slug: string;
      filename: string;
      link_embed: string;
      link_m3u8: string;
    }[];
  }[];
}

export default function MovieDetailPage() {
  const { user } = useAuthStore();
  const { slug } = useParams();
  const navigate = useNavigate();
  
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center space-y-8">
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
          <Lock className="w-10 h-10 text-indigo-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-display font-medium text-white uppercase tracking-widest">Truy cập bị giới hạn</h2>
          <p className="text-slate-500 font-medium max-w-sm">Vui lòng đăng nhập để xem chi tiết phim và trải nghiệm tốt nhất.</p>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-10 py-4 bg-white text-black hover:bg-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const [data, setData] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeEpisode, setActiveEpisode] = useState<string | null>(null);
  const [activeServerIdx, setActiveServerIdx] = useState(0);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://phimapi.com/phim/${slug}`);
        const result = await res.json();
        if (result.status) {
          setData(result);
          if (result.episodes?.[0]?.server_data?.[0]) {
            setActiveEpisode(result.episodes[0].server_data[0].link_embed);
          }
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [slug]);

  const getProxyUrl = (url: string) => {
    if (!url) return '';
    return `https://phimapi.com/image.php?url=${encodeURIComponent(url)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
           <Loader2 className="w-12 h-12 text-purple-500/50" />
        </motion.div>
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40">Synchronizing Data...</span>
      </div>
    );
  }

  if (!data) return null;
  const { movie, episodes } = data;

  return (
    <div className="pb-32 text-white">
      <OfflineGuard message="Truyền phát trực tuyến cần có kết nối mạng ổn định.">
        
        {/* Header Section */}
        <header className="relative w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden grayscale-[0.2]">
          <div className="absolute inset-0 z-0">
             <img 
               src={getProxyUrl(movie.thumb_url)} 
               alt={movie.name} 
               className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-end pb-12">
            <button 
              onClick={() => navigate('/movies')}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Quay lại
            </button>
          </div>
        </header>

        {/* Content Section */}
        <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-16">
           
           <div className="lg:col-span-2 space-y-16">
              {/* Title & Info */}
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl font-display font-medium text-white tracking-widest uppercase">
                  {movie.name}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>{movie.origin_name}</span>
                  <span className="w-1 h-1 bg-slate-800 rounded-full" />
                  <span>{movie.year}</span>
                  <span className="w-1 h-1 bg-slate-800 rounded-full" />
                  <span>{movie.time}</span>
                  <span className="w-1 h-1 bg-slate-800 rounded-full" />
                  <span className="text-indigo-400">{movie.quality}</span>
                </div>
              </div>

              {/* Player */}
              <section className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                {activeEpisode ? (
                  <iframe 
                    src={activeEpisode} 
                    className="w-full h-full border-0" 
                    allowFullScreen 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <button 
                      onClick={() => episodes[0]?.server_data[0] && setActiveEpisode(episodes[0].server_data[0].link_embed)}
                      className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                    >
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </button>
                  </div>
                )}
              </section>

              {/* Episodes */}
              <section className="glass-card p-10 space-y-10">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-xl font-medium text-white uppercase tracking-widest">Danh sách tập</h2>
                    <div className="flex gap-2">
                       {episodes.map((server, idx) => (
                         <button
                           key={idx}
                           onClick={() => setActiveServerIdx(idx)}
                           className={cn(
                             "px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all",
                             activeServerIdx === idx 
                             ? "bg-white text-black" 
                             : "text-slate-500 hover:text-white"
                           )}
                         >
                           {server.server_name}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {(episodes[activeServerIdx]?.server_data || []).map((ep, idx) => (
                       <button
                         key={idx}
                         onClick={() => setActiveEpisode(ep.link_embed)}
                         className={cn(
                           "h-10 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all border border-white/5",
                           activeEpisode === ep.link_embed
                           ? "bg-indigo-600 text-white border-indigo-600"
                           : "bg-white/5 text-slate-500 hover:text-white"
                         )}
                       >
                         {ep.name}
                       </button>
                    ))}
                 </div>
              </section>

              {/* Description */}
              <section className="space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white uppercase tracking-widest">Nội dung phim</h3>
                    <div 
                      className="text-base text-slate-400 leading-relaxed max-w-none"
                      dangerouslySetInnerHTML={{ __html: movie.content }} 
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Diễn viên</h4>
                       <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                         {movie.actor.join(', ')}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Đạo diễn</h4>
                       <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                         {movie.director.join(', ')}
                       </div>
                    </div>
                 </div>
              </section>
           </div>

           {/* Sidebar Info */}
           <aside className="space-y-8">
              <div className="glass-card p-10 space-y-8">
                 <h3 className="text-lg font-medium text-white uppercase tracking-widest">Thông tin</h3>
                 <div className="space-y-6">
                    {[
                      { label: 'Trạng thái', value: movie.episode_current },
                      { label: 'Số tập', value: movie.episode_total },
                      { label: 'Thời lượng', value: movie.time },
                      { label: 'Ngôn ngữ', value: movie.lang },
                      { label: 'Lượt xem', value: movie.view.toLocaleString() },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between group py-3 border-b border-white/5 last:border-0 border-dashed">
                         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{item.label}</span>
                         <span className="text-xs font-bold text-slate-300">{item.value}</span>
                      </div>
                    ))}
                 </div>

                 <div className="pt-10 space-y-4">
                   <button 
                     onClick={() => {
                       navigator.clipboard.writeText(window.location.href);
                       toast.success('Đã sao chép liên kết');
                     }}
                     className="w-full h-12 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl border border-white/5"
                   >
                     Chia sẻ phim
                   </button>
                   <button 
                     onClick={() => window.open(`https://kkphim.com/phim/${movie.slug}`, '_blank')}
                     className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl shadow-lg"
                   >
                      Nguồn truy cập
                   </button>
                 </div>
              </div>
           </aside>

        </main>
      </OfflineGuard>
    </div>
  );
}

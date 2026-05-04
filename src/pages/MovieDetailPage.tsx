import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
  ExternalLink
} from 'lucide-react';
import { OfflineGuard } from '../components/OfflineGuard';

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
  const { slug } = useParams();
  const navigate = useNavigate();
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
          // Auto set first episode
          if (result.episodes?.[0]?.server_data?.[0]) {
            setActiveEpisode(result.episodes[0].server_data[0].link_embed);
          }
        }
      } catch (error) {
        console.error("Fetch detail error:", error);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0b]">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
        <span className="text-[10px] font-medium text-slate-400 tracking-[0.3em] uppercase">Đang tải chi tiết...</span>
      </div>
    );
  }

  if (!data) return null;

  const { movie, episodes } = data;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0b] pb-24">
      <OfflineGuard message="Trình phát video yêu cầu kết nối mạng ổn định để truyền tải nội dung FHD.">
        {/* Banner with Immersive Backdrop */}
        <div className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
          <div className="absolute inset-0 z-0">
             <img 
               src={getProxyUrl(movie.thumb_url)} 
               alt={movie.name} 
               className="w-full h-full object-cover blur-md opacity-30 scale-110"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://phimimg.com/upload/vod/20260428-1/4662191e6d221754a7a3d4c62e1d7742.jpg';
               }}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] dark:from-[#0a0a0b] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-12 md:pb-24">
             <div className="flex flex-col md:flex-row gap-8 md:items-end">
                {/* Poster Mobile/Small view */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-48 md:w-64 aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl relative group shrink-0 border-4 border-white dark:border-white/5"
                >
                  <img 
                    src={getProxyUrl(movie.poster_url)} 
                    alt={movie.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://phimimg.com/upload/vod/20260428-1/d563a77898b12886e0cc5eea272f1745.jpg';
                    }}
                  />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg">
                    {movie.quality}
                  </div>
                </motion.div>

                <div className="space-y-6 flex-1">
                   <div className="flex flex-wrap gap-2">
                     {(movie.category || []).map(cat => (
                       <span key={cat.id} className="px-4 py-1.5 bg-black/20 backdrop-blur-md text-white rounded-full text-[10px] font-heavy tracking-normal border border-white/10 uppercase">
                         {cat.name}
                       </span>
                     ))}
                   </div>
                   
                   <h1 className="text-4xl md:text-7xl font-display font-medium tracking-tight italic leading-none text-slate-900 dark:text-white">
                     {movie.name}
                   </h1>
                   
                   <p className="text-lg md:text-2xl font-medium text-slate-500 opacity-80 leading-none">
                     {movie.origin_name}
                   </p>

                   <div className="flex flex-wrap items-center gap-6 pt-4">
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                         <Calendar className="w-4 h-4 text-indigo-500" /> {movie.year}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                         <Globe className="w-4 h-4 text-emerald-500" /> {movie.country?.[0]?.name}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                         <Clock className="w-4 h-4 text-amber-500" /> {movie.time}
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <button 
            onClick={() => navigate('/movies')}
            className="absolute top-8 left-8 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white hover:text-indigo-600 transition-all z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
           
           {/* Left Column: Player & Episodes */}
           <div className="lg:col-span-2 space-y-12">
              
              {/* Player Area */}
              <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative group">
                {activeEpisode ? (
                  <iframe 
                    src={activeEpisode} 
                    className="w-full h-full border-0" 
                    allowFullScreen 
                    title="Movie Player"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <button 
                      onClick={() => {
                        if (episodes[0]?.server_data[0]) setActiveEpisode(episodes[0].server_data[0].link_embed);
                      }}
                      className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/30 hover:scale-110 transition-transform"
                    >
                      <Play className="w-10 h-10 fill-current ml-1" />
                    </button>
                  </div>
                )}
              </div>

              {/* Server & Episodes Navigator */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-display font-medium tracking-tight italic flex items-center gap-3">
                       <LayoutGrid className="w-6 h-6 text-indigo-600" />
                       Danh sách tập phim
                    </h2>
                    <div className="flex gap-2">
                       {episodes.map((server, idx) => (
                         <button
                           key={idx}
                           onClick={() => setActiveServerIdx(idx)}
                           className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                             activeServerIdx === idx 
                             ? 'bg-indigo-600 border-indigo-600 text-white' 
                             : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500'
                           }`}
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
                         className={`h-12 flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                           activeEpisode === ep.link_embed
                           ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105'
                           : 'bg-white dark:bg-black/20 border-slate-100 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'
                         }`}
                       >
                         {ep.name}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Movie Info Detail */}
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-10 shadow-sm space-y-10">
                 <div>
                   <h3 className="text-xl font-display font-medium mb-6 italic flex items-center gap-3">
                     <Info className="w-5 h-5 text-blue-500" />
                     Cốt truyện
                   </h3>
                   <div 
                     className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed prose dark:prose-invert max-w-none prose-sm"
                     dangerouslySetInnerHTML={{ __html: movie.content }} 
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-100 dark:border-white/5">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Diễn viên chính</h4>
                       <div className="flex flex-wrap gap-2">
                         {(movie.actor || []).map((actor, i) => (
                           <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
                             {actor}
                           </span>
                         ))}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Đạo diễn</h4>
                       <div className="flex flex-wrap gap-2">
                         {(movie.director || []).map((dir, i) => (
                           <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
                             {dir}
                           </span>
                         ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Metadata & Quick Info */}
           <div className="space-y-8">
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-sm">
                 <h3 className="text-lg font-display font-medium mb-8 italic flex items-center gap-3">
                   <Monitor className="w-5 h-5 text-indigo-500" />
                   Thông số kỹ thuật
                 </h3>
                 <div className="space-y-6">
                    {[
                      { label: 'Trạng thái', value: movie.episode_current, color: 'text-indigo-600' },
                      { label: 'Số tập', value: movie.episode_total, color: 'text-slate-900 dark:text-white' },
                      { label: 'Thời lượng', value: movie.time, color: 'text-slate-900 dark:text-white' },
                      { label: 'Chất lượng', value: movie.quality, color: 'text-emerald-500 font-heavy' },
                      { label: 'Ngôn ngữ', value: movie.lang, color: 'text-slate-900 dark:text-white' },
                      { label: 'Ngày chiếu', value: movie.year, color: 'text-slate-900 dark:text-white' },
                      { label: 'Lượt xem', value: movie.view.toLocaleString(), color: 'text-amber-600 font-black' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-white/5 last:border-0 last:pb-0">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                         <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[80px] -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                 <h3 className="text-xl font-display font-medium mb-6 italic text-white/90">Hành động</h3>
                 <div className="space-y-4">
                    <button 
                      onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url);
                        alert('Đã sao chép liên kết phim!');
                      }}
                      className="w-full h-14 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-2xl flex items-center justify-center gap-3 font-bold text-xs transition-all border border-white/10"
                    >
                      <Share2 className="w-5 h-5" /> CHIA SẺ PHIM
                    </button>
                    <button 
                      onClick={() => window.open(`https://kkphim.com/phim/${movie.slug}`, '_blank')}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-xs transition-all shadow-xl shadow-indigo-600/20"
                    >
                       <ExternalLink className="w-5 h-5" /> NGUỒN CHÍNH THỨC
                    </button>
                 </div>
              </div>
           </div>

        </div>
      </OfflineGuard>
    </div>
  );
}

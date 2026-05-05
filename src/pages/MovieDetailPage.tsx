import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { OfflineGuard } from '../components/OfflineGuard';
import { cn } from '../lib/utils';

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0b] space-y-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
           <Loader2 className="w-12 h-12 text-blue-500/50" />
        </motion.div>
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-400">Synchronizing Data...</span>
      </div>
    );
  }

  if (!data) return null;
  const { movie, episodes } = data;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0b] pb-32 selection:bg-blue-500/10">
      <OfflineGuard message="Streaming requires an active connection. Quality restricted to identity status.">
        
        {/* Immersive Hero Header */}
        <header className="relative w-full h-[70vh] md:h-[90vh] overflow-hidden grayscale-[0.2] hover:grayscale-0 transition-all duration-1000">
          <div className="absolute inset-0 z-0">
             <img 
               src={getProxyUrl(movie.thumb_url)} 
               alt={movie.name} 
               className="w-full h-full object-cover scale-105"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] dark:from-[#0a0a0b] via-[#fafafa]/50 dark:via-[#0a0a0b]/50 to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-10 h-full flex flex-col justify-end pb-12 md:pb-24">
             <div className="flex flex-col md:flex-row gap-12 md:items-end">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="w-48 md:w-72 aspect-[2/3] rounded-[2rem] overflow-hidden shadow-2xl relative shrink-0 border-8 border-white/5 dark:border-white/5 backdrop-blur-xl"
                >
                  <img 
                    src={getProxyUrl(movie.poster_url)} 
                    alt={movie.name} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-6 right-6 px-4 py-2 glass rounded-xl text-[10px] font-bold tracking-widest border border-white/20">
                    {movie.quality}
                  </div>
                </motion.div>

                <div className="space-y-8 flex-1">
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="flex flex-wrap gap-2.5"
                   >
                     {(movie.category || []).map(cat => (
                       <span key={cat.id} className="px-5 py-2 glass rounded-full text-[9px] font-bold tracking-widest uppercase border border-white/10">
                         {cat.name}
                       </span>
                     ))}
                   </motion.div>
                   
                   <div className="space-y-2">
                     <h1 className="text-5xl md:text-8xl font-display font-medium tracking-tight italic leading-tight text-slate-900 dark:text-white text-gradient">
                       {movie.name}
                     </h1>
                     <p className="text-xl md:text-3xl font-medium text-slate-500 italic opacity-80">
                       {movie.origin_name}
                     </p>
                   </div>

                   <div className="flex flex-wrap items-center gap-10 pt-4">
                      <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                         <Calendar className="w-4 h-4 text-blue-500" /> {movie.year}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                         <Globe className="w-4 h-4 text-blue-500" /> {movie.country?.[0]?.name}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                         <Clock className="w-4 h-4 text-blue-500" /> {movie.time}
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <button 
            onClick={() => navigate('/movies')}
            className="absolute top-10 left-10 p-5 glass rounded-2xl hover:scale-110 active:scale-95 transition-all z-20 group"
          >
            <ChevronLeft className="w-6 h-6 text-slate-900 dark:text-white group-hover:text-blue-500" />
          </button>
        </header>

        {/* Main Content Space */}
        <main className="max-w-7xl mx-auto px-10 grid grid-cols-1 lg:grid-cols-3 gap-16 mt-20">
           
           <div className="lg:col-span-2 space-y-20">
              
              {/* Cinematic Player */}
              <section className="aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 relative ring-1 ring-slate-200 dark:ring-white/5">
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
                      className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-2xl scale-95 hover:scale-105 transition-transform"
                    >
                      <Play className="w-10 h-10 fill-current ml-1" />
                    </button>
                  </div>
                )}
              </section>

              {/* Episode Selection */}
              <section className="glass rounded-[2rem] p-10 space-y-10 border border-slate-200 dark:border-white/5">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-display font-medium tracking-tight italic flex items-center gap-3 text-slate-900 dark:text-white">
                         <LayoutGrid className="w-6 h-6 text-blue-500" />
                         Inventory Registry
                      </h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-9">Select Sequential Asset</p>
                    </div>
                    <div className="flex gap-2.5">
                       {episodes.map((server, idx) => (
                         <button
                           key={idx}
                           onClick={() => setActiveServerIdx(idx)}
                           className={cn(
                             "px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all duration-300",
                             activeServerIdx === idx 
                             ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg" 
                             : "bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
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
                           "h-12 flex items-center justify-center rounded-xl text-[11px] font-bold transition-all duration-500",
                           activeEpisode === ep.link_embed
                           ? "bg-blue-500 text-white shadow-xl shadow-blue-500/20 scale-105 ring-2 ring-blue-500/50"
                           : "glass hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                         )}
                       >
                         {ep.name}
                       </button>
                    ))}
                 </div>
              </section>

              {/* Description & Credits */}
              <section className="space-y-16">
                 <div className="space-y-6">
                    <h3 className="text-xl font-display font-medium italic flex items-center gap-3 text-slate-900 dark:text-white">
                      <Info className="w-5 h-5 text-blue-500" />
                      Narrative Protocol
                    </h3>
                    <div 
                      className="text-lg text-slate-500 font-medium leading-relaxed prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: movie.content }} 
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-slate-100 dark:border-white/5">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Intelligence Agents</h4>
                       <div className="flex flex-wrap gap-3">
                         {(movie.actor || []).map((actor, i) => (
                           <span key={i} className="px-5 py-2.5 glass rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300">
                             {actor}
                           </span>
                         ))}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Control Director</h4>
                       <div className="flex flex-wrap gap-3">
                         {(movie.director || []).map((dir, i) => (
                           <span key={i} className="px-5 py-2.5 glass rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300">
                             {dir}
                           </span>
                         ))}
                       </div>
                    </div>
                 </div>
              </section>
           </div>

           {/* Meta Sidebar */}
           <aside className="space-y-8">
              <div className="glass rounded-[2rem] p-10 space-y-10 border border-slate-200 dark:border-white/5">
                 <h3 className="text-lg font-display font-medium italic flex items-center gap-3 text-slate-900 dark:text-white">
                   <Monitor className="w-5 h-5 text-blue-500" />
                   Specifications
                 </h3>
                 <div className="space-y-8">
                    {[
                      { label: 'Current State', value: movie.episode_current },
                      { label: 'Total Units', value: movie.episode_total },
                      { label: 'Runtime', value: movie.time },
                      { label: 'Fidelity', value: movie.quality, highlight: true },
                      { label: 'Coded as', value: movie.lang },
                      { label: 'Access Count', value: movie.view.toLocaleString() },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between group">
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">{item.label}</span>
                         <span className={cn(
                           "text-xs font-bold",
                           item.highlight ? "text-blue-500" : "text-slate-900 dark:text-white"
                         )}>{item.value}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-slate-900 dark:bg-white rounded-[2.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-[100px] -mr-24 -mt-24" />
                 <h3 className="text-2xl font-display font-medium italic text-white dark:text-black">Operations</h3>
                 <div className="space-y-4 relative z-10">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Identity Link Captured.');
                      }}
                      className="w-full h-16 glass rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] tracking-widest uppercase transition-all duration-500 text-white dark:text-black group border-white/10 dark:border-black/5"
                    >
                      <Share2 className="w-5 h-5 group-hover:scale-125 transition-transform" /> Distribute Asset
                    </button>
                    <button 
                      onClick={() => window.open(`https://kkphim.com/phim/${movie.slug}`, '_blank')}
                      className="w-full h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] tracking-widest uppercase transition-all duration-500 shadow-xl shadow-blue-500/30"
                    >
                       <ExternalLink className="w-5 h-5" /> Root Access
                    </button>
                 </div>
              </div>
           </aside>

        </main>
      </OfflineGuard>
    </div>
  );
}

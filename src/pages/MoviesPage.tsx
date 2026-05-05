import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Search, Filter, ChevronLeft, ChevronRight, Loader2, Star, Clock, Globe, ArrowRight, Sparkles, Library, Film, Zap, Tv } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OfflineGuard } from '../components/OfflineGuard';

interface MovieItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  episode_current: string;
  quality: string;
  lang: string;
}

const CATEGORIES = [
  { id: 'phim-moi', name: 'Mới cập nhật', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'phim-chieu-rap', name: 'Phim chiếu rạp', icon: <Play className="w-3.5 h-3.5" /> },
  { id: 'phim-bo', name: 'Phim bộ', icon: <Library className="w-3.5 h-3.5" /> },
  { id: 'phim-le', name: 'Phim lẻ', icon: <Film className="w-3.5 h-3.5" /> },
  { id: 'hoat-hinh', name: 'Hoạt hình', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'tv-shows', name: 'TV Shows', icon: <Tv className="w-3.5 h-3.5" /> },
];

export default function MoviesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('phim-moi');
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchKey, setSearchKey] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cdnDomain, setCdnDomain] = useState('https://phimimg.com');
  const [genres, setGenres] = useState<{name: string, slug: string}[]>([]);
  const [countries, setCountries] = useState<{name: string, slug: string}[]>([]);
  const [activeGenre, setActiveGenre] = useState('');
  const [activeCountry, setActiveCountry] = useState('');

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [genRes, countRes] = await Promise.all([
          fetch('https://phimapi.com/the-loai'),
          fetch('https://phimapi.com/quoc-gia')
        ]);
        const [genData, countData] = await Promise.all([genRes.json(), countRes.json()]);
        setGenres(genData);
        setCountries(countData);
      } catch (err) {}
    };
    fetchFilters();
  }, []);

  const fetchMovies = async (p = 1, cat = activeCategory, search = '', genre = activeGenre, country = activeCountry) => {
    setLoading(true);
    try {
      let url = '';
      if (search) url = `https://phimapi.com/v1/api/tim-kiem?keyword=${search}&page=${p}&limit=20`;
      else if (genre) url = `https://phimapi.com/v1/api/the-loai/${genre}?page=${p}&limit=20&country=${country}`;
      else if (country) url = `https://phimapi.com/v1/api/quoc-gia/${country}?page=${p}&limit=20`;
      else if (cat === 'phim-moi') url = `https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${p}`;
      else url = `https://phimapi.com/v1/api/danh-sach/${cat}?page=${p}&limit=20`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === true || data.status === 'success') {
        setMovies(data.items || data.data?.items || []);
        if (data.data?.params?.domain_cdn) setCdnDomain(data.data.params.domain_cdn.replace(/\/$/, ''));
        if (data.pagination) setTotalPages(data.pagination.totalPages);
        else if (data.data?.params?.pagination) setTotalPages(data.data.params.pagination.totalPages);
        else if (cat === 'phim-moi') setTotalPages(100);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchMovies(1, activeCategory, searchKey, activeGenre, activeCountry);
  }, [activeCategory, activeGenre, activeCountry]);

  const getImageUrl = (path: string) => {
    if (!path) return 'https://phimimg.com/upload/vod/20260428-1/d563a77898b12886e0cc5eea272f1745.jpg';
    let fullUrl = path.startsWith('http') ? path : `${cdnDomain.replace(/\/$/, '')}/${path.startsWith('/') ? path.slice(1) : path}`;
    if (!path.includes('upload/vod') && !path.startsWith('http')) fullUrl = `${cdnDomain.replace(/\/$/, '')}/upload/vod/${path.startsWith('/') ? path.slice(1) : path}`;
    return `https://phimapi.com/image.php?url=${encodeURIComponent(fullUrl)}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKey.trim()) return;
    setIsSearching(true);
    setPage(1);
    fetchMovies(1, activeCategory, searchKey);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-24">
      <OfflineGuard message="Truyền phát trực tuyến cần có kết nối mạng ổn định.">
        
        {/* Cinematic Header */}
        <header className="relative flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6">
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="inline-flex items-center gap-2.5 px-4 py-1.5 glass rounded-full"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Điện ảnh cao cấp</span>
            </motion.div>
            <h1 className="text-6xl md:text-9xl font-display font-medium tracking-tight italic leading-none text-gradient">
              BMass <span className="text-blue-500">Cinema</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-500 font-medium leading-relaxed">
              Trải nghiệm nền tảng phim trực tuyến chất lượng cao với giao diện tối giản và hiệu suất tối đa.
            </p>
          </div>

          <div className="w-full md:w-[400px]">
             <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Tìm kiếm phim của bạn..."
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold text-sm"
                />
             </form>
          </div>
        </header>

        {/* Filter Navigation */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setActiveGenre(''); setActiveCountry(''); setIsSearching(false); setSearchKey(''); }}
                className={cn(
                  "flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[11px] font-bold tracking-widest uppercase transition-all duration-500 border whitespace-nowrap",
                  activeCategory === cat.id && !isSearching && !activeGenre && !activeCountry
                    ? "bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white shadow-xl shadow-blue-500/10 scale-[1.02]"
                    : "bg-white dark:bg-white/[0.03] text-slate-500 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <select 
              value={activeGenre}
              onChange={(e) => { setActiveGenre(e.target.value); setActiveCategory(''); }}
              className="px-5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="">Tất cả thể loại</option>
              {genres.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
            </select>
            <select 
              value={activeCountry}
              onChange={(e) => { setActiveCountry(e.target.value); setActiveCategory(''); }}
              className="px-5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="">Tất cả quốc gia</option>
              {countries.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        </section>

        {/* Results Grid */}
        <section className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center pt-32 space-y-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="w-10 h-10 text-blue-500/50" />
              </motion.div>
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-400">Đang khởi tạo dữ liệu...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
              <AnimatePresence>
                {movies.map((movie, idx) => (
                  <motion.div
                    key={movie._id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/movies/${movie.slug}`)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] rounded-[1.5rem] overflow-hidden mb-6 shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-700">
                      <img 
                        src={getImageUrl(movie.poster_url)} 
                        alt={movie.name}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex items-center justify-center">
                         <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-700">
                            <Play className="w-6 h-6 text-white fill-white" />
                         </div>
                      </div>
                      {movie.episode_current && (
                        <div className="absolute top-4 left-4 px-3 py-1 glass rounded-lg text-[9px] font-bold border border-white/20 text-white">
                          {movie.episode_current}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-display font-medium text-slate-900 dark:text-white leading-tight italic line-clamp-1 group-hover:text-blue-500 transition-colors">
                        {movie.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{movie.year}</span>
                        <div className="w-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
                        <span>CHẤT LƯỢNG HD</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <footer className="flex items-center justify-center gap-12 pt-12">
            <button 
              disabled={page === 1}
              onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="p-4 glass rounded-full hover:scale-110 active:scale-95 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-lg font-display italic text-slate-900 dark:text-white leading-none mb-1">{page} / {totalPages}</span>
              <span className="text-[8px] font-bold tracking-widest uppercase text-slate-400">SỐ TRANG TIẾP THEO</span>
            </div>
            <button 
              disabled={page === totalPages}
              onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="p-4 glass rounded-full hover:scale-110 active:scale-95 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </footer>
        )}
      </OfflineGuard>
    </div>
  );
}

import { cn } from '../lib/utils';

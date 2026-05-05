import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Search, Filter, ChevronLeft, ChevronRight, Loader2, Star, Clock, Globe, ArrowRight, Sparkles, Library, Film, Zap, Tv, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OfflineGuard } from '../components/OfflineGuard';
import { cn } from '../lib/utils';

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

import { useAuthStore } from '../store/authStore';

export default function MoviesPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center space-y-8">
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
          <Lock className="w-10 h-10 text-indigo-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-display font-medium text-white uppercase tracking-widest">Truy cập bị giới hạn</h2>
          <p className="text-slate-500 font-medium max-w-sm">Vui lòng đăng nhập để khám phá kho phim đặc sắc của hệ thống.</p>
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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchMovies(newPage, activeCategory, searchKey, activeGenre, activeCountry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
      <OfflineGuard message="Truyền phát trực tuyến cần có kết nối mạng ổn định.">
        
        {/* Header */}
        <header className="flex flex-col gap-6 mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter uppercase"
          >
            Điện ảnh & Phim
          </motion.h1>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
              Khám phá thế giới điện ảnh đa ngôn ngữ, chất lượng cao nhất dành cho bạn.
            </p>
            <form onSubmit={handleSearch} className="relative w-full md:w-96">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <input 
                 type="text"
                 placeholder="Tìm kiếm phim..."
                 value={searchKey}
                 onChange={(e) => setSearchKey(e.target.value)}
                 className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-all font-medium text-sm text-white"
               />
            </form>
          </div>
        </header>

        {/* Categories */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setActiveGenre(''); setActiveCountry(''); setIsSearching(false); setSearchKey(''); }}
              className={cn(
                "flex items-center gap-2 h-10 px-6 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap border",
                activeCategory === cat.id 
                  ? "bg-white text-black border-white" 
                  : "bg-transparent text-slate-500 border-white/10 hover:border-white/30"
              )}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Results Grid */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <AnimatePresence>
                {movies.map((movie, idx) => (
                  <motion.div
                    key={movie._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    onClick={() => navigate(`/movies/${movie.slug}`)}
                    className="group cursor-pointer space-y-4"
                  >
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-lg shadow-black/20">
                      <img 
                        src={getImageUrl(movie.poster_url)} 
                        alt={movie.name}
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-3 left-3 px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[9px] font-bold tracking-widest uppercase border border-white/10 text-white">
                        {movie.episode_current}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {movie.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>{movie.year}</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>HD</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>{movie.lang}</span>
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
          <footer className="flex items-center justify-center gap-6 py-16">
            <button 
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
              className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-xl">
               <span className="text-white font-bold tracking-widest text-[10px]">
                  {page} / {totalPages}
               </span>
            </div>
            
            <button 
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </footer>
        )}
      </OfflineGuard>
    </div>
  );
}

// A custom animated globe spinner to match the aesthetic
const SpinnerGlobe = () => (
  <div className="relative w-16 h-16">
    <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-t-2 border-purple-400" />
    <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-2 rounded-full border-b-2 border-blue-400/50" />
  </div>
);

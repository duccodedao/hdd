import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Search, Filter, ChevronLeft, ChevronRight, Loader2, Star, Clock, Globe } from 'lucide-react';
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

interface MovieResponse {
  status: boolean;
  items: MovieItem[];
  pagination?: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

const CATEGORIES = [
  { id: 'phim-moi', name: 'Mới cập nhật', icon: <Clock className="w-4 h-4" /> },
  { id: 'phim-bo', name: 'Phim Bộ', icon: <Filter className="w-4 h-4" /> },
  { id: 'phim-le', name: 'Phim Lẻ', icon: <Filter className="w-4 h-4" /> },
  { id: 'phim-chieu-rap', name: 'Phim Chiếu Rạp', icon: <Play className="w-4 h-4" /> },
  { id: 'hoat-hinh', name: 'Hoạt Hình', icon: <Filter className="w-4 h-4" /> },
  { id: 'tv-shows', name: 'TV Shows', icon: <Filter className="w-4 h-4" /> },
  { id: 'phim-vietsub', name: 'Vietsub', icon: <Globe className="w-4 h-4" /> },
  { id: 'phim-thuyet-minh', name: 'Thuyết Minh', icon: <Globe className="w-4 h-4" /> },
  { id: 'phim-long-tieng', name: 'Lồng Tiếng', icon: <Globe className="w-4 h-4" /> },
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
      } catch (err) {
        console.error("Fetch filters error:", err);
      }
    };
    fetchFilters();
  }, []);

  const fetchMovies = async (p = 1, cat = activeCategory, search = '', genre = activeGenre, country = activeCountry) => {
    setLoading(true);
    try {
      let url = '';
      if (search) {
        url = `https://phimapi.com/v1/api/tim-kiem?keyword=${search}&page=${p}&limit=20`;
      } else if (genre) {
        url = `https://phimapi.com/v1/api/the-loai/${genre}?page=${p}&limit=20&country=${country}`;
      } else if (country) {
        url = `https://phimapi.com/v1/api/quoc-gia/${country}?page=${p}&limit=20`;
      } else if (cat === 'phim-moi') {
        url = `https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${p}`;
      } else {
        url = `https://phimapi.com/v1/api/danh-sach/${cat}?page=${p}&limit=20`;
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === true || data.status === 'success') {
        const movieItems = data.items || data.data?.items || [];
        setMovies(movieItems);
        
        if (data.data?.params?.domain_cdn) {
          setCdnDomain(data.data.params.domain_cdn.replace(/\/$/, ''));
        }

        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
        } else if (data.data?.params?.pagination) {
          setTotalPages(data.data.params.pagination.totalPages);
        } else if (cat === 'phim-moi') {
          setTotalPages(100); 
        }
      }
    } catch (error) {
      console.error("Fetch movies error:", error);
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
    let fullUrl = '';
    
    if (path.startsWith('http')) {
      fullUrl = path;
    } else {
      // Logic cho API V1 (Thường không có domain và upload/vod)
      const cleanCdn = cdnDomain.replace(/\/$/, '') || 'https://phimimg.com';
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      
      if (!path.includes('upload/vod')) {
        fullUrl = `${cleanCdn}/upload/vod${cleanPath}`;
      } else {
        fullUrl = `${cleanCdn}${cleanPath}`;
      }
    }
    
    return `https://phimapi.com/image.php?url=${encodeURIComponent(fullUrl)}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKey.trim()) return;
    setIsSearching(true);
    setPage(1);
    fetchMovies(1, activeCategory, searchKey);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchMovies(newPage, activeCategory, searchKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
      <OfflineGuard message="Trình xem phim yêu cầu kết nối Internet để truyền tải dữ liệu video tốc độ cao.">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-medium tracking-normal border border-indigo-500/10 uppercase"
            >
              <Play className="w-3.5 h-3.5" /> Entertainment Hub
            </motion.div>
            <h1 className="text-5xl md:text-8xl font-display font-medium tracking-tight italic leading-none text-slate-900 dark:text-white">
              Phòng <span className="text-indigo-600">Chiếu</span>
            </h1>
          </div>

          <div className="w-full md:w-96">
            <form onSubmit={handleSearch} className="relative group">
              <input 
                type="text"
                placeholder="Tìm tên phim..."
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="w-full h-14 pl-14 pr-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-indigo-600 outline-none transition-all font-bold text-sm shadow-sm group-hover:shadow-md"
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
              {searchKey && (
                <button 
                  type="button" 
                  onClick={() => { setSearchKey(''); setIsSearching(false); fetchMovies(1, activeCategory, ''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  XÓA
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setActiveGenre(''); setActiveCountry(''); setIsSearching(false); setSearchKey(''); }}
                className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeCategory === cat.id && !isSearching && !activeGenre && !activeCountry
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20 scale-105' 
                  : 'bg-white dark:bg-white/5 text-slate-500 border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
             <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-2">Thể loại</label>
                <select 
                  value={activeGenre}
                  onChange={(e) => { setActiveGenre(e.target.value); setActiveCategory(''); }}
                  className="w-full h-12 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none text-xs font-bold transition-all focus:border-indigo-600"
                >
                  <option value="">Tất cả thể loại</option>
                  {genres.map(g => (
                    <option key={g.slug} value={g.slug}>{g.name}</option>
                  ))}
                </select>
             </div>
             <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-2">Quốc gia</label>
                <select 
                  value={activeCountry}
                  onChange={(e) => setActiveCountry(e.target.value)}
                  className="w-full h-12 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none text-xs font-bold transition-all focus:border-indigo-600"
                >
                  <option value="">Tất cả quốc gia</option>
                  {countries.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
             </div>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
            <span className="text-[10px] font-medium text-slate-400 tracking-[0.3em] uppercase">Đang tải phim...</span>
          </div>
        ) : movies.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-slate-400 font-medium italic">Không tìm thấy phim nào phù hợp.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
              {movies.map((movie, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={movie._id || idx}
                  onClick={() => navigate(`/movies/${movie.slug}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-4 shadow-lg group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                    <img 
                      src={getImageUrl(movie.poster_url)} 
                      alt={movie.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://phimimg.com/upload/vod/20260428-1/d563a77898b12886e0cc5eea272f1745.jpg'; // fallback
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                       <button className="w-12 h-12 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <Play className="w-6 h-6 fill-current" />
                       </button>
                    </div>
                    {movie.episode_current && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-bold tracking-normal shadow-lg">
                        {movie.episode_current}
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                      {movie.quality && (
                        <div className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-white rounded-md text-[8px] font-heavy tracking-normal border border-white/10 uppercase">
                          {movie.quality}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="font-display font-medium text-base text-slate-900 dark:text-white tracking-tight leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1 italic">
                    {movie.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-normal line-clamp-1 opacity-60">
                    {movie.origin_name} • {movie.year}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-24 flex items-center justify-center gap-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all hover:shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-4 px-8 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Trang {page}</span>
                  <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                  <span className="text-[10px] font-medium text-slate-400">{totalPages} trang</span>
                </div>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all hover:shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </>
        )}
      </OfflineGuard>
    </div>
  );
}

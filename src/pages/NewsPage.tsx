import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Newspaper, ExternalLink, Calendar, User, TrendingUp, Loader2, Sparkles, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
  author: string;
}

import NoData from '../components/ui/NoData';

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [feedImage, setFeedImage] = useState('https://images.unsplash.com/photo-1504711432869-efd597cdd042?auto=format&fit=crop&q=80&w=1000');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.open(`https://timkiem.vnexpress.net/?q=${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };

  const fetchNews = async () => {
    setRefreshing(true);
    try {
      const RSS_URL = 'https://vnexpress.net/rss/tin-moi-nhat.rss';
      const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
      
      const res = await fetch(API_URL);
      const data = await res.json();
      
      if (data.status === 'ok') {
        if (data.feed?.image) setFeedImage(data.feed.image);

        setNews(data.items.map((item: any) => {
          // Extract thumbnail: Try enclosure first, then description img, then item.thumbnail
          let thumb = item.enclosure?.link || item.thumbnail;
          
          if (!thumb && item.description.includes('<img')) {
            const match = item.description.match(/<img[^>]+src="([^">]+)"/);
            if (match) thumb = match[1];
          }
          
          if (!thumb) thumb = data.feed?.image || 'https://images.unsplash.com/photo-1504711432869-efd597cdd042?auto=format&fit=crop&q=80&w=1000';

          return {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description.replace(/<[^>]*>?/gm, '').trim().substring(0, 150) + '...',
            thumbnail: thumb,
            author: item.author || 'VnExpress'
          };
        }));
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-[#050508]/50 rounded-[3rem] p-8 m-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Đang cập nhật tin tức mới nhất...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 pt-4 px-4 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-black uppercase tracking-widest"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Breaking News
          </motion.div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
            <Newspaper className="w-10 h-10 text-rose-600" />
            Tin tức Thế giới
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Cập nhật tin tức công nghệ, kinh tế và đời sống liên tục 24/7.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tin tức..."
              className="px-4 py-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm w-full md:w-64 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold"
            />
          </form>
          <button 
            onClick={fetchNews}
            disabled={refreshing}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> 
          </button>
        </div>
      </div>

      {news.length === 0 ? (
        <NoData 
          message="Chưa tìm thấy tin tức" 
          description="Hiện tại chưa có tin mới nào hoặc đang gặp lỗi kết nối. Vui lòng quay lại sau."
          icon={Newspaper}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map((item, idx) => (
            <motion.article
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-rose-500/5 transition-all flex flex-col"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img 
                  src={item.thumbnail} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== feedImage) {
                      target.src = feedImage;
                    }
                  }}
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg">
                    HOT NEWS
                  </span>
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(item.pubDate), 'dd/MM/yyyy', { locale: vi })}
                  </span>
                  <span className="opacity-30">•</span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {item.author}
                  </span>
                </div>
                
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors uppercase">
                  {item.title}
                </h2>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">
                  {item.description}
                </p>
                
                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 group-hover:underline"
                  >
                    Xem chi tiết <ExternalLink className="w-4 h-4" />
                  </a>
                  <Sparkles className="w-5 h-5 text-slate-200 dark:text-white/10" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

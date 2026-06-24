import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Calendar, Users, Mail, Sparkles, ChevronDown, Wrench, Files, Zap, Info, Laptop, 
  FolderOpen, Scan, FilePlus, FileImage, FileText, Box, ChevronRight, AppWindow, CheckSquare, 
  Image as ImageIcon, Plus, Trash2, Edit3, Eye, Heart, Share2, Search, ArrowLeft, ArrowRight, 
  X, Copy, Globe, Check, ThumbsUp, HelpCircle, LayoutGrid, List, Columns, Sliders, Type
} from 'lucide-react';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, setDoc 
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useConfirmStore } from '../store/confirmStore';
import { toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';

interface Post {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  background: string;
  views: number;
  shares: number;
  likes: number;
  likedBy: string[];
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt?: number;
  isVnExpress?: boolean;
  link?: string;
  pubDate?: string;
}

interface HealthDoc {
  id: string;
  docNumber: string;       // Số hiệu (e.g. 15/2026/TT-BYT)
  title: string;           // Tiêu đề / Trích yếu (e.g. Thông tư quy định...)
  docType: string;         // Phân loại: Thông tư, Quyết định, Chỉ thị, Hướng dẫn
  signer: string;          // Người ký
  issuedDate: string;      // Ngày ban hành
  effectiveDate?: string;  // Ngày có hiệu lực
  issuer: string;          // Cơ quan ban hành (Bộ Y tế, Sở Y tế)
  pdfUrl?: string;         // Link tải
  summary: string;         // Tóm tắt nội dung chi tiết
  createdAt: number;
  userId: string;
  userName: string;
}


const DEFAULT_CATEGORIES = [
  { id: 'all', name: '🎯 Tất cả', color: 'text-indigo-400 bg-indigo-500/10' },
  { id: 'news', name: '📰 Tin tức', color: 'text-blue-400 bg-blue-500/10' },
  { id: 'announce', name: '📢 Thông báo', color: 'text-amber-400 bg-amber-500/10' },
  { id: 'guide', name: '📘 Hướng dẫn', color: 'text-emerald-400 bg-emerald-500/10' },
  { id: 'event', name: '🗓️ Sự kiện', color: 'text-rose-400 bg-rose-500/10' }
];

const VNEXPRESS_CATEGORIES = [
  { id: 'tin-moi-nhat', name: '🔥 Mới nhất' },
  { id: 'thoi-su', name: '📰 Thời sự' },
  { id: 'the-gioi', name: '🌍 Thế giới' },
  { id: 'kinh-doanh', name: '💼 Kinh doanh' },
  { id: 'giai-tri', name: '🎭 Giải trí' },
  { id: 'the-thao', name: '⚽ Thể thao' },
  { id: 'phap-luat', name: '⚖️ Pháp luật' },
  { id: 'giao-duc', name: '🎓 Giáo dục' },
  { id: 'suc-khoe', name: '🩺 Sức khỏe' },
  { id: 'doi-song', name: '🏠 Đời sống' },
  { id: 'du-lich', name: '✈️ Du lịch' },
  { id: 'khoa-hoc', name: '🔬 Khoa học' },
  { id: 'so-hoa', name: '💻 Số hóa' },
  { id: 'xe', name: '🚗 Xe' }
];

const BACKGROUND_PRESETS = [
  { 
    id: 'deep-slate', 
    name: 'Sắc Đá Thẫm', 
    classes: 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white',
    ring: 'ring-slate-600'
  },
  { 
    id: 'aurora-mint', 
    name: 'Cực Quang Bạc Hà', 
    classes: 'bg-gradient-to-br from-teal-950 via-emerald-900 to-zinc-950 text-white',
    ring: 'ring-emerald-600'
  },
  { 
    id: 'cosmic-purple', 
    name: 'Tử Đinh Hương Vũ Trụ', 
    classes: 'bg-gradient-to-br from-purple-950 via-indigo-950 to-zinc-950 text-white',
    ring: 'ring-purple-600'
  },
  { 
    id: 'warm-amber', 
    name: 'Hổ Phách Ánh Kim', 
    classes: 'bg-gradient-to-br from-amber-950 via-stone-900 to-zinc-950 text-white',
    ring: 'ring-amber-600'
  },
  { 
    id: 'crimson-velvet', 
    name: 'Nhung Đỏ Đậm', 
    classes: 'bg-gradient-to-br from-rose-950 via-red-950 to-black text-white',
    ring: 'ring-rose-600'
  },
  { 
    id: 'classic-dark', 
    name: 'Hắc Thạch Tối Giản', 
    classes: 'bg-zinc-900 border border-white/5 text-zinc-100',
    ring: 'ring-zinc-600'
  },
  { 
    id: 'classic-light', 
    name: 'Cát Trắng Hiện Đại', 
    classes: 'bg-white border border-slate-200 text-slate-800 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-100',
    ring: 'ring-slate-300'
  }
];

export default function PortalPage() {
  const { user, userData, isAdmin } = useAuthStore();
  const isAdminUser = isAdmin && userData?.role !== 'review';
  const { openConfirm } = useConfirmStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom categories state
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('text-blue-400 bg-blue-500/10');
  
  // Category inline editing states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('');

  // Real-time listen to categories in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'portal_categories'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        // Ensure "All" selection is present
        const hasAll = list.some(c => c.id === 'all');
        const finalCategories = hasAll 
          ? list 
          : [{ id: 'all', name: '🎯 Tất cả', color: 'text-indigo-405 bg-indigo-500/10' }, ...list];
        setCategories(finalCategories);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    }, (err) => {
      console.error("Error listening to portal_categories:", err);
    });
    return () => unsub();
  }, []);
  
  // Custom switch between internal and VnExpress news and Health section
  const [portalSource, setPortalSource] = useState<'internal' | 'vnexpress' | 'health'>('internal');
  const [vnExpressNews, setVnExpressNews] = useState<Post[]>([]);
  const [vnExpressLoading, setVnExpressLoading] = useState(false);
  const [vnExpressCategory, setVnExpressCategory] = useState('tin-moi-nhat');

  // Health-specific states
  const [healthNews, setHealthNews] = useState<Post[]>([]);
  const [healthNewsLoading, setHealthNewsLoading] = useState(false);
  const [healthSubTab, setHealthSubTab] = useState<'news' | 'docs'>('news');
  const [healthDocs, setHealthDocs] = useState<HealthDoc[]>([]);
  const [healthDocsLoading, setHealthDocsLoading] = useState(true);
  const [healthDocSearch, setHealthDocSearch] = useState('');
  const [healthDocTypeFilter, setHealthDocTypeFilter] = useState('all');

  // Filtering & Pagination State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'likes'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = portalSource === 'internal' ? 6 : 12;

  // Selected Post for Expansion/Reader mode
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Different display layout modes for news items (newspaper, compact list, bento card grid, split screen panel, youtube)
  const [viewMode, setViewMode] = useState<'newspaper' | 'compact' | 'bento' | 'split' | 'youtube'>('newspaper');
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);

  // Deep scraping full content states for VnExpress or any item to read clean details in-app
  const [scrapedContent, setScrapedContent] = useState<{ paragraphs: string[], images: string[] } | null>(null);
  const [scrapingLoading, setScrapingLoading] = useState(false);

  // Reader Preferences Mode customize layouts
  const [readerTheme, setReaderTheme] = useState<'light' | 'dark' | 'sepia' | 'charcoal'>('light');
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [readerFontFamily, setReaderFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');

  useEffect(() => {
    if (selectedPost && (selectedPost.isVnExpress || selectedPost.link)) {
      setScrapedContent(null);
      setScrapingLoading(true);
      const targetUrl = selectedPost.link || '';
      if (targetUrl) {
        fetch(`/api/scrape-article?url=${encodeURIComponent(targetUrl)}`)
          .then(res => {
            if (!res.ok) throw new Error('API request failed');
            return res.json();
          })
          .then(data => {
            if (data.success && data.paragraphs && data.paragraphs.length > 0) {
              setScrapedContent({
                paragraphs: data.paragraphs,
                images: data.images || []
              });
            } else {
              setScrapedContent({
                paragraphs: [selectedPost.summary],
                images: []
              });
            }
          })
          .catch(err => {
            console.error("Error scraping full article contents:", err);
            setScrapedContent({
              paragraphs: [selectedPost.summary],
              images: []
            });
          })
          .finally(() => {
            setScrapingLoading(false);
          });
      } else {
        setScrapingLoading(false);
      }
    } else {
      setScrapedContent(null);
      setScrapingLoading(false);
    }
  }, [selectedPost]);

  // Creator/Editor Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('news');
  const [formBgType, setFormBgType] = useState('preset'); // 'preset' or 'custom'
  const [formBgValue, setFormBgValue] = useState('deep-slate'); // preset ID or direct image URL

  useEffect(() => {
    if (userData?.role === 'review') {
      setPosts([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'portal_posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Post[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Post);
      });
      setPosts(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'portal_posts');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch VnExpress news when source is vnexpress or vnExpressCategory changes
  useEffect(() => {
    if (userData?.role === 'review') {
      setVnExpressNews([]);
      setVnExpressLoading(false);
      return;
    }
    if (portalSource === 'vnexpress') {
      const fetchVnNews = async () => {
        setVnExpressLoading(true);
        try {
          const res = await fetch(`/api/vnexpress-news?category=${vnExpressCategory}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.items) {
              const formatted: Post[] = data.items.map((item: any, idx: number) => ({
                id: item.link || `vne-${idx}`,
                title: item.title,
                summary: item.summary,
                content: item.summary, // No Markdown, just the summary
                category: vnExpressCategory,
                background: item.image || 'classic-dark',
                views: Math.floor(Math.random() * 1200) + 300, // random visual views
                shares: Math.floor(Math.random() * 80) + 10,
                likes: Math.floor(Math.random() * 200) + 40,
                likedBy: [],
                authorId: 'vnexpress',
                authorName: 'VnExpress',
                createdAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now() - (idx * 300000),
                isVnExpress: true,
                link: item.link,
                pubDate: item.pubDate
              }));
              setVnExpressNews(formatted);
            } else {
              toast.error(data.error || "Không thể lấy tin tức VnExpress");
            }
          } else {
            toast.error("Không thể kết nối với cổng tin tức VnExpress");
          }
        } catch (e) {
          console.error("VnExpress fetch error:", e);
          toast.error("Lỗi lấy dữ liệu từ VnExpress API");
        } finally {
          setVnExpressLoading(false);
        }
      };
      
      fetchVnNews();
    }
  }, [portalSource, vnExpressCategory]);

  // Fetch Health news when source is health
  useEffect(() => {
    if (userData?.role === 'review') {
      setHealthNews([]);
      setHealthNewsLoading(false);
      return;
    }
    if (portalSource === 'health') {
      const fetchHealthNews = async () => {
        setHealthNewsLoading(true);
        try {
          const res = await fetch(`/api/vnexpress-news?category=suc-khoe`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.items) {
              const formatted: Post[] = data.items.map((item: any, idx: number) => ({
                id: item.link || `vne-health-${idx}`,
                title: item.title,
                summary: item.summary,
                content: item.summary,
                category: 'suc-khoe',
                background: item.image || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
                views: Math.floor(Math.random() * 800) + 100,
                shares: Math.floor(Math.random() * 50) + 5,
                likes: Math.floor(Math.random() * 120) + 20,
                likedBy: [],
                authorId: 'vnexpress',
                authorName: 'VnExpress Y Tế',
                createdAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now() - (idx * 300000),
                isVnExpress: true,
                link: item.link,
                pubDate: item.pubDate
              }));
              setHealthNews(formatted);
            }
          }
        } catch (e) {
          console.error("Health news fetch error:", e);
        } finally {
          setHealthNewsLoading(false);
        }
      };

      fetchHealthNews();
    }
  }, [portalSource]);

  // Health docs real-time fetched from MOH
  useEffect(() => {
    if (userData?.role === 'review') {
      setHealthDocs([]);
      setHealthDocsLoading(false);
      return;
    }
    const fetchHealthDocs = async () => {
      setHealthDocsLoading(true);
      try {
        const response = await fetch('/api/health-docs');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, we haven't got JSON!");
        }
        const data = await response.json();
        if (data.success) {
          setHealthDocs(data.items || []);
        } else {
          setHealthDocs([]);
        }
      } catch (e) {
        console.error("Error fetching health docs:", e);
        setHealthDocs([]);
      } finally {
        setHealthDocsLoading(false);
      }
    };
    fetchHealthDocs();
  }, [portalSource]);

  // Sync expanded post details modal if post updates live
  useEffect(() => {
    if (!selectedPost) return;
    const currentLivePost = posts.find((p) => p.id === selectedPost.id);
    if (currentLivePost) {
      setSelectedPost(currentLivePost);
    }
  }, [posts, selectedPost?.id]);

  // On query params check for single post linking (deeplinking)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const linkedPostId = urlParams.get('post');
    if (linkedPostId && posts.length > 0) {
      const matched = posts.find((p) => p.id === linkedPostId);
      if (matched) {
        setSelectedPost(matched);
      }
    }
  }, [posts]);

  // Open creation modal
  const handleOpenCreateModal = () => {
    setFormMode('create');
    setEditingPostId(null);
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormCategory('news');
    setFormBgType('preset');
    setFormBgValue('deep-slate');
    setShowFormModal(true);
  };

  // Open edit modal
  const handleOpenEditModal = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode('edit');
    setEditingPostId(post.id);
    setFormTitle(post.title);
    setFormSummary(post.summary);
    setFormContent(post.content);
    setFormCategory(post.category);
    
    // Check if background is image URL or preset
    const isPreset = BACKGROUND_PRESETS.some(bp => bp.id === post.background);
    if (isPreset) {
      setFormBgType('preset');
      setFormBgValue(post.background);
    } else {
      setFormBgType('custom');
      setFormBgValue(post.background);
    }
    setShowFormModal(true);
  };

  // Delete Post
  const handleDeletePost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm({
      title: 'Xóa bài viết',
      message: 'Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa ngay',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'portal_posts', postId));
          toast.success("Đã xóa bài viết thành công!");
          if (selectedPost?.id === postId) {
            setSelectedPost(null);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `portal_posts/${postId}`);
          toast.error("Lỗi khi xóa bài viết.");
        }
      }
    });
  };

  // Submit create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSummary.trim() || !formContent.trim()) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    const payload = {
      title: formTitle.trim(),
      summary: formSummary.trim(),
      content: formContent.trim(),
      category: formCategory,
      background: formBgValue,
      updatedAt: Date.now()
    };

    try {
      if (formMode === 'create') {
        const createPayload = {
          ...payload,
          views: 0,
          likes: 0,
          shares: 0,
          likedBy: [],
          authorId: user?.uid || 'anonymous',
          authorName: userData?.displayName || 'Quản trị viên',
          createdAt: Date.now()
        };
        await addDoc(collection(db, 'portal_posts'), createPayload);
        toast.success("Đăng bài viết mới thành công!");
      } else if (formMode === 'edit' && editingPostId) {
        await updateDoc(doc(db, 'portal_posts', editingPostId), payload);
        toast.success("Cập nhật bài viết thành công!");
      }
      setShowFormModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'portal_posts');
      toast.error("Lỗi khi thực hiện lưu bài viết.");
    }
  };

  // Handle Like Post toggle
  const handleToggleLike = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userData?.role === 'review') {
      toast.error("Tài khoản Review không thể thực hiện thao tác này.");
      return;
    }
    if (!user) {
      toast.error("Vui lòng đăng nhập để like bài viết!");
      return;
    }

    const uid = user.uid;
    const likedByArray = post.likedBy || [];
    const isLiked = likedByArray.includes(uid);
    
    let newLikedBy = [...likedByArray];
    if (isLiked) {
      newLikedBy = newLikedBy.filter((id) => id !== uid);
    } else {
      newLikedBy.push(uid);
    }

    try {
      await updateDoc(doc(db, 'portal_posts', post.id), {
        likedBy: newLikedBy,
        likes: newLikedBy.length
      });
      toast.success(isLiked ? "Đã bỏ thích bài viết" : "Đã thích bài viết! ❤️");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `portal_posts/${post.id}`);
      toast.error("Lỗi khi ghi nhận nút Thích.");
    }
  };

  // Handle share click (copies clean link to clipboard and registers share)
  const handleSharePost = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/portal?post=${post.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép link chia sẻ bài viết vào bộ nhớ tạm!");
      
      if (userData?.role === 'review') return;

      // Update DB counter
      await updateDoc(doc(db, 'portal_posts', post.id), {
        shares: (post.shares || 0) + 1
      });
    } catch (err) {
      toast.error("Không thể tự động sao chép link.");
    }
  };

  // View post detailed details (increments views counter)
  const handleOpenReader = async (post: Post) => {
    setSelectedPost(post);
    if (userData?.role === 'review') return;
    // Silent increment for views count in DB
    try {
      await updateDoc(doc(db, 'portal_posts', post.id), {
        views: (post.views || 0) + 1
      });
    } catch (err) {
      console.warn("Could not increment views", err);
    }
  };

  // On query params check for single post linking (deeplinking)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const linkedPostId = urlParams.get('post');
    if (linkedPostId && posts.length > 0) {
      const matched = posts.find((p) => p.id === linkedPostId);
      if (matched) {
        setSelectedPost(matched);
      }
    }
  }, [posts]);

  // Helper code to format readable time
  const formatTime = (epochMs: number) => {
    if (!epochMs) return '';
    try {
      const date = new Date(epochMs);
      return date.toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Helper code to get background classes or image
  const getBackgroundStyle = (bgValue: string): React.CSSProperties => {
    const preset = BACKGROUND_PRESETS.find(p => p.id === bgValue);
    if (!preset) {
      // Custom image URL mode
      return {
        backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.45), rgba(9, 9, 11, 0.95)), url("${bgValue}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {};
  };

  // Get background element classes
  const getBackgroundClasses = (bgValue: string): string => {
    const preset = BACKGROUND_PRESETS.find(p => p.id === bgValue);
    if (preset) {
      return preset.classes;
    }
    // Image fallback uses standard default card style
    return "text-white relative bg-zinc-950";
  };

  if (selectedPost && viewMode !== 'split') {
    const isSelectedVnExpress = !!selectedPost.isVnExpress;
    const catObj = isSelectedVnExpress
      ? { name: VNEXPRESS_CATEGORIES.find(c => c.id === selectedPost.category)?.name || "VnExpress", color: "text-amber-400 bg-amber-500/10 border border-amber-500/20" }
      : (categories.find(c => c.id === selectedPost.category) || categories[1] || { name: 'Bản tin', color: 'text-indigo-400 bg-indigo-500/10' });
    const likedByArray = selectedPost.likedBy || [];
    const isLiked = user && likedByArray.includes(user.uid);

    const getThemeClasses = () => {
      switch (readerTheme) {
        case 'sepia': return 'bg-[#fbf0da] text-[#4a3319] border-[#ecdcb9]';
        case 'charcoal': return 'bg-[#212429] text-[#e2e4e9] border-[#32373e]';
        case 'dark': return 'bg-zinc-950 text-zinc-100 border-zinc-850 dark:border-white/5';
        default: return 'bg-white text-slate-900 border-slate-150 dark:bg-zinc-900 dark:text-zinc-100 dark:border-white/5';
      }
    };

    const getFontSizeClasses = () => {
      switch (readerFontSize) {
        case 'sm': return 'text-xs md:text-sm leading-relaxed';
        case 'lg': return 'text-base md:text-lg leading-loose';
        case 'xl': return 'text-lg md:text-xl leading-loose font-medium';
        default: return 'text-sm md:text-base leading-relaxed';
      }
    };

    const getFontFamilyClasses = () => {
      switch (readerFontFamily) {
        case 'serif': return 'font-serif';
        case 'mono': return 'font-mono';
        default: return 'font-sans';
      }
    };

    return (
      <div className="max-w-[1200px] mx-auto py-6 px-4 md:px-8 space-y-8 animate-fadeIn">
        <Helmet>
          <title>{selectedPost.title} | {isSelectedVnExpress ? 'VnExpress' : 'BMASS Portal'}</title>
        </Helmet>

        {/* Back and Admin actions panel */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all hover:-translate-x-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách bản tin
          </button>

          {!isSelectedVnExpress && isAdminUser && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleOpenEditModal(selectedPost, e)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Sửa bài
              </button>
              <button
                onClick={(e) => handleDeletePost(selectedPost.id, e)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-650/10 hover:bg-red-650 text-red-600 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa bài
              </button>
            </div>
          )}
        </div>

        {/* Custom Visual Style Options Bar */}
        <div className="bg-slate-150/50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-400">
            <Sliders className="w-4 h-4 text-indigo-500" />
            Tuỳ biến phong cách đọc:
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Theme picker */}
            <div className="flex items-center bg-white/70 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
              {(['light', 'sepia', 'charcoal', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setReaderTheme(t)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    readerTheme === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  {t === 'light' ? 'Sáng' : t === 'sepia' ? 'Trà Cổ' : t === 'charcoal' ? 'Xám' : 'Tối'}
                </button>
              ))}
            </div>

            {/* Font family picker */}
            <div className="flex items-center bg-white/70 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
              {(['sans', 'serif', 'mono'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReaderFontFamily(f)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    readerFontFamily === f
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  {f === 'sans' ? 'Sans-serif' : f === 'serif' ? 'Serif' : 'Mono'}
                </button>
              ))}
            </div>

            {/* FontSize picker */}
            <div className="flex items-center bg-white/70 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
              {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setReaderFontSize(sz)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    readerFontSize === sz
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  {sz === 'sm' ? 'Cỡ nhỏ' : sz === 'md' ? 'Cỡ trung' : sz === 'lg' ? 'Cỡ lớn' : 'Cực đại'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Article Full Screen display */}
        <div className={`border rounded-3xl overflow-hidden shadow-xl flex flex-col transition-colors duration-300 ${getThemeClasses()}`}>
          {/* Header section with cover photo or custom gradient background */}
          <div 
            className={`relative p-8 md:p-16 text-white flex flex-col justify-end min-h-[340px] ${getBackgroundClasses(selectedPost.background)}`}
            style={getBackgroundStyle(selectedPost.background)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
            
            <div className="space-y-4 z-10 relative">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase w-fit ${catObj.color}`}>
                {catObj.name}
              </span>
              <h1 className="text-2xl md:text-4xl font-display font-medium tracking-tight leading-snug max-w-4xl drop-shadow">
                {selectedPost.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono">
                <span>Tác giả: <strong className="text-white font-sans">{selectedPost.authorName}</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Ngày đăng: {formatTime(selectedPost.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Markdown Content Section styled using the chosen custom classes */}
          <div className={`p-6 md:p-12 space-y-8 ${getThemeClasses()} ${getFontFamilyClasses()} ${getFontSizeClasses()}`}>
            {/* Tóm lược nội dung */}
            <div className="p-5 bg-slate-500/5 dark:bg-white/5 border-l-4 border-indigo-500 rounded-r-2xl">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-450 mb-1.5">Tóm lược nội dung</h4>
              <p className="font-medium leading-relaxed italic">{selectedPost.summary}</p>
            </div>

            {/* Render full view depending on whether it is VnExpress URL link */}
            {isSelectedVnExpress ? (
              <div className="space-y-6">
                {scrapingLoading ? (
                  <div className="space-y-4 py-8 animate-pulse">
                    <div className="h-4 bg-slate-300 dark:bg-zinc-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-300 dark:bg-zinc-800 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-300 dark:bg-zinc-800 rounded w-4/5"></div>
                    <div className="h-4 bg-slate-300 dark:bg-zinc-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-300 dark:bg-zinc-800 rounded w-2/3"></div>
                    <p className="text-center text-xs opacity-50">Đang cào dữ liệu toàn bộ bài báo trực tiếp từ VnExpress...</p>
                  </div>
                ) : scrapedContent ? (
                  <div className="space-y-6">
                    {scrapedContent.paragraphs.map((para, pIdx) => (
                      <p key={pIdx} className="leading-relaxed text-justify">
                        {para}
                      </p>
                    ))}

                    {scrapedContent.images && scrapedContent.images.length > 0 && (
                      <div className="py-6 space-y-4">
                        <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest block text-center">Bộ sưu tập ảnh trong bài báo</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {scrapedContent.images.map((imgSrc, imgIdx) => (
                            <div key={imgIdx} className="overflow-hidden rounded-xl bg-black aspect-[16/10] border dark:border-white/5 shadow-md">
                              <img src={imgSrc} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Article Media" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-dashed border-slate-300/30 flex justify-center">
                      <a
                        href={selectedPost.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-red-700 hover:bg-red-650 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 hover:scale-103 cursor-pointer flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        Đọc bài gốc trên VnExpress
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4 border-y border-slate-100 dark:border-white/5 py-8 flex flex-col items-center text-center">
                    <p className="text-sm md:text-base text-slate-600 dark:text-zinc-400 max-w-xl">
                      Bản tin đang được xem trực tiếp từ cổng truyền thông VnExpress. Để theo dõi toàn bộ bài viết chi tiết cùng hình ảnh, video và các thảo luận, mời bạn truy cập trang báo gốc.
                    </p>
                    <a
                      href={selectedPost.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-3.5 bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-650 hover:to-rose-550 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-rose-600/10 cursor-pointer flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Đọc bài viết gốc trên VnExpress
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="markdown-body">
                  <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Social and Interaction counters bar */}
          <div className="border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/30 px-6 md:px-12 py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5" title={`${selectedPost.views || 0} lượt xem`}>
                <Eye className="w-4 h-4 text-slate-400" />
                {selectedPost.views || 0} lượt xem
              </span>
              
              {!isSelectedVnExpress ? (
                <>
                  <button
                    onClick={(e) => handleToggleLike(selectedPost, e)}
                    className={`flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all ${
                      isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-455'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                    {selectedPost.likes || 0} lượt Thích
                  </button>

                  <button
                    onClick={(e) => handleSharePost(selectedPost, e)}
                    className="flex items-center gap-1.5 cursor-pointer hover:scale-105 hover:text-indigo-400 transition-all font-medium"
                  >
                    <Share2 className="w-4 h-4 text-slate-400" />
                    {selectedPost.shares || 0} Chia sẻ bài viết
                  </button>
                </>
              ) : (
                <span className="text-zinc-500 font-mono text-[10px]">RSS Source: vnexpress.net</span>
              )}
            </div>

            <button
              onClick={() => setSelectedPost(null)}
              className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVnExpress = portalSource === 'vnexpress';
  const isHealth = portalSource === 'health';

  // Filters the complete list based on active source choice
  const filteredPosts = isVnExpress
    ? vnExpressNews.filter((post) => {
        const matchSearch = 
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch;
      })
    : isHealth
      ? healthNews.filter((post) => {
          const matchSearch = 
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.summary.toLowerCase().includes(searchQuery.toLowerCase());
          return matchSearch;
        })
      : posts
          .filter((post) => {
            const matchCat = activeCategory === 'all' || post.category === activeCategory;
            const matchSearch = 
              post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
              post.content.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
          })
          .sort((a, b) => {
            if (sortBy === 'views') {
              return (b.views || 0) - (a.views || 0);
            }
            if (sortBy === 'likes') {
              return (b.likes || 0) - (a.likes || 0);
            }
            return b.createdAt - a.createdAt; // newest default
          });

  // Paginated Posts
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage) || 1;
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const listLoading = isVnExpress 
    ? vnExpressLoading 
    : isHealth 
      ? healthNewsLoading 
      : loading;

  return (
    <div className="max-w-[1600px] mx-auto py-6 px-4 md:px-8 space-y-10 animate-fadeIn no-scrollbar">
      <Helmet>
        <title>Cổng Thông Tin Tổng Hợp | BMASS</title>
        <meta name="description" content="Kênh truyền thông, thông báo và hỗ trợ hành chính của Hệ điều hành BMASS." />
      </Helmet>

      {/* Head Header Banner element */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />
        <div className="space-y-3 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Cổng Thông Tin Truyền Thông</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-white leading-tight">
            BMASS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 italic font-normal">PORTAL</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Cập nhật tin tức, văn bản hướng dẫn, các thông báo khẩn cấp và sự kiện nổi bật trong hệ điều hành số. Mọi cập nhật đều hiển thị trong thời gian thực.
          </p>
        </div>

        {!isVnExpress && isAdminUser && (
          <div className="flex flex-wrap items-center gap-3 z-10 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCategoryModal(true)}
              className="px-5 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 text-slate-700 dark:text-zinc-200 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-indigo-505" />
              Quản lý Danh mục
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenCreateModal}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Đăng bài mới
            </motion.button>
          </div>
        )}
      </div>

      {/* Segmented feed source selection */}
      <div className="flex bg-slate-100/80 dark:bg-zinc-800/60 p-1 rounded-2xl w-fit border border-slate-200/55 dark:border-white/5 shadow-inner">
        <button
          onClick={() => {
            setPortalSource('internal');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            portalSource === 'internal'
              ? 'bg-white dark:bg-zinc-900 text-indigo-650 dark:text-white shadow-md'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Bản Tin Nội Bộ
        </button>
        <button
          onClick={() => {
            setPortalSource('vnexpress');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            portalSource === 'vnexpress'
              ? 'bg-white dark:bg-zinc-905 text-rose-600 dark:text-white shadow-md'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-rose-500" />
          Tin tức VnExpress
        </button>
      </div>

      {/* Layout / View Mode Choice Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-200">
            <LayoutGrid className="w-4 h-4 text-indigo-500" />
            <span>Phương thức hiển thị bản tin:</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium font-sans">Bố cục dàn trang linh hoạt đáp ứng mọi nhu cầu đọc tin của bạn</p>
        </div>

        <div className="relative min-w-[220px]">
          <select
            value={viewMode}
            onChange={(e) => {
              const val = e.target.value as any;
              setViewMode(val);
              if (val === 'split') {
                if (paginatedPosts.length > 0 && !selectedPost) {
                  setSelectedPost(paginatedPosts[0]);
                }
              } else {
                setSelectedPost(null);
              }
            }}
            className="w-full appearance-none pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-250 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all hover:bg-slate-200/50 dark:hover:bg-zinc-850"
          >
            <option value="newspaper">📰 Bố cục: Trang Báo (Mặc định)</option>
            <option value="compact">📝 Bố cục: Danh Sách rút gọn</option>
            <option value="bento">🍱 Bố cục: Bento Grid hiện đại</option>
            <option value="split">📖 Bố cục: Song Song thông minh</option>
            <option value="youtube">📺 Bố cục: Kiểu Youtube (Rộng đều)</option>
          </select>
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Control Panel: Filters, Search, Sort */}
      {portalSource === 'health' ? (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
          {/* Authentic Health sub-navigation bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 dark:bg-zinc-900/10 border-b border-slate-150 dark:border-white/5 gap-4">
            <div className="flex bg-slate-200/60 dark:bg-zinc-800 p-1 rounded-xl w-fit">
              <button
                onClick={() => {
                  setHealthSubTab('news');
                  setCurrentPage(1);
                  setSearchQuery('');
                }}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  healthSubTab === 'news'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                📰 Tin tức Y tế Sức khỏe
              </button>
              <button
                onClick={() => {
                  setHealthSubTab('docs');
                  setCurrentPage(1);
                  setSearchQuery('');
                }}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  healthSubTab === 'docs'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                📋 Văn bản pháp quy Y tế
              </button>
            </div>

            {/* Admin or testing quick action button to add custom documents removed to comply with "Lấy từ Bộ Y tế, không phải tự đăng tải" */}
            {healthSubTab === 'docs' && null}
          </div>

          {/* Render inputs based on whether they read news or docs */}
          {healthSubTab === 'news' ? (
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-sans font-medium">
                Cập nhật toàn bộ tin tức bằng <strong className="text-teal-600 dark:text-teal-400 font-sans font-extrabold">API VnExpress Health</strong> tự động tức thời theo phút:
              </span>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhanh tin tức y tế..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 bg-slate-100/60 dark:bg-zinc-900 border border-slate-250 dark:border-white/10 rounded-xl text-xs text-slate-850 dark:text-zinc-200 placeholder-slate-405 focus:outline-none focus:border-teal-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-teal-500/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-1">Phân loại văn bản:</span>
                {['all', 'Thông tư', 'Quyết định', 'Chỉ thị', 'Hướng dẫn'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setHealthDocTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      healthDocTypeFilter === type
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {type === 'all' ? 'Tất cả' : type}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tra số hiệu hoặc trích yếu..."
                  value={healthDocSearch}
                  onChange={(e) => setHealthDocSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-100/60 dark:bg-zinc-900 border border-slate-250 dark:border-white/10 rounded-xl text-xs text-slate-850 dark:text-zinc-200 placeholder-slate-405 focus:outline-none focus:border-teal-500"
                />
                {healthDocSearch && (
                  <button 
                    onClick={() => setHealthDocSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : portalSource === 'vnexpress' ? (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
          {/* Authentic newspaper header bar */}
          <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-50/50 dark:bg-zinc-900/10 border-b border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-zinc-400 font-sans">
            <div className="flex items-center gap-4">
              <span className="font-bold text-[#9f224e] dark:text-rose-450">VnExpress News Portal</span>
              <span>•</span>
              <span>Cổng nguồn tin điện tử chính thống tiếng Việt được đọc nhiều nhất</span>
            </div>
            <div className="text-[11px] font-mono">
              Cập nhật lúc: {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>

          {/* Navbar Category Dropdown Option selection */}
          <div className="py-4 px-6 bg-slate-50/10 dark:bg-zinc-900/10 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-xs font-bold text-[#9f224e] dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Globe className="w-4 h-4 text-[#9f224e] dark:text-rose-450 animate-pulse" />
                Danh mục Tin tức:
              </span>
            </div>
            
            <div className="relative w-full sm:w-80">
              <select
                value={vnExpressCategory}
                onChange={(e) => {
                  setVnExpressCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-[#9f224e] shadow-sm appearance-none cursor-pointer"
              >
                {VNEXPRESS_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="font-sans font-semibold py-1">
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Search bar row */}
          <div className="px-6 py-3 bg-slate-50/30 dark:bg-zinc-900/5 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:inline">
              Hiển thị <strong className="text-slate-700 dark:text-zinc-200 font-sans">{filteredPosts.length}</strong> bài báo tin tức chất lượng cao
            </span>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nhanh tin tức VnExpress..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-100/60 dark:bg-zinc-900 border border-slate-200/65 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-405 focus:outline-none focus:border-[#9f224e] transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Category list filters */}
          <div className="lg:col-span-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-850'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Searching & Sorting */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row gap-2.5 w-full">
            {/* Searching Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bài viết..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all focus:ring-1 focus:ring-indigo-500/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sorting selects */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-600 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="newest">⏰ Mới nhất</option>
              <option value="views">🔥 Xem nhiều nhất</option>
              <option value="likes">❤️ Thích nhiều nhất</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Grid display listing posts with custom background and category */}
      {portalSource === 'health' && healthSubTab === 'docs' ? (
        <div className="space-y-6 animate-fadeIn">
          {healthDocsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-56 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse border border-slate-200 dark:border-white/5" />
              ))}
            </div>
          ) : healthDocs.filter((docItem) => {
              const matchType = healthDocTypeFilter === 'all' || docItem.docType === healthDocTypeFilter;
              const matchSearch = 
                docItem.docNumber.toLowerCase().includes(healthDocSearch.toLowerCase()) ||
                docItem.title.toLowerCase().includes(healthDocSearch.toLowerCase()) ||
                docItem.issuer.toLowerCase().includes(healthDocSearch.toLowerCase()) ||
                docItem.summary.toLowerCase().includes(healthDocSearch.toLowerCase());
              return matchType && matchSearch;
            }).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-zinc-950/20 border border-dashed border-slate-200/55 dark:border-white/5 rounded-3xl space-y-3.5">
              <HelpCircle className="w-12 h-12 text-slate-300 dark:text-zinc-700 animate-bounce" />
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Không có</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {healthDocs
                .filter((docItem) => {
                  const matchType = healthDocTypeFilter === 'all' || docItem.docType === healthDocTypeFilter;
                  const matchSearch = 
                    docItem.docNumber.toLowerCase().includes(healthDocSearch.toLowerCase()) ||
                    docItem.title.toLowerCase().includes(healthDocSearch.toLowerCase()) ||
                    docItem.issuer.toLowerCase().includes(healthDocSearch.toLowerCase()) ||
                    docItem.summary.toLowerCase().includes(healthDocSearch.toLowerCase());
                  return matchType && matchSearch;
                })
                .map((docItem) => {
                  const badgeColors: Record<string, string> = {
                    'Thông tư': 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/35 border-purple-200/50',
                    'Quyết định': 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/35 border-amber-200/50',
                    'Chỉ thị': 'text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/35 border-rose-200/50',
                    'Hướng dẫn': 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/35 border-emerald-200/50',
                  };
                  const docBadge = badgeColors[docItem.docType] || 'text-slate-600 bg-slate-100 dark:text-zinc-300 dark:bg-zinc-900/30';

                  return (
                    <motion.div
                      key={docItem.id}
                      whileHover={{ scale: 1.01, y: -2 }}
                      className="p-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm text-left flex flex-col justify-between gap-5 transition-all relative overflow-hidden"
                    >
                      <div className="space-y-4">
                        {/* Top metadata strip */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${docBadge}`}>
                            {docItem.docType}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-705 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg">
                            {docItem.docNumber}
                          </span>
                        </div>

                        {/* Header and Title */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                            <span>Ban hành:</span>
                            <span className="text-slate-700 dark:text-zinc-300 font-extrabold">{docItem.issuer}</span>
                            <span>•</span>
                            <span>Ngày: {new Date(docItem.issuedDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <h3 className="font-serif font-black text-base md:text-lg text-slate-900 dark:text-white leading-tight line-clamp-2 hover:line-clamp-none transition-all duration-300">
                            {docItem.title}
                          </h3>
                        </div>

                        {/* Content summary */}
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                          {docItem.summary}
                        </p>
                      </div>

                      {/* Bottom strip details */}
                      <div className="pt-4 border-t border-slate-150 dark:border-white/5 flex items-center justify-between gap-3 text-[10px] text-slate-450 dark:text-zinc-500">
                        <div className="space-y-0.5">
                          <div>Người ký: <strong className="text-slate-750 dark:text-zinc-300">{docItem.signer}</strong></div>
                          <div>Cập nhật: <span className="font-medium text-slate-600 dark:text-zinc-400">{docItem.userName}</span></div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Download link button */}
                          <a
                            href={docItem.pdfUrl || "https://moh.gov.vn"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 font-bold rounded-xl tracking-wider uppercase transition-all duration-300 flex items-center gap-1 cursor-pointer hover:scale-103"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Xem/Tải</span>
                          </a>

                    {/* Delete action button removed - not applicable to MOH-fetched data */}
                    {null}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>
      ) : listLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-85 bg-slate-100 dark:bg-zinc-900 rounded-3xl animate-pulse border border-slate-200 dark:border-white/5" />
          ))}
        </div>
      ) : paginatedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-zinc-950/20 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl space-y-3.5">
          <HelpCircle className="w-12 h-12 text-slate-300 dark:text-zinc-700 animate-bounce" />
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Không tìm thấy bất kỳ bài viết nào khớp với tiêu chí tìm kiếm.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* 1. SPLIT-SCREEN SONG SONG DYNAMIC DASHBOARD LAYOUT */}
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
              {/* Left Column: List sidebar (4/12 width) */}
              <div className="lg:col-span-4 flex flex-col gap-3 max-h-[850px] overflow-y-auto pr-2 no-scrollbar scroll-smooth">
                <div className="p-3 bg-slate-100/50 dark:bg-zinc-900/30 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Trang {currentPage} / {totalPages} ({filteredPosts.length} tin)</span>
                  <span className="text-indigo-500 font-bold">Khung Đọc Nhanh</span>
                </div>

                <div className="flex flex-col gap-3">
                  {paginatedPosts.map((post) => {
                    const isVn = !!post.isVnExpress;
                    const catObj = isVn
                      ? { name: VNEXPRESS_CATEGORIES.find(c => c.id === post.category)?.name || "VnExpress", color: "text-amber-500 bg-amber-500/10 border border-amber-500/10" }
                      : (categories.find(c => c.id === post.category) || categories[1] || { name: 'Bản tin', color: 'text-indigo-400 bg-indigo-500/10' });
                    const isCurrentlySelectedInSplit = selectedPost && selectedPost.id === post.id;

                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          handleOpenReader(post);
                        }}
                        className={`group p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex flex-col justify-between gap-3 ${
                          isCurrentlySelectedInSplit
                            ? 'bg-indigo-50/75 border-indigo-200 dark:bg-zinc-900/80 dark:border-indigo-500/50 shadow-sm'
                            : 'bg-white dark:bg-zinc-950 border-slate-200/60 hover:bg-slate-50/40 dark:border-white/5 dark:hover:bg-zinc-900/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border dark:border-white/5">
                            <img src={post.background} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="space-y-1">
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase ${catObj.color}`}>
                              {catObj.name}
                            </span>
                            <h4 className={`font-sans font-bold text-xs leading-snug line-clamp-2 transition-colors ${
                              isCurrentlySelectedInSplit ? 'text-indigo-650 dark:text-indigo-400 font-extrabold' : 'text-slate-800 dark:text-zinc-200'
                            }`}>
                              {post.title}
                            </h4>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className="flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            {post.views || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active detail reader (8/12 width) */}
              <div className="lg:col-span-8 flex flex-col bg-slate-50/50 dark:bg-zinc-900/10 border border-slate-200 dark:border-white/5 rounded-3xl p-4 md:p-6 shadow-sm overflow-hidden min-h-[500px]">
                {selectedPost ? (
                  <div className="space-y-6 max-h-[800px] overflow-y-auto pr-1 no-scrollbar-y scroll-smooth animate-fadeIn">
                    {/* Preferences strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                      <div className="text-[10px] font-bold text-slate-500 font-sans tracking-wide uppercase">Cấu hình trang sách:</div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <select 
                          value={readerTheme} 
                          onChange={(e: any) => setReaderTheme(e.target.value)}
                          className="text-[11px] font-bold bg-slate-100 dark:bg-zinc-900 px-3 py-1 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="light">☀️ Màu Sáng</option>
                          <option value="sepia">📔 Giấy Cổ</option>
                          <option value="charcoal">🌚 Màu Xám</option>
                          <option value="dark">🌑 Màu Tối</option>
                        </select>

                        <select 
                          value={readerFontFamily} 
                          onChange={(e: any) => setReaderFontFamily(e.target.value)}
                          className="text-[11px] font-bold bg-slate-100 dark:bg-zinc-900 px-3 py-1 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="sans">Sans Modern</option>
                          <option value="serif font-serif">Serif Classic</option>
                          <option value="mono font-mono">JetBrains Code</option>
                        </select>

                        <select 
                          value={readerFontSize} 
                          onChange={(e: any) => setReaderFontSize(e.target.value)}
                          className="text-[11px] font-bold bg-slate-100 dark:bg-zinc-900 px-3 py-1 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="sm">Cỡ nhỏ (-A)</option>
                          <option value="md">Cỡ tiêu chuẩn (A)</option>
                          <option value="lg">Cỡ chữ to (A+)</option>
                          <option value="xl">Cực đại (A++)</option>
                        </select>
                      </div>
                    </div>

                    {/* Styled Reader View block inside split container */}
                    <div className={`p-6 rounded-2xl border transition-colors duration-200 ${
                      readerTheme === 'sepia' ? 'bg-[#fbf0da] text-[#4a3319] border-[#ecdcb9]' :
                      readerTheme === 'charcoal' ? 'bg-[#212429] text-[#e2e4e9] border-[#32373e]' :
                      readerTheme === 'dark' ? 'bg-zinc-950 text-zinc-100 border-zinc-850 dark:border-white/5' :
                      'bg-white text-slate-900 border-slate-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-white/5'
                    }`}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-black tracking-widest uppercase">
                            {selectedPost.isVnExpress ? 'VnExpress' : 'BMASS'}
                          </span>
                          <span className="text-[10px] text-slate-450 font-mono italic">{formatTime(selectedPost.createdAt)}</span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-serif font-black tracking-tight leading-snug">
                          {selectedPost.title}
                        </h2>

                        <div className="h-[200px] rounded-xl overflow-hidden border dark:border-white/5 relative">
                          <img src={selectedPost.background} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                        </div>

                        {/* Summary */}
                        <div className="p-4 bg-slate-500/5 rounded-xl border-l-4 border-indigo-400 italic text-xs leading-relaxed">
                          {selectedPost.summary}
                        </div>

                        {/* Content text */}
                        <div className={`space-y-4 text-justify pt-2 ${
                          readerFontSize === 'sm' ? 'text-xs md:text-sm leading-relaxed' :
                          readerFontSize === 'lg' ? 'text-base md:text-lg leading-loose' :
                          readerFontSize === 'xl' ? 'text-lg md:text-xl leading-loose font-medium' :
                          'text-sm md:text-base leading-relaxed'
                        } ${
                          readerFontFamily === 'serif' ? 'font-serif' :
                          readerFontFamily === 'mono' ? 'font-mono' :
                          'font-sans'
                        }`}>
                          {selectedPost.isVnExpress ? (
                            <div>
                              {scrapingLoading ? (
                                <div className="space-y-3 py-6 animate-pulse">
                                  <div className="h-4 bg-slate-300 dark:bg-zinc-850 rounded"></div>
                                  <div className="h-4 bg-slate-300 dark:bg-zinc-850 rounded w-5/6"></div>
                                  <div className="h-4 bg-slate-300 dark:bg-zinc-850 rounded w-4/5"></div>
                                </div>
                              ) : scrapedContent ? (
                                <div className="space-y-4">
                                  {scrapedContent.paragraphs.map((p, idx) => (
                                    <p key={idx}>{p}</p>
                                  ))}
                                  {scrapedContent.images && scrapedContent.images.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
                                      {scrapedContent.images.map((img, idx) => (
                                        <div key={idx} className="h-32 rounded-lg overflow-hidden border dark:border-white/5">
                                          <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="pt-4 flex justify-center">
                                    <a
                                      href={selectedPost.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-4 py-2 bg-red-700 hover:bg-red-650 text-white rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-colors"
                                    >
                                      Xem trực tiếp tại VnExpress
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-6 text-center space-y-3">
                                  <p className="text-xs opacity-60">Đang xem tóm lược tin nhanh.</p>
                                  <a href={selectedPost.link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-red-700 hover:bg-red-650 text-white rounded-lg text-[11px] font-bold uppercase cursor-pointer inline-block">Đọc bài gốc</a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="markdown-body text-xs md:text-sm">
                              <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4 p-8 text-center text-slate-400">
                    <BookOpen className="w-12 h-12 text-slate-300 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-705 dark:text-zinc-300">Khung đọc song song thông minh</h4>
                      <p className="text-xs max-w-sm mx-auto mt-1">Chọn bất kỳ bài báo nào ở danh mục bên trái để hiển thị ngay nội dung cào chi tiết mà không cần quay đi quay lại.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. COMPACT LIST LAYOUT (Danh sách dọc tối giản) */}
          {viewMode === 'compact' && (
            <div className="flex flex-col gap-4 max-w-4xl mx-auto animate-fadeIn">
              {paginatedPosts.map((post) => {
                const isVn = !!post.isVnExpress;
                const catObj = isVn
                  ? { name: VNEXPRESS_CATEGORIES.find(c => c.id === post.category)?.name || "VnExpress", color: "text-amber-500 bg-amber-500/10 border border-amber-500/10" }
                  : (categories.find(c => c.id === post.category) || categories[1] || { name: 'Bản tin', color: 'text-indigo-400 bg-indigo-500/10' });
                const likedByArray = post.likedBy || [];
                const isLiked = user && likedByArray.includes(user.uid);

                return (
                  <div
                    key={post.id}
                    onClick={() => handleOpenReader(post)}
                    className="group bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-white/5 hover:border-slate-350 p-4 rounded-2xl flex flex-col md:flex-row gap-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md align-center"
                  >
                    <div className="w-full md:w-[200px] shrink-0 aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-900 border dark:border-white/5 relative">
                      <img src={post.background} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform group-hover:scale-103" alt="" />
                    </div>

                    <div className="flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${catObj.color}`}>
                            {catObj.name}
                          </span>
                          {isVn && (
                            <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/10 px-2 py-0.5 rounded-full">VnExpress</span>
                          )}
                        </div>
                        
                        <h3 className="font-sans font-black text-base text-slate-900 dark:text-zinc-100 group-hover:text-[#9f224e] dark:group-hover:text-rose-450 transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        
                        <p className="text-xs text-slate-500 dark:text-zinc-450 line-clamp-2 leading-relaxed">
                          {post.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-dashed border-slate-100 dark:border-white/5">
                        <span>Ngày đăng: {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {post.views || 0} xem
                          </span>
                          {!isVn && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" />
                              {post.likes || 0} thích
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. BENTO INTERACTIVE ASYMMETRICAL GRID LAYOUT */}
          {viewMode === 'bento' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {paginatedPosts.map((post, bentoIdx) => {
                const isVn = !!post.isVnExpress;
                const catObj = isVn
                  ? { name: VNEXPRESS_CATEGORIES.find(c => c.id === post.category)?.name || "Tin tức", color: "text-amber-500 bg-amber-500/10 border border-amber-500/10" }
                  : (categories.find(c => c.id === post.category) || categories[1] || { name: 'Bản tin', color: 'text-indigo-400 bg-indigo-500/10' });
                const isDoubleWidth = bentoIdx === 0 || bentoIdx === 5;

                return (
                  <div
                    key={post.id}
                    onClick={() => handleOpenReader(post)}
                    className={`relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between shadow-sm cursor-pointer group transition-all duration-300 hover:shadow-md ${
                      isDoubleWidth
                        ? 'md:col-span-2 h-[380px] bg-gradient-to-br from-[#12121e] via-[#090a14] to-[#1a0a20] text-zinc-100 border border-white/5'
                        : 'h-[330px] bg-white border border-slate-200/80 dark:bg-zinc-950 dark:border-white/5 text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    {isDoubleWidth && (
                      <div className="absolute inset-0 z-0 opacity-45 mix-blend-overlay">
                        <img src={post.background} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-104 brightness-50" alt="" />
                      </div>
                    )}

                    <div className="flex items-center justify-between z-10">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${catObj.color}`}>
                        {catObj.name}
                      </span>
                      {isVn && (
                        <span className="text-[10px] text-rose-500 font-bold font-serif uppercase tracking-wider">VnExpress</span>
                      )}
                    </div>

                    <div className="space-y-2 mt-auto mb-4 z-10 text-left">
                      <h3 className={`font-serif font-black tracking-tight leading-snug line-clamp-2 transition-all ${
                        isDoubleWidth
                          ? 'text-lg md:text-2xl text-white group-hover:text-indigo-300'
                          : 'text-base text-slate-900 dark:text-zinc-100 group-hover:text-[#9f224e] dark:group-hover:text-rose-455'
                      }`}>
                        {post.title}
                      </h3>
                      <p className={`text-xs line-clamp-2 leading-relaxed ${isDoubleWidth ? 'text-zinc-300' : 'text-slate-500 dark:text-zinc-400'}`}>
                        {post.summary}
                      </p>
                    </div>

                    <div className={`pt-3 border-t flex items-center justify-between z-10 text-slate-400 ${
                      isDoubleWidth ? 'border-white/10' : 'border-slate-100 dark:border-white/5'
                    }`}>
                      <span className="text-[10px] font-mono">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium font-mono">
                        <Eye className="w-3.5 h-3.5" />
                        {post.views || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3.5. YOUTUBE GRID LAYOUT (Uniform Video-style feed cards) */}
          {viewMode === 'youtube' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {paginatedPosts.map((post) => {
                const isVn = !!post.isVnExpress;
                const catObj = isVn
                  ? { name: VNEXPRESS_CATEGORIES.find(c => c.id === post.category)?.name || "Tin mới", color: "text-amber-500 bg-amber-500/10 border-amber-500/10" }
                  : (categories.find(c => c.id === post.category) || categories[1] || { name: 'Bản tin', color: 'text-indigo-400 bg-indigo-500/10' });

                // Check background type: preset or image URL
                const isPreset = BACKGROUND_PRESETS.some(bp => bp.id === post.background);
                const bgClasses = isPreset 
                  ? BACKGROUND_PRESETS.find(bp => bp.id === post.background)?.classes || BACKGROUND_PRESETS[0].classes 
                  : 'bg-slate-100 dark:bg-zinc-900';

                return (
                  <div
                    key={post.id}
                    onClick={() => handleOpenReader(post)}
                    className="flex flex-col bg-white dark:bg-zinc-900/40 border border-slate-200/60 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group h-[400px] text-left"
                  >
                    {/* Thumbnail box (Aspect video/16-9) */}
                    <div className="aspect-video w-full overflow-hidden relative bg-slate-100 dark:bg-zinc-900 shrink-0 border-b border-slate-150/50 dark:border-white/5">
                      {!isPreset && post.background ? (
                        <img 
                          src={post.background} 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt={post.title} 
                        />
                      ) : (
                        <div className={`w-full h-full flex flex-col justify-between p-4 ${bgClasses} text-white`}>
                          <span className="text-[10px] uppercase font-black tracking-widest opacity-60">BMASS Portal</span>
                          <span className="text-sm font-serif font-black tracking-tight line-clamp-2 leading-snug drop-shadow-sm">{post.title}</span>
                          <span className="text-[9px] font-mono opacity-50 mt-auto">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                      
                      {/* Top Overlay badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wider uppercase border ${catObj.color}`}>
                          {catObj.name}
                        </span>
                        {isVn && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-[#9f224e] bg-[#9f224e]/10 border border-[#9f224e]/10">
                            VnExpress
                          </span>
                        )}
                      </div>
                    </div>

                    {/* details section */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-left transition-all duration-150">
                          {post.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed text-left">
                          {post.summary}
                        </p>
                      </div>

                      {/* YT-like views analytics footer */}
                      <div className="pt-3 border-t border-slate-150 dark:border-white/5 text-[10px] font-medium text-slate-400 dark:text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-auto shrink-0 font-sans">
                        <span className="font-semibold text-slate-500 dark:text-zinc-400">{isVn ? 'VnExpress' : (post.authorName || 'Bản tin')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 inline-block" /> {post.views || 0} lượt xem
                        </span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. NEWSPAPER ORIGINAL DESIGN LAYOUT (Default fallback layout) */}
          {viewMode === 'newspaper' && (
            <div className="space-y-12">
              {portalSource === 'vnexpress' ? (
                /* VNEXPRESS HIGH-FIDELITY NEWS PAPER LAYOUT */
                <div className="space-y-10 animate-fadeIn">
                  {/* 1. HERO SECTION (Only on Page 1) */}
                  {currentPage === 1 && paginatedPosts.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-slate-200 dark:border-white/5">
                      {/* Cột trái: Tin chính nổi bật (Spans 8 columns on large screens) */}
                      <div 
                        onClick={() => handleOpenReader(paginatedPosts[0])}
                        className="lg:col-span-8 group cursor-pointer space-y-4 text-left"
                      >
                        <div className="relative overflow-hidden rounded-2xl aspect-[16/9.5] bg-slate-100 dark:bg-zinc-900 border border-slate-200/40 dark:border-white/5">
                          <img 
                            src={paginatedPosts[0].background} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103" 
                            alt={paginatedPosts[0].title} 
                          />
                          <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-[#9f224e] text-white rounded-full text-[10px] font-bold tracking-widest uppercase shadow">
                            Tin nóng
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                            <span className="text-[#9f224e] font-serif font-black uppercase">Thời sự</span>
                            <span>•</span>
                            <span>{formatTime(paginatedPosts[0].createdAt)}</span>
                          </div>
                          
                          <h2 className="font-serif font-black text-xl md:text-3xl lg:text-3.5xl text-slate-900 dark:text-zinc-100 tracking-tight leading-tight group-hover:text-[#9f224e] dark:group-hover:text-rose-455 transition-colors">
                            {paginatedPosts[0].title}
                          </h2>
                          
                          <p className="text-slate-600 dark:text-zinc-300 text-sm md:text-base leading-relaxed font-sans font-medium line-clamp-3">
                            {paginatedPosts[0].summary}
                          </p>
                        </div>
                      </div>

                      {/* Cột phải: Tin phụ danh sách (Spans 4 columns) */}
                      <div className="lg:col-span-4 flex flex-col justify-between text-left">
                        <div>
                          <div className="border-b border-slate-200 dark:border-white/10 pb-2 mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9f224e] dark:text-rose-400 font-serif">Tin nổi bật khác</h3>
                          </div>
                          
                          <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {paginatedPosts.slice(1, 4).map((post) => (
                              <div 
                                key={post.id}
                                onClick={() => handleOpenReader(post)}
                                className="group cursor-pointer py-4 first:pt-0 last:pb-0 space-y-1.5"
                              >
                                <h4 className="font-serif font-bold text-[15px] sm:text-base text-slate-800 dark:text-zinc-200 group-hover:text-[#9f224e] dark:group-hover:text-rose-400 transition-colors leading-snug">
                                  {post.title}
                                </h4>
                                <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed font-sans line-clamp-2">
                                  {post.summary}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                  <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                  <span>•</span>
                                  <span>{post.views || 0} xem</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Tiny visual callout block */}
                        <div className="mt-6 p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h5 className="text-[11px] font-bold text-[#9f224e] dark:text-rose-400 uppercase tracking-wider">BMASS Reader v2.0</h5>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Xem trực tiếp nội dung đầy đủ từ báo nguồn</p>
                          </div>
                          <Globe className="w-5 h-5 text-slate-300 dark:text-zinc-700 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. MAIN NEWS FEED BLOCK (2-Cột Chia tách: Bản tin & Sidebar) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                    {/* Panel Trái: Bản tin danh sách (8 cột) */}
                    <div className="lg:col-span-8 flex flex-col divide-y divide-slate-200/60 dark:divide-white/5">
                      {/* Skip the hero items if page 1 to prevent repetition */}
                      {(currentPage === 1 ? paginatedPosts.slice(4) : paginatedPosts).map((post) => {
                        const matchedCat = VNEXPRESS_CATEGORIES.find(c => c.id === post.category)?.name || "VnExpress";
                        return (
                          <div 
                            key={post.id}
                            onClick={() => handleOpenReader(post)}
                            className="group flex flex-col sm:flex-row gap-5 py-6 first:pt-0 last:pb-0 cursor-pointer"
                          >
                            {/* Left image side */}
                            <div className="w-full sm:w-[180px] md:w-[210px] shrink-0 aspect-[16/10.5] overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/30 dark:border-white/5">
                              <img 
                                src={post.background} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-104" 
                                alt={post.title} 
                              />
                            </div>

                            {/* Right details side */}
                            <div className="flex-1 space-y-1.5 flex flex-col justify-between">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-[#9f224e] dark:text-rose-450 uppercase tracking-widest font-sans">
                                  {matchedCat}
                                </span>
                                <h4 className="font-serif font-extrabold text-[17px] md:text-lg text-slate-900 dark:text-zinc-100 group-hover:text-[#9f224e] dark:group-hover:text-rose-400 transition-colors leading-snug">
                                  {post.title}
                                </h4>
                                <p className="text-slate-550 dark:text-zinc-400 text-xs md:text-sm leading-relaxed line-clamp-3">
                                  {post.summary}
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-dashed border-slate-100 dark:border-white/5">
                                <span>{new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  {post.views || 0} lượt đọc
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Panel Phải: Sidebar phong cách VnExpress (4 cột) */}
                    <div className="lg:col-span-4 space-y-8 text-left">
                      {/* A. CHUYÊN MỤC 'GÓC NHÌN' WITH CIRCULAR AUTHOR AVATARS */}
                      <div className="bg-slate-50/50 dark:bg-zinc-900/30 p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 space-y-5">
                        <div className="border-b-2 border-[#9f224e] pb-2">
                          <h3 className="text-[14px] font-serif font-black text-[#9f224e] dark:text-rose-450 uppercase tracking-wide flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#9f224e] dark:text-rose-455" />
                            Góc nhìn tác giả
                          </h3>
                        </div>

                        <div className="space-y-4">
                          <div className="p-3 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-white/5 flex gap-3 h-fit items-start shadow-sm hover:shadow-md transition-all">
                            <img 
                              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60" 
                              className="w-12 h-12 object-cover border border-slate-200 dark:border-white/10 rounded-full shrink-0 shadow-inner"
                              alt="Nguyễn Sĩ Dũng" 
                            />
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-sans font-bold text-slate-800 dark:text-zinc-200 leading-none">Nguyễn Sĩ Dũng</h5>
                              <h6 className="font-serif font-bold text-xs text-slate-900 dark:text-zinc-100 leading-snug hover:text-[#9f224e] dark:hover:text-rose-400 transition-colors">
                                Chuyển đổi số không thể đi sau tư duy hành chính
                              </h6>
                              <p className="text-[10px] text-slate-505 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                Năng lực lập pháp và phản ứng chính sách cần kiến tạo môi trường thử nghiệm thông thoáng nhất cho chuyển đổi toàn diện.
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-white/5 flex gap-3 h-fit items-start shadow-sm hover:shadow-md transition-all">
                            <img 
                              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60" 
                              className="w-12 h-12 object-cover border border-slate-200 dark:border-white/10 rounded-full shrink-0 shadow-inner"
                              alt="Lê Đăng Doanh" 
                            />
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-sans font-bold text-slate-800 dark:text-zinc-200 leading-none">TS. Lê Đăng Doanh</h5>
                              <h6 className="font-serif font-bold text-xs text-slate-900 dark:text-zinc-100 leading-snug hover:text-[#9f224e] dark:hover:text-rose-400 transition-colors">
                                Cải cách thể chế để bứt phá năng suất lao động
                              </h6>
                              <p className="text-[10px] text-slate-505 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                Sự sẵn sàng về chính sách công nghệ cần đồng hành chặt chẽ với những cam kết tháo gỡ triệt để rào cản hành chính cho doanh nghiệp đổi mới.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* B. LIST OF 'TIN XEM NHIỀU' */}
                      <div className="p-1 space-y-4">
                        <div className="border-b-2 border-slate-800 dark:border-zinc-700 pb-2">
                          <h3 className="text-[14px] font-serif font-black text-slate-900 dark:text-white uppercase tracking-wide">
                            Đọc nhiều nhất
                          </h3>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                          {[...filteredPosts]
                            .sort((a,b) => (b.views || 0) - (a.views || 0))
                            .slice(0, 5)
                            .map((post, rank) => (
                              <div 
                                key={post.id}
                                onClick={() => handleOpenReader(post)}
                                className="group flex items-start py-3.5 first:pt-0 last:pb-0 cursor-pointer"
                              >
                                <span className="text-3xl font-serif font-black text-slate-200 dark:text-zinc-800 mr-4 italic leading-none w-8 text-right shrink-0">
                                  {rank + 1}
                                </span>
                                <div className="space-y-0.5 flex-1">
                                  <h5 className="font-serif font-bold text-[13px] text-slate-805 dark:text-zinc-200 group-hover:text-[#9f224e] dark:group-hover:text-rose-455 transition-colors leading-snug">
                                    {post.title}
                                  </h5>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {post.views || 0} lượt đọc
                                  </span>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* MOOD INTERNAL NEWS GRID */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                  {paginatedPosts.map((post, idx) => {
                    const isVn = !!post.isVnExpress;
                    const catObj = isVn
                      ? { name: VNEXPRESS_CATEGORIES.find(c => c.id === post.category)?.name || "Tin tức", color: "text-amber-400 bg-amber-500/10 border border-amber-500/20" }
                      : (categories.find(c => c.id === post.category) || categories[1] || { name: 'Bản tin', color: 'text-indigo-400 bg-indigo-500/10' });
                    const likedByArray = post.likedBy || [];
                    const isLiked = user && likedByArray.includes(user.uid);

                    return (
                      <div
                        key={post.id}
                        onClick={() => handleOpenReader(post)}
                        className={`relative overflow-hidden h-[360px] rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group select-none text-left ${getBackgroundClasses(post.background)}`}
                        style={getBackgroundStyle(post.background)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                        {/* Category Chip Badge */}
                        <div className="flex items-center justify-between z-10">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${catObj.color}`}>
                            {catObj.name}
                          </span>
                          
                          {/* Admin management buttons */}
                          {!isVn && isAdminUser && (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => handleOpenEditModal(post, e)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all cursor-pointer"
                                title="Sửa bài"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeletePost(post.id, e)}
                                className="p-1.5 bg-red-650/40 hover:bg-red-650 text-red-100 rounded-lg transition-all cursor-pointer"
                                title="Xóa bài"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Title & Short Content section */}
                        <div className="space-y-3 mt-auto mb-4 z-10">
                          <h3 className="text-lg md:text-xl font-display font-medium leading-snug text-white line-clamp-2 drop-shadow-sm group-hover:text-indigo-200 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-xs text-slate-200/95 line-clamp-3 leading-relaxed drop-shadow-sm">
                            {post.summary}
                          </p>
                        </div>

                        {/* Footer interaction statistics metrics panel */}
                        <div className="pt-4 border-t border-white/15 dark:border-white/5 flex items-center justify-between z-10">
                          <div className="flex items-center gap-4 text-[11px] text-zinc-300 font-medium">
                            <span className="flex items-center gap-1" title={`${post.views || 0} lượt xem`}>
                              <Eye className="w-3.5 h-3.5 text-zinc-400" />
                              {post.views || 0}
                            </span>
                            
                            {!isVn ? (
                              <>
                                <button
                                  onClick={(e) => handleToggleLike(post, e)}
                                  className={`flex items-center gap-1 cursor-pointer transition-colors ${isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400 text-slate-350'}`}
                                  title="Yêu thích"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-505' : 'text-zinc-400'}`} />
                                  {post.likes || 0}
                                </button>

                                <button
                                  onClick={(e) => handleSharePost(post, e)}
                                  className="flex items-center gap-1 cursor-pointer hover:text-indigo-400 text-slate-300 transition-colors"
                                  title="Chia sẻ"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                                  {post.shares || 0}
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                                <Globe className="w-3 h-3 animate-pulse" />
                                VnExpress
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono tracking-wide truncate max-w-[120px]" title={formatTime(post.createdAt)}>
                            {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pagination component controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-2 border border-slate-200 dark:border-white/5 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentPage === page
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-2 border border-slate-200 dark:border-white/5 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL (Admin - setup from a->z) */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowFormModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Form Title Banner */}
              <div className="bg-slate-900 border-b border-white/5 p-6 flex items-center justify-between">
                <div className="space-y-1.5">
                  <h3 className="font-display font-medium text-white text-lg">
                    {formMode === 'create' ? '✏️ Thiết Lập Đăng Bài Viết Mới' : '📝 Chỉnh Sửa Bài Viết Trang'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">Quản trị viên cấu hình định dạng, phân loại và nội dung bài đăng cổng thông tin.</p>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form entries */}
              <form onSubmit={handleFormSubmit} className="flex-1 p-6 md:p-8 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-thin">
                {/* Post Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Tiêu đề bài viết *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tiêu đề hoặc thông điệp chính của bài viết..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Categorization & Background layout selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Phân loại trang/bài đăng *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {categories.filter(c => c.id !== 'all').map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Background mode selection tab toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Kiểu hình nền hiển thị</label>
                    <div className="flex bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormBgType('preset');
                          setFormBgValue('deep-slate');
                        }}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer uppercase text-center transition-all ${
                          formBgType === 'preset' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Preset Gradient
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormBgType('custom');
                          setFormBgValue('');
                        }}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer uppercase text-center transition-all ${
                          formBgType === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Ảnh URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset choices or Custom URL selection */}
                {formBgType === 'preset' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-350 uppercase tracking-wider">Lựa chọn Gradient màu sắc thẫm</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BACKGROUND_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFormBgValue(preset.id)}
                          className={`relative h-12 rounded-xl text-[11px] font-bold tracking-wide cursor-pointer transition-all border ${preset.classes} ${
                            formBgValue === preset.id ? `ring-2 ${preset.ring} border-transparent` : 'border-slate-300 dark:border-white/5 opacity-80'
                          }`}
                        >
                          {preset.name}
                          {formBgValue === preset.id && (
                            <span className="absolute top-1 right-1 bg-indigo-600 rounded-full p-0.5">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Địa chỉ liên kết ảnh nền (URL) *</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                      value={formBgValue}
                      onChange={(e) => setFormBgValue(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 italic">Chọn link ảnh chất lượng từ Unsplash để tối ưu độ tương phản cho văn bản màu trắng hiển thị dạng card.</p>
                  </div>
                )}

                {/* Post Short Content Summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Nội dung tóm tắt / hiển thị ngắn (Max 3 dòng) *</label>
                  <textarea
                    required
                    rows={2}
                    maxLength={220}
                    placeholder="Mô tả tóm tắt nội dung chính để hiển thị ngoài danh sách bài viết đại diện..."
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="text-right text-[10px] text-zinc-400">
                    {formSummary.length}/220 ký tự
                  </div>
                </div>

                {/* Post Full Markdown Details */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Nội dung chi tiết (Rich Markdown) *</label>
                    <span className="text-[10px] text-indigo-400 font-mono italic">Hỗ trợ định dạng chuẩn Markdown (#, **, list hay code block)</span>
                  </div>
                  <textarea
                    required
                    rows={8}
                    placeholder="# Giới thiệu chung&#10;- Dùng Markdown để liệt kê thông tin...&#10;- Bôi đậm **bằng dấu sao kép**..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-mono text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Form submit footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-750 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    {formMode === 'create' ? 'Đăng lên Portal' : 'Lưu cập nhật'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Category Management Modal Overlay */}
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900/10">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Quản lý Danh mục Tin tức</h3>
                </div>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCatId(null);
                  }}
                  className="p-1 px-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-zinc-800 text-slate-450 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categorization Management Panels */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Thêm, Sửa hoặc Xóa các phân loại tin tức nội bộ. Thay đổi sẽ cập nhật trực tiếp tại bộ lọc của trang chủ Bản tin.
                </p>

                {/* 1. Category additions section */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-600 dark:text-zinc-305 uppercase tracking-widest">Thêm danh mục mới</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Tên danh mục (ví dụ: ⚡ Bản tin khẩn)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    
                    <select
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="text-blue-400 bg-blue-500/10">Màu Xanh dương (Blue)</option>
                      <option value="text-emerald-400 bg-emerald-500/10">Màu Xanh lá (Emerald)</option>
                      <option value="text-amber-400 bg-amber-500/10">Màu Cam (Amber)</option>
                      <option value="text-rose-400 bg-rose-500/10">Màu Đỏ/Hồng (Rose)</option>
                      <option value="text-indigo-400 bg-indigo-500/10">Màu Indigo (Chàm)</option>
                      <option value="text-purple-400 bg-purple-500/10">Màu Tím (Purple)</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      if (!newCatName.trim()) {
                        toast.error('Vui lòng nhập tên danh mục!');
                        return;
                      }
                      const id = newCatName.toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                        .trim();
                      if (!id || id === 'all') {
                        toast.error('Tên danh mục không hợp lệ!');
                        return;
                      }
                      try {
                        await setDoc(doc(db, 'portal_categories', id), {
                          id,
                          name: newCatName.trim(),
                          color: newCatColor
                        });
                        toast.success('Thêm danh mục mới thành công!');
                        setNewCatName('');
                      } catch (err) {
                        toast.error('Lỗi khi thêm danh mục vào Firestore');
                      }
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                  >
                    Thêm danh mục
                  </button>
                </div>

                {/* 2. Existing Category administration list */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-600 dark:text-zinc-305 uppercase tracking-widest">Danh sách các danh mục hiện tại</h4>
                  
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {categories.filter(c => c.id !== 'all').map((cat) => {
                      const isEditing = editingCatId === cat.id;

                      return (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900/20 border border-slate-150 dark:border-white/5 rounded-xl gap-2 text-left">
                          {isEditing ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-white/10 rounded-lg text-xs"
                              />
                              <select
                                value={editingCatColor}
                                onChange={(e) => setEditingCatColor(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-white/10 rounded-lg text-xs"
                              >
                                <option value="text-blue-400 bg-blue-500/10">Xanh dương</option>
                                <option value="text-emerald-400 bg-emerald-500/10">Xanh lá</option>
                                <option value="text-amber-400 bg-amber-500/10">Màu Cam</option>
                                <option value="text-rose-400 bg-rose-500/10">Màu Đỏ/Hồng</option>
                                <option value="text-indigo-400 bg-indigo-500/10">Màu Indigo</option>
                                <option value="text-purple-400 bg-purple-500/10">Màu Tím</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cat.color}`}>
                                {cat.name}
                              </span>
                              <span className="text-[10px] text-slate-450 dark:text-zinc-500 font-mono">({cat.id})</span>
                            </div>
                          )}

                          <div className="flex gap-1 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={async () => {
                                    if (!editingCatName.trim()) {
                                      toast.error('Tên danh mục không thể trống!');
                                      return;
                                    }
                                    try {
                                      await updateDoc(doc(db, 'portal_categories', cat.id), {
                                        name: editingCatName.trim(),
                                        color: editingCatColor
                                      });
                                      toast.success('Cập nhật thành công!');
                                      setEditingCatId(null);
                                    } catch (err) {
                                      toast.error('Lỗi khi cập nhật danh mục');
                                    }
                                  }}
                                  className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10.5px] font-bold cursor-pointer"
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={() => setEditingCatId(null)}
                                  className="p-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-[10.5px] cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.name);
                                    setEditingCatColor(cat.color);
                                  }}
                                  className="p-1 px-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 text-xs transition cursor-pointer"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => {
                                    openConfirm({
                                      title: 'Xóa Danh Mục',
                                      message: `Bạn có bảo đảm muốn xóa danh mục "${cat.name}"? Bản tin đang thuộc phân loại này có thể bị mất trạng thái hiển thị chuẩn.`,
                                      confirmText: 'Xóa Ngay',
                                      cancelText: 'Bỏ Qua',
                                      onConfirm: async () => {
                                        try {
                                          await deleteDoc(doc(db, 'portal_categories', cat.id));
                                          toast.success('Xóa danh mục thành công!');
                                        } catch (err) {
                                          toast.error('Lỗi khi xóa tài liệu danh mục');
                                        }
                                      }
                                    });
                                  }}
                                  className="p-1 px-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 rounded-lg text-xs transition cursor-pointer"
                                >
                                  Xóa
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCatId(null);
                  }}
                  className="px-6 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider transition hover:opacity-90 cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

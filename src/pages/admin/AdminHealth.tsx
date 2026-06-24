import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Heart, Play, Plus, Edit2, Trash2, X, Save, Upload, Link2, 
  Clock, User, Video, Check, RefreshCw, AlertTriangle, ArrowRight
} from 'lucide-react';
import { getGitHubConfig, githubService } from '../../services/githubService';
import toast from 'react-hot-toast';

interface HealthVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration?: string;
  speaker?: string;
  createdAt?: any;
  githubPath?: string;
  githubSha?: string;
}

export default function AdminHealth() {
  const [videos, setVideos] = useState<HealthVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HealthVideo | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [duration, setDuration] = useState('');
  
  // Media source state: 'url' | 'upload'
  const [sourceType, setSourceType] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const q = collection(db, 'health_videos');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HealthVideo));
      setVideos(items);
      setLoading(false);
    }, (error) => {
      console.error("Error setting up real-time listener for health_videos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingVideo(null);
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setSpeaker('');
    setDuration('');
    setSourceType('url');
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (video: HealthVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description);
    setVideoUrl(video.videoUrl);
    setSpeaker(video.speaker || '');
    setDuration(video.duration || '');
    setSourceType('url');
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-extract approximate duration/info or set title if empty
      if (!title) {
        // Strip file extension
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(cleanName.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài giảng');
      return;
    }

    setUploading(true);
    let finalVideoUrl = videoUrl;
    let githubPath = editingVideo?.githubPath || '';
    let githubSha = editingVideo?.githubSha || '';

    try {
      // 1. Check if we need to upload file to GitHub
      if (sourceType === 'upload' && selectedFile) {
        const ghConfig = await getGitHubConfig();
        if (!ghConfig || !ghConfig.token) {
          throw new Error('Chưa cấu hình tài khoản tích hợp GitHub trong Cài đặt hệ thống. Vui lòng sử dụng phương thức liên kết URL hoặc cấu hình GitHub trước.');
        }

        toast.loading('Đang chuẩn bị đẩy tệp lên GitHub...', { id: 'upload-toast' });
        
        // Define directory path inside repo
        const ext = selectedFile.name.split('.').pop() || 'mp4';
        const filename = `health_${Date.now()}.${ext}`;
        const path = `uploads/health/${filename}`;

        const result = await githubService.uploadFile(
          ghConfig,
          selectedFile,
          path,
          `Đăng tải video tập huấn: ${title}`,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        finalVideoUrl = result.url;
        githubPath = result.path;
        githubSha = result.sha;

        toast.success('Tải tệp lên GitHub thành công!', { id: 'upload-toast' });
      }

      if (!finalVideoUrl.trim()) {
        throw new Error('Đường dẫn video (URL) không được để trống');
      }

      // 2. Save/Update record in Firestore
      const docData: any = {
        title,
        description,
        videoUrl: finalVideoUrl,
        speaker: speaker || 'Bộ Y Tế',
        duration: duration || '10:00',
        githubPath,
        githubSha,
        updatedAt: serverTimestamp()
      };

      if (editingVideo) {
        await updateDoc(doc(db, 'health_videos', editingVideo.id), docData);
        toast.success('Đã cập nhật bài giảng thành công!');
      } else {
        docData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'health_videos'), docData);
        toast.success('Đã thêm bài giảng tập huấn sức khỏe thành công!');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu bài giảng', { id: 'upload-toast' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (video: HealthVideo) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài tập huấn "${video.title}" không?`)) {
      return;
    }

    try {
      // Delete document from Firestore
      await deleteDoc(doc(db, 'health_videos', video.id));

      // Attempt to clean up physical file from GitHub if applicable
      if (video.githubPath && video.githubSha) {
        const ghConfig = await getGitHubConfig();
        if (ghConfig && ghConfig.token) {
          try {
            await githubService.deleteFile(ghConfig, video.githubPath, video.githubSha);
            toast.success('Đã giải phóng tệp tin liên kết trên GitHub!');
          } catch (ghErr) {
            console.warn('Could not delete file on GitHub (might have been removed already):', ghErr);
          }
        }
      }

      toast.success('Đã xóa bài giảng thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi xóa bài giảng: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 dark:bg-zinc-900/40 p-6 rounded-3xl border border-slate-200/50 dark:border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" /> Quản lý Sức Khỏe Số & Tập huấn
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Đăng tải và điều phối bài giảng, video tập huấn Sổ sức khỏe điện tử VNeID</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-650 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-black hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" /> THÊM BÀI GIẢNG TẬP HUẤN
        </button>
      </div>

      {/* Grid of existing training content */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div 
              key={video.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/50 dark:border-white/5 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
            >
              
              {/* Thumbnail header and controls */}
              <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-800 dark:text-zinc-800" />
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(video)}
                    className="p-2 rounded-xl bg-white/95 dark:bg-zinc-900 text-blue-600 hover:text-blue-800 hover:bg-white shadow-md active:scale-90 transition-all"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(video)}
                    className="p-2 rounded-xl bg-white/95 dark:bg-zinc-900 text-rose-500 hover:text-rose-700 hover:bg-white shadow-md active:scale-90 transition-all"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 bg-black/75 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" /> Phát bài giảng
                </div>

                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/75 px-2 py-0.5 rounded text-[10px] text-zinc-300 font-mono">
                    {video.duration}
                  </div>
                )}
              </div>

              {/* Text metadata body */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-slate-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {video.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {video.speaker || "Bộ Y Tế"}</span>
                  <span className="text-[10px] text-zinc-500 truncate max-w-[140px] font-mono leading-none">{video.videoUrl}</span>
                </div>
              </div>

            </div>
          ))}

          {videos.length === 0 && (
            <div className="col-span-full bg-slate-50 dark:bg-zinc-950/20 text-center py-20 rounded-3xl border-2 border-dashed border-slate-200/50 dark:border-white/5 space-y-3">
              <Heart className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
              <p className="text-sm font-bold text-slate-400">Chưa có bài tập huấn sức khỏe nào được đăng tải</p>
              <button 
                onClick={openAddModal}
                className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Nhấp vào đây để thêm video đầu tiên <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal addition or editing */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Overlay backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 dark:bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Body card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/60 dark:border-white/10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {editingVideo ? "Cập Nhật Bài Giảng" : "Thêm Bài Giảng Sức Khỏe"}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">SỔ SỨC KHỎE ĐIỆN TỬ VNEID</span>
                </div>

                <button
                  disabled={uploading}
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-805 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Tiêu đề bài tập huấn *</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Hướng dẫn tích hợp Sổ Sức Khỏe vào VNeID"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-slate-800 dark:text-white"
                  />
                </div>

                {/* Speaker & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Người hướng dẫn / Cơ quan</label>
                    <input
                      type="text"
                      placeholder="ví dụ: Bộ Y Tế"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Thời lượng video (mm:ss)</label>
                    <input
                      type="text"
                      placeholder="ví dụ: 12:35"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Mô tả bài giảng</label>
                  <textarea
                    rows={3}
                    placeholder="Tóm tắt ngắn gọn nội dung bài tập huấn y tế..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-slate-800 dark:text-white resize-none"
                  />
                </div>

                <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Nguồn video bài giảng</label>
                    <div className="flex bg-slate-100 dark:bg-zinc-950 p-0.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setSourceType('url')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                          sourceType === 'url' ? 'bg-white dark:bg-zinc-900 shadow-sm text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500'
                        }`}
                      >
                        <Link2 className="w-3 h-3" /> Liên kết URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceType('upload')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                          sourceType === 'upload' ? 'bg-white dark:bg-zinc-900 shadow-sm text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500'
                        }`}
                      >
                        <Upload className="w-3 h-3" /> Đẩy tệp tin
                      </button>
                    </div>
                  </div>

                  {sourceType === 'url' ? (
                    <div className="space-y-1">
                      <input
                        type="url"
                        placeholder="Liên kết Youtube nhúng hoặc MP4 trực tiếp..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-slate-800 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-450 dark:text-zinc-500 leading-normal block pl-1">
                        * Bạn có thể sử dụng link chia sẻ Youtube thông thường. Hệ thống sẽ tự động tối ưu hóa trình phát.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center border-dashed relative">
                        <Upload className="w-8 h-8 text-indigo-500 animate-bounce mb-2" />
                        <span className="text-[11px] font-extrabold text-slate-600 dark:text-zinc-300">Nhấp để đẩy tệp MP4</span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">Tệp tối đa 100MB</span>
                        <input
                          type="file"
                          accept="video/mp4,video/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      
                      {selectedFile && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                          <span className="truncate pr-4 font-bold text-slate-700 dark:text-zinc-300">
                             {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {uploading && uploadProgress > 0 && (
                        <div className="space-y-1">
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 text-right block">
                            Đang tải lên: {uploadProgress}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Warning note if no GitHub integration configured */}
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    * Mọi dữ liệu đăng tải đều được đồng bộ tức thì sang Cổng Người dân. Đảm bảo bản quyền hình ảnh trước khi công khai.
                  </p>
                </div>

                {/* Submit actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button
                    disabled={uploading}
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-xs font-black text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-2xl cursor-pointer"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    disabled={uploading}
                    type="submit"
                    className="flex-1 py-3 text-xs font-black bg-indigo-600 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-black hover:shadow-lg transition-all text-white rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> ĐANG XỬ LÝ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> LƯU THÔNG TIN
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

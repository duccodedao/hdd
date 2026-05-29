import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { githubService } from '../../services/githubService';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  RotateCw, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Check, 
  Sliders, 
  Maximize2, 
  Move, 
  Sparkles, 
  Grid,
  Image as ImageIcon,
  AlertCircle,
  Share2,
  Copy,
  Edit2,
  Database,
  ShieldAlert,
  UploadCloud,
  FileCheck2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AvatarFrame {
  id: string;
  name: string;
  description?: string;
  imageUrl: string; // Original frame overlaid on top (PNG transparent or similar)
  active: boolean;
  githubPath?: string;
  githubSha?: string;
  createdAt: any;
}

interface Point {
  x: number;
  y: number;
}

import { useConfirmStore } from '../../store/confirmStore';
import { useAppStore } from '../../store/appStore';

export default function AvatarFrameManager({ onBack }: { onBack: () => void }) {
  const { webLogo } = useAppStore();
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [frames, setFrames] = useState<AvatarFrame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrame | null>(null);

  // User upload & Adjustment states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [maskType, setMaskType] = useState<'circle' | 'square'>('circle');
  const [flipH, setFlipH] = useState<boolean>(false);

  // Admin upload states
  const [adminFrameFile, setAdminFrameFile] = useState<File | null>(null);
  const [adminFrameName, setAdminFrameName] = useState<string>('');
  const [adminFrameDescription, setAdminFrameDescription] = useState<string>('');
  const [adminUploading, setAdminUploading] = useState<boolean>(false);
  const [backingUp, setBackingUp] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [editingFrame, setEditingFrame] = useState<AvatarFrame | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<Point>({ x: 0, y: 0 });

  // Loaded images for drawing
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [frameImg, setFrameImg] = useState<HTMLImageElement | null>(null);

  // Sync selected frame with search params search queries
  useEffect(() => {
    if (selectedFrame) {
      const currentParam = searchParams.get('frame') || searchParams.get('event');
      if (currentParam !== selectedFrame.id) {
        setSearchParams({ frame: selectedFrame.id }, { replace: true });
      }
    }
  }, [selectedFrame, setSearchParams, searchParams]);

  // Fetch frames
  useEffect(() => {
    const q = query(collection(db, 'avatar_frames'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvatarFrame));
      setFrames(data);
      setLoadingFrames(false);
      
      // Auto-select based on query parameter or fallback
      const targetParamId = searchParams.get('frame') || searchParams.get('event');
      if (data.length > 0) {
        if (targetParamId) {
          const matched = data.find(f => f.id === targetParamId);
          if (matched) {
            setSelectedFrame(matched);
            return;
          }
        }
        
        if (!selectedFrame) {
          const active = data.find(f => f.active);
          if (active) setSelectedFrame(active);
        }
      }
    }, (err) => {
      console.error('Error fetching frames:', err?.message || String(err));
      setLoadingFrames(false);
    });

    return () => unsubscribe();
  }, [selectedFrame, searchParams]);

  const handleStartEditFrame = (frame: AvatarFrame) => {
    setEditingFrame(frame);
    setAdminFrameName(frame.name);
    setAdminFrameDescription(frame.description || '');
    setAdminFrameFile(null); // Optional reset of picked file
  };

  const handleCancelEdit = () => {
    setEditingFrame(null);
    setAdminFrameName('');
    setAdminFrameDescription('');
    setAdminFrameFile(null);
  };

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarSrc(event.target.result as string);
          // Set zoom/offsets back to default
          setScale(1);
          setRotation(0);
          setOffset({ x: 0, y: 0 });
          setFlipH(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert URLs to Image elements
  useEffect(() => {
    if (!avatarSrc) {
      setAvatarImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = avatarSrc;
    img.onload = () => {
      setAvatarImg(img);
    };
    img.onerror = () => {
      console.error('Lỗi khi tải ảnh của bạn');
      toast.error('Không thể xử lý hình ảnh của bạn.');
    };
  }, [avatarSrc]);

  useEffect(() => {
    if (!selectedFrame) {
      setFrameImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedFrame.imageUrl;
    img.onload = () => {
      setFrameImg(img);
    };
    img.onerror = () => {
      console.error('Lỗi khi tải khung');
    };
  }, [selectedFrame]);

  // Draw composition onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw grid background if no avatar loaded, or deep white background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw white or dynamic solid background first
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (avatarImg) {
      ctx.save();
      
      // Apply circular mask if selected
      if (maskType === 'circle') {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      // Translate to center + user offsets
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      // Rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Scale and flips
      ctx.scale(scale * (flipH ? -1 : 1), scale);

      // Draw avatar image centered
      const imgWidth = avatarImg.width;
      const imgHeight = avatarImg.height;
      
      // Fit calculation (cover strategy by default)
      const ratio = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
      const drawWidth = imgWidth * ratio;
      const drawHeight = imgHeight * ratio;

      ctx.drawImage(
        avatarImg, 
        -drawWidth / 2, 
        -drawHeight / 2, 
        drawWidth, 
        drawHeight
      );

      ctx.restore();
    } else {
      // Draw premium grid draft indicator
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 40; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chọn khung và tải ảnh đại diện lên', canvas.width / 2, canvas.height / 2);
    }

    // Always draw Frame on top (always full size square)
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    }

  }, [avatarImg, frameImg, scale, rotation, offset, maskType, flipH]);

  // Drag handlers on preview canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!avatarImg) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !avatarImg) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseEnd = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!avatarImg || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !avatarImg || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  // Pre-populate beautiful default mock templates to Firestore if empty
  const populateDefaultFrames = async () => {
    setLoadingFrames(true);
    try {
      const defaultSamples = [
        {
          name: 'Sắc xuân khởi nghiệp 2026',
          active: true,
          // Premium dynamic frame with round transparent center, blossoms, gold gradient
          imageUrl: createMockFrameSVG('#ff3366', '#ff9933', 'XUÂN TÀI LỘC 2026')
        },
        {
          name: 'Chiến binh đổi mới sáng tạo',
          active: true,
          imageUrl: createMockFrameSVG('#7c3aed', '#3b82f6', 'TECH INNOVATOR')
        },
        {
          name: 'Đoàn Thanh Niên Việt Nam',
          active: true,
          imageUrl: createMockFrameSVG('#2563eb', '#10b981', 'KHÁT VỌNG TUỔI TRẺ')
        }
      ];

      for (const sample of defaultSamples) {
        await addDoc(collection(db, 'avatar_frames'), {
          name: sample.name,
          imageUrl: sample.imageUrl,
          active: sample.active,
          createdAt: serverTimestamp()
        });
      }
      toast.success('Đã tải lên bộ khung mẫu thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải bộ khung mẫu.');
    } finally {
      setLoadingFrames(false);
    }
  };

  // Helper function to create beautiful Base64 frame templates immediately
  const createMockFrameSVG = (color1: string, color2: string, badgeTxt: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
        <!-- Outer Glowing Ring -->
        <rect x="15" y="15" width="470" height="470" rx="235" fill="none" stroke="url(#grad)" stroke-width="24" opacity="0.95" />
        <rect x="25" y="25" width="450" height="450" rx="225" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.8" />
        
        <!-- Star Corner Accents -->
        <path d="M 60,70 L 65,65 L 70,70 L 65,75 Z" fill="${color2}" />
        <path d="M 440,70 L 445,65 L 450,70 L 445,75 Z" fill="${color1}" />
        <circle cx="90" cy="400" r="10" fill="${color1}" opacity="0.7"/>
        <circle cx="410" cy="400" r="12" fill="${color2}" opacity="0.7"/>

        <!-- Premium Bottom Badge Ribbon -->
        <path d="M 120,410 L 380,410 L 360,455 L 140,455 Z" fill="url(#grad)" />
        <path d="M 130,415 L 370,415 L 355,450 L 145,450 Z" fill="#0f172a" />
        
        <!-- Text on Ribbon -->
        <text x="250" y="438" fill="#ffffff" font-family="sans-serif" font-size="15" font-weight="900" letter-spacing="2" text-anchor="middle">
          ${badgeTxt}
        </text>

        <!-- Dynamic Definitions -->
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Download logic
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !avatarImg) {
      toast.error('Vui lòng chọn khung và tải lên hình ảnh của bạn trước!');
      return;
    }

    try {
      // Re-composite directly and trigger download
      const link = document.createElement('a');
      link.download = `avatar_framed_${selectedFrame?.name || 'custom'}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Đã tải ảnh đại diện có khung về máy!');
    } catch (e) {
      console.error(e);
      toast.error('Trình duyệt chặn tải xuống hoặc lỗi Canvas.');
    }
  };

  // ADMIN - Upload new custom frame template using GitHub integration
  const handleAdminFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAdminFrameFile(e.target.files[0]);
    }
  };

  const handleCreateFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFrameName.trim()) {
      toast.error('Vui lòng nhập tên cho khung ảnh này!');
      return;
    }

    if (!editingFrame && !adminFrameFile) {
      toast.error('Vui lòng chọn tệp hình ảnh khung PNG (màu trong suốt)!');
      return;
    }

    setAdminUploading(true);
    try {
      // Fetch GitHub config from github_integration first, then fallback to github configuration if a file has been selected
      let githubConfig: any = null;
      if (adminFrameFile) {
        const configDoc = await getDoc(doc(db, 'settings', 'github_integration'));
        if (configDoc.exists()) {
          githubConfig = configDoc.data();
        }

        if (!githubConfig || !githubConfig.token || !githubConfig.repo) {
          // Fallback to settings/github
          const fallbackDoc = await getDoc(doc(db, 'settings', 'github'));
          if (fallbackDoc.exists()) {
            githubConfig = fallbackDoc.data();
          }
        }

        if (!githubConfig || !githubConfig.token || !githubConfig.repo) {
          throw new Error('Chưa cấu hình kho Repo lưu trữ GitHub (trong Cấu hình Lưu trữ Hình ảnh / API Keys). Vui lòng cấu hình trước!');
        }
      }

      if (editingFrame) {
        // --- EDITING EXISTING FRAME ---
        let updatedFields: any = {
          name: adminFrameName,
          description: adminFrameDescription,
        };

        if (adminFrameFile && githubConfig) {
          const serviceConfig = {
            owner: githubConfig.owner || githubConfig.username,
            repo: githubConfig.repo,
            token: githubConfig.token,
            branch: githubConfig.branch || 'main',
            path: githubConfig.path || 'assets/uploads'
          };

          const fileExt = adminFrameFile.name.split('.').pop()?.toLowerCase() || 'png';
          const cleanEventName = adminFrameName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const uploadPath = `${serviceConfig.path}/avatar_frames/${Date.now()}_${cleanEventName}.${fileExt}`;
          
          toast.loading('Đang upload khung mới lên GitHub Repo...', { id: 'frame_upload' });
          const result = await githubService.uploadFile(serviceConfig, adminFrameFile, uploadPath, `Cập nhật Khung Ảnh Đại Diện: ${adminFrameName}`);
          toast.dismiss('frame_upload');

          updatedFields.imageUrl = result.url;
          updatedFields.githubPath = result.path;
          updatedFields.githubSha = result.sha;

          // Delete old asset in background
          if (editingFrame.githubPath && editingFrame.githubSha) {
            try {
              await githubService.deleteFile(serviceConfig, editingFrame.githubPath, editingFrame.githubSha);
            } catch (delErr) {
              console.warn('Deleting older frame file failed (non-blocking):', delErr);
            }
          }
        }

        await updateDoc(doc(db, 'avatar_frames', editingFrame.id), updatedFields);
        toast.success('Đã cập nhật sự kiện khung ảnh đại diện thành công!');
        
        // Sync matching active frame preview on-the-fly
        if (selectedFrame?.id === editingFrame.id) {
          setSelectedFrame(prev => prev ? { ...prev, ...updatedFields } : null);
        }

        handleCancelEdit();
      } else {
        // --- CREATING NEW FRAME ---
        const serviceConfig = {
          owner: githubConfig.owner || githubConfig.username,
          repo: githubConfig.repo,
          token: githubConfig.token,
          branch: githubConfig.branch || 'main',
          path: githubConfig.path || 'assets/uploads'
        };

        const fileExt = adminFrameFile!.name.split('.').pop()?.toLowerCase() || 'png';
        const cleanEventName = adminFrameName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const uploadPath = `${serviceConfig.path}/avatar_frames/${Date.now()}_${cleanEventName}.${fileExt}`;
        
        toast.loading('Đang upload khung lên GitHub Repo...', { id: 'frame_upload' });
        const result = await githubService.uploadFile(serviceConfig, adminFrameFile!, uploadPath, `Thêm Khung Ảnh Đại Diện: ${adminFrameName}`);
        toast.dismiss('frame_upload');

        await addDoc(collection(db, 'avatar_frames'), {
          name: adminFrameName,
          description: adminFrameDescription,
          imageUrl: result.url,
          githubPath: result.path,
          githubSha: result.sha,
          active: true,
          createdAt: serverTimestamp()
        });

        toast.success('Đã cấu hình & tải thành công khung ảnh đại diện!');
        setAdminFrameName('');
        setAdminFrameDescription('');
        setAdminFrameFile(null);
        
        // Return to editor to see result
        setActiveTab('user');
      }
    } catch (err: any) {
      toast.dismiss('frame_upload');
      console.error(err);
      toast.error(err.message || 'Lỗi khi đồng bộ dữ liệu sự kiện lên hạ tầng');
    } finally {
      setAdminUploading(false);
    }
  };

  // ADMIN - Delete frame with GitHub support
  const handleDeleteFrame = (frame: AvatarFrame) => {
    openConfirm({
      title: 'Xóa khung ảnh đại diện',
      message: `Bạn có thực sự muốn xóa khung thiết kế "${frame.name}"?`,
      confirmText: 'Xóa khung',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'avatar_frames', frame.id));
          
          // If of github, try to delete it live on github Repo
          if (frame.githubPath && frame.githubSha) {
            try {
              const configDoc = await getDoc(doc(db, 'settings', 'github_integration'));
              let githubConfig = configDoc.exists() ? configDoc.data() : null;
              if (!githubConfig || !githubConfig.token) {
                const fallbackDoc = await getDoc(doc(db, 'settings', 'github'));
                if (fallbackDoc.exists()) githubConfig = fallbackDoc.data();
              }

              if (githubConfig && githubConfig.token && githubConfig.repo) {
                const serviceConfig = {
                  owner: githubConfig.owner || githubConfig.username,
                  repo: githubConfig.repo,
                  token: githubConfig.token,
                  branch: githubConfig.branch || 'main',
                  path: githubConfig.path || 'assets/uploads'
                };
                await githubService.deleteFile(serviceConfig, frame.githubPath, frame.githubSha);
              }
            } catch (githubErr) {
              console.warn('Could not delete from GitHub (might be already deleted or config missing):', githubErr);
            }
          }

          toast.success('Đã xóa khung ảnh đại diện!');
          if (selectedFrame?.id === frame.id) {
            setSelectedFrame(null);
          }
        } catch (e: any) {
          console.error('Delete Event Error:', e?.message || String(e));
          toast.error(e.message || 'Lỗi khi xóa khung');
        }
      }
    });
  };

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-zinc-950 min-h-screen py-10 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5"
            >
              <ArrowLeft className="w-4 h-4" /> Quay Lại
            </button>
            <div>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-200/20">Tiện ích chỉnh sửa</span>
              <h1 className="text-3xl font-bold dark:text-white mt-1">Khung Ảnh Đại Diện</h1>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl self-start md:self-auto">
            <button 
              onClick={() => setActiveTab('user')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'user' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xl shadow-slate-900/5' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200'}`}
            >
              Cá nhân hóa
            </button>
            {(isAdmin || isSuperAdmin) && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200'}`}
              >
                Quản lý Khung (Admins)
              </button>
            )}
          </div>
        </div>

        {/* Outer Tab render content */}
        {activeTab === 'admin' && (isAdmin || isSuperAdmin) ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (col-span-1) holding Form and Backup modules */}
            <div className="space-y-6 lg:col-span-1">
              {/* Create / Edit form */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-8 rounded-3xl space-y-6">
                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  {editingFrame ? (
                    <>
                      <Edit2 className="w-5 h-5 text-blue-500" /> Chỉnh Sửa Sự Kiện
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-purple-500" /> Thêm Khung Mới
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingFrame 
                    ? "Chỉnh sửa thông tin chi tiết sự kiện chiến dịch. Bạn có thể giữ tệp khung ảnh hiện tại bằng cách để trống ô chọn tệp." 
                    : "Khung ảnh của bạn nên là hình vuông và có phần trung tâm trong suốt (PNG) để avatar người dùng có thể hiển thị bên dưới."}
                </p>
                
                <form onSubmit={handleCreateFrame} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Tên sự kiện / Khung ảnh</label>
                    <input 
                      type="text"
                      value={adminFrameName}
                      onChange={(e) => setAdminFrameName(e.target.value)}
                      placeholder="Ví dụ: Chiến sĩ trẻ 26, Happy New Year..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Mô tả sự kiện</label>
                    <textarea 
                      value={adminFrameDescription}
                      onChange={(e) => setAdminFrameDescription(e.target.value)}
                      placeholder="Nhập mô tả về sự kiện/chiến dịch này..."
                      rows={3}
                      className="w-full px-4 text-xs py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Chọn tệp khung thiết kế (PNG, SVG) {editingFrame && <span className="text-slate-400 font-normal">(Tùy chọn)</span>}
                    </label>
                    <label className="w-full h-40 border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-purple-400 cursor-pointer rounded-2xl flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-800 transition">
                      <input type="file" accept="image/png, image/svg+xml" onChange={handleAdminFrameUpload} className="hidden" />
                      {adminFrameFile ? (
                        <div className="text-center">
                          <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <span className="text-sm font-bold block truncate max-w-[200px]">{adminFrameFile.name}</span>
                          <span className="text-xs text-slate-400">#{(adminFrameFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ) : editingFrame ? (
                        <div className="text-center text-slate-400">
                          <Upload className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-400" />
                          <span className="text-xs block mt-1 opacity-80 decoration-dotted">Kéo thả tệp mới nếu muốn thay hế hình ảnh gốc</span>
                          <span className="text-[10px] block font-mono mt-1 text-slate-500">{editingFrame.name}</span>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400">
                          <Upload className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <span className="text-sm font-semibold">Tải lên template khung ảnh</span>
                          <span className="text-xs block mt-1 opacity-60">Khuyên dùng nền trong suốt</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="flex gap-2">
                    {editingFrame && (
                      <button 
                        type="button"
                        onClick={handleCancelEdit}
                        className="w-1/3 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition active:scale-95 text-xs text-center"
                      >
                        Bỏ qua
                      </button>
                    )}
                    <button 
                      type="submit"
                      disabled={adminUploading}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 shadow-xl shadow-purple-500/10 flex items-center justify-center gap-2 text-xs"
                    >
                      {adminUploading ? (
                        <motion.img 
                          src={webLogo || "https://tytpht.hdd.io.vn/img/bmassloadings.png"}
                          alt="..."
                          className="w-4 h-4 object-contain"
                          animate={{ scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                          referrerPolicy="no-referrer"
                        />
                      ) : <Check className="w-4 h-4" />}
                      {editingFrame ? "Cập Nhật Sự Kiện" : "Lưu Khung Thiết Kế"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Existing lists */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-8 rounded-3xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-purple-500" /> Danh sách Khung Đã Tạo
                </h2>
                <span className="text-xs font-bold text-slate-400">{frames.length} mẫu</span>
              </div>

              {frames.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium mb-4">Chưa có khung ảnh đại diện nào được thiết lập.</p>
                  <button onClick={populateDefaultFrames} className="px-5 py-2.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl font-bold text-xs hover:bg-purple-100 transition inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Tải 3 mẫu cơ bản có sẵn
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {frames.map((frame) => (
                    <div key={frame.id} className="group relative bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between items-center text-center hover:shadow-xl hover:shadow-purple-500/5 transition">
                      
                      <div className="flex flex-col items-center w-full">
                        <div className="w-24 h-24 bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-inner flex items-center justify-center relative border border-slate-100 dark:border-white/5 mb-4 p-2">
                          <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                        </div>

                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full block mb-1">{frame.name}</span>
                        {frame.description && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-snug italic px-1">{frame.description}</p>
                        )}
                      </div>
                      
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleStartEditFrame(frame)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 hover:dark:bg-blue-500/20 text-blue-600 rounded-lg transition"
                          title="Chỉnh sửa chi tiết"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteFrame(frame)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 hover:dark:bg-rose-500/20 text-rose-600 rounded-lg transition"
                          title="Xóa khung"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: INTERACTIVE CANVAS EDITOR (7cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-6 lg:p-8 rounded-3xl flex flex-col items-center">
              
              <div className="w-full max-w-md aspect-square relative bg-slate-100 dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-xl shadow-purple-900/5 group border border-slate-200 dark:border-white/5">
                {/* Drag info badge overlay */}
                {avatarImg && (
                  <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] text-white/90 font-bold uppercase tracking-widest leading-none pointer-events-none transition group-hover:opacity-100 duration-200">
                    <Move className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                    Kéo để di chuyển vị trí ảnh
                  </div>
                )}
                
                {/* HTML5 drawing CANVAS */}
                <canvas 
                  ref={canvasRef}
                  width={1024}
                  height={1024}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseEnd}
                  onMouseLeave={handleMouseEnd}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseEnd}
                  className={`w-full h-full cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
                />
              </div>

              {/* Adjustments control panel */}
              {avatarImg && (
                <div className="w-full max-w-md mt-6 space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-purple-500" /> Điều chỉnh ảnh đại diện
                    </span>
                    <button 
                      onClick={() => {
                        setScale(1);
                        setRotation(0);
                        setOffset({ x: 0, y: 0 });
                        setFlipH(false);
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Khôi phục ban đầu
                    </button>
                  </div>

                  {/* Zoom controller */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Thu / Phóng ảnh (Zoom)</span>
                      <span>{Math.round(scale * 100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Rotation controller */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Xoay ảnh (Rotation)</span>
                      <span>{rotation}°</span>
                    </div>
                    <input 
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      className="w-full accent-purple-500 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Control buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => setFlipH(prev => !prev)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-white/5 active:scale-95 ${flipH ? 'bg-purple-50 text-purple-600 border-purple-200/40 dark:bg-purple-500/10' : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300'}`}
                    >
                      Xoay lật ngang (Mirror)
                    </button>

                    <button 
                      onClick={() => setMaskType(prev => prev === 'circle' ? 'square' : 'circle')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-95"
                    >
                      Bo tròn: {maskType === 'circle' ? 'Có' : 'Không (Vuông)'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: FRAME BROWSER & ACTIONS (5cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Profile Image input section */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl">
                <h3 className="text-md font-bold dark:text-white mb-4">Bước 1: Tải ảnh của bạn</h3>
                
                <label className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-purple-400 cursor-pointer rounded-2xl flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-800 transition">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
                  {avatarFile ? (
                    <div className="text-center">
                      <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <span className="text-sm font-bold block truncate max-w-[200px]">{avatarFile.name}</span>
                      <span className="text-xs text-slate-400">#{(avatarFile.size / 1024).toFixed(1)} KB</span>
                      <span className="text-xs text-purple-600 block mt-2 font-semibold">Nhấn để thay đổi ảnh khác</span>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400">
                      <Upload className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tải ảnh đại diện</span>
                      <span className="text-xs block mt-1 opacity-60">Chấp nhận JPG, PNG, WEBP</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Browse Frames section */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <h3 className="text-sm font-bold dark:text-white">Bước 2: Chọn mẫu khung chiến dịch</h3>
                  <span className="text-xs font-bold text-slate-400">{frames.length} mẫu</span>
                </div>

                {loadingFrames ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-xs text-slate-400">
                    <motion.div
                      animate={{ scale: [0.85, 1.15, 0.85] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-12 h-12 flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-white/5"
                    >
                      <img 
                        src={webLogo || "https://tytpht.hdd.io.vn/img/bmassloadings.png"} 
                        alt="Loading" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                    <span className="animate-pulse font-medium">Đang tải danh sách sự kiện...</span>
                  </div>
                ) : frames.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <p className="text-xs text-slate-500">Chưa có khung nào được tạo bởi Admin.</p>
                    {(isAdmin || isSuperAdmin) && (
                      <button onClick={populateDefaultFrames} className="px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl font-bold text-xs hover:bg-purple-100 transition inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Tạo khung mẫu nhanh
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[250px] pr-1 scrollbar-thin">
                    {frames.map((frame) => {
                      const isSelected = selectedFrame?.id === frame.id;
                      return (
                        <button 
                          key={frame.id}
                          onClick={() => setSelectedFrame(frame)}
                          className={`group relative text-left bg-slate-50 dark:bg-white/5 border rounded-2xl p-2.5 flex flex-col items-center hover:scale-105 transition active:scale-95 ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-slate-200 dark:border-white/5'}`}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5 z-10">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center p-1.5 border border-slate-100 dark:border-white/5 mb-2 shadow-inner">
                            <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-200 block text-center truncate max-w-full leading-snug">{frame.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Frame Event details & Share link */}
              {selectedFrame && (
                <div className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5 dark:from-purple-500/10 dark:to-indigo-500/10 border border-purple-100 dark:border-purple-500/20 p-5 rounded-3xl space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/20 px-2.5 py-1 rounded-md border border-purple-200/20">Sự kiện kích hoạt</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-1">{selectedFrame.name}</h4>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/utilities/avatar-frame?frame=${selectedFrame.id}`;
                        navigator.clipboard.writeText(shareUrl);
                        toast.success('Đã sao chép link chia sẻ sự kiện này!', { icon: '🔗' });
                      }}
                      className="px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-purple-600 dark:text-purple-400 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm transition-all font-bold text-xs flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                      title="Sao chép liên kết chia sẻ sự kiện này cho người khác"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Sao chép link
                    </button>
                  </div>
                  
                  {selectedFrame.description && (
                    <p className="text-xs text-slate-500 dark:text-zinc-405 italic leading-relaxed border-t border-purple-100/30 dark:border-purple-500/10 pt-3">
                      {selectedFrame.description}
                    </p>
                  )}
                </div>
              )}

              {/* Result Download and Action */}
              <button 
                onClick={handleDownload}
                disabled={!avatarImg || !selectedFrame}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-3xl transition duration-200 shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2 text-md"
              >
                <Download className="w-5 h-5" /> Tải Ảnh Đại Diện Về Máy
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  File, 
  FolderOpen, 
  Search, 
  RefreshCw, 
  Download, 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  Lock, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  FileCode2, 
  Image, 
  FileText, 
  ChevronLeft, 
  Github, 
  GitBranch, 
  Check, 
  BookOpen, 
  Sparkles, 
  Laptop,
  AlertCircle,
  Eye,
  Activity,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';

interface PersonalFileManagerProps {
  onBack: () => void;
}

interface GitFileNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export default function PersonalFileManager({ onBack }: PersonalFileManagerProps) {
  const { user, userData } = useAuthStore();
  
  // Storage of configuration
  const [githubConfig, setGithubConfig] = useState({
    username: '',
    repo: '',
    token: '',
    branch: 'main',
  });
  
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<GitFileNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  
  // Custom folder navigation state
  const [currentPath, setCurrentPath] = useState<string>(''); // empty means root
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Current file presentation state
  const [selectedFile, setSelectedFile] = useState<GitFileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Load configuration from global settings
  useEffect(() => {
    const fetchConfig = async () => {
      const snap = await getDoc(doc(db, 'settings', 'system'));
      if (snap.exists()) {
        const data = snap.data();
        const globalConfig = data.githubGlobalConfig || {};
        const config = data.fileManagerConfig || {};
        const validConfig = {
          username: config.username || globalConfig.username || '',
          repo: config.repo || '',
          token: config.token || globalConfig.token || '',
          branch: config.branch || 'main',
        };
        setGithubConfig(validConfig);
      }
      setConfigLoaded(true);
    };
    fetchConfig();
  }, []);

  // Fetch file list from GitHub
  const fetchRepositoryFiles = async () => {
    if (!githubConfig.username || !githubConfig.repo) {
      return;
    }

    setLoadingFiles(true);
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (githubConfig.token) {
        headers['Authorization'] = `token ${githubConfig.token}`;
      }

      // 1. First verify default branch if target branch is vacant or fails
      const repoUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}`;
      const repoRes = await fetch(repoUrl, { headers });
      
      let targetBranch = githubConfig.branch || 'main';
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        targetBranch = githubConfig.branch || repoData.default_branch || 'main';
      }

      // 2. Query recursive tree
      const treeUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/git/trees/${targetBranch}?recursive=1`;
      const response = await fetch(treeUrl, { headers });

      if (!response.ok) {
        throw new Error(`Git API Error (HTTP ${response.status})`);
      }

      const resData = await response.json();
      if (resData && Array.isArray(resData.tree)) {
        setFiles(resData.tree);
        toast.success(`Đã quét xong: Tìm thấy ${resData.tree.length} mục!`, {
          icon: '⚙️',
          style: {
            borderRadius: '12px',
            background: '#1a1a1b',
            color: '#fff',
          }
        });
      } else {
        throw new Error("Không nhận dạng được định dạng dữ liệu cây thư mục");
      }
    } catch (error: any) {
      console.error("Lỗi lấy tệp từ GitHub:", error);
      toast.error(`Không thể quét repository: ${error.message || 'Lỗi mạng'}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (githubConfig.username && githubConfig.repo && configLoaded) {
      fetchRepositoryFiles();
    }
  }, [githubConfig.username, githubConfig.repo, githubConfig.branch, configLoaded]);

  // Decode content securely supporting UTF-8
  const decodeBase64Utf8 = (str: string) => {
    try {
      return decodeURIComponent(escape(window.atob(str)));
    } catch {
      try {
        const binaryString = window.atob(str);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
      } catch {
        return window.atob(str);
      }
    }
  };

  // Fetch individual file contents
  const handleOpenFile = async (fileNode: GitFileNode) => {
    setSelectedFile(fileNode);
    setFileContent('');
    setLoadingContent(true);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (githubConfig.token) {
        headers['Authorization'] = `token ${githubConfig.token}`;
      }

      const fileUrl = `https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/${encodeURIComponent(fileNode.path)}?ref=${githubConfig.branch || 'main'}`;
      const response = await fetch(fileUrl, { headers });

      if (!response.ok) {
        throw new Error(`Lỗi tải tệp (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.encoding === 'base64') {
        const decoded = decodeBase64Utf8(data.content.replace(/\s/g, ''));
        setFileContent(decoded);
      } else {
        setFileContent(data.content || '');
      }
    } catch (error: any) {
      console.error("Lỗi khi nạp tệp cụ thể:", error);
      toast.error(`Lỗi nạp tệp: ${error.message || 'Không thể tải'}`);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleCopyContent = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setIsCopied(true);
    toast.success('Đã sao chép nội dung vào khay nhớ tạm!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadContent = () => {
    if (!selectedFile) return;
    try {
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.path.split('/').pop() || 'download';
      link.click();
      toast.success('Đã bắt đầu tải file!');
    } catch (err) {
      toast.error('Không thể tạo tệp tải xuống');
    }
  };

  // Compute folder levels and directory lists based on file node lists
  const folderStructure = useMemo(() => {
    const rootItems: GitFileNode[] = [];
    const directChildRecords: Record<string, Set<string>> = {}; 
    const treeStructure: Record<string, { files: GitFileNode[], folders: string[] }> = {};

    // Initialize root path
    treeStructure[''] = { files: [], folders: [] };

    files.forEach(node => {
      const parts = node.path.split('/');
      
      if (parts.length === 1) {
        if (node.type === 'blob') {
          treeStructure[''].files.push(node);
        } else {
          if (!treeStructure[''].folders.includes(parts[0])) {
            treeStructure[''].folders.push(parts[0]);
          }
        }
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const currentName = parts[parts.length - 1];
        
        if (!treeStructure[parentPath]) {
          treeStructure[parentPath] = { files: [], folders: [] };
        }

        if (node.type === 'blob') {
          treeStructure[parentPath].files.push(node);
        } else {
          if (!treeStructure[parentPath].folders.includes(node.path)) {
            treeStructure[parentPath].folders.push(node.path);
          }
        }

        // Add parent back-folders to their parents recursively
        for (let i = 0; i < parts.length - 1; i++) {
          const ancestorPath = parts.slice(0, i).join('/');
          const relativeFolder = parts.slice(0, i + 1).join('/');
          
          if (!treeStructure[ancestorPath]) {
            treeStructure[ancestorPath] = { files: [], folders: [] };
          }
          if (!treeStructure[ancestorPath].folders.includes(relativeFolder)) {
            treeStructure[ancestorPath].folders.push(relativeFolder);
          }
        }
      }
    });

    return treeStructure;
  }, [files]);

  // Handle flat searching filtering
  const filteredFlatFiles = useMemo(() => {
    if (!searchQuery) return files.filter(f => f.type === 'blob');
    const query = searchQuery.toLowerCase();
    return files.filter(f => f.type === 'blob' && f.path.toLowerCase().includes(query));
  }, [files, searchQuery]);

  // Compute stats
  const totalFilesCount = files.filter(f => f.type === 'blob').length;
  const totalFoldersCount = files.filter(f => f.type === 'tree').length;

  const currentLevelData = folderStructure[currentPath] || { files: [], folders: [] };

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'md':
        return <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />;
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'py':
      case 'cpp':
      case 'java':
      case 'go':
      case 'html':
      case 'css':
      case 'json':
      case 'sh':
      case 'yml':
      case 'yaml':
        return <FileCode2 className="w-4 h-4 text-indigo-500 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const isSelectedFileImage = useMemo(() => {
    if (!selectedFile) return false;
    const ext = selectedFile.path.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
  }, [selectedFile]);

  const imageUrl = useMemo(() => {
    if (!selectedFile || !isSelectedFileImage) return '';
    return `https://raw.githubusercontent.com/${githubConfig.username}/${githubConfig.repo}/${githubConfig.branch}/${selectedFile.path}`;
  }, [selectedFile, isSelectedFileImage, githubConfig]);

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-8 relative animate-fade-in text-slate-800 dark:text-zinc-200">
      
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5 group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay Lại
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-300 dark:text-zinc-700">/</span>
            <Laptop className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-900 dark:text-white text-md">Quản Lý File Cá Nhân</span>
            <span className="text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-full text-indigo-600 dark:text-indigo-400 font-mono">
              Desktop Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchRepositoryFiles} 
            disabled={loadingFiles || !githubConfig.username}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-zinc-900 hover:bg-slate-50 transition-all flex items-center gap-2 text-xs font-bold"
            title="Làm mới kho lưu trữ"
          >
            <RefreshCw className={cn("w-4 h-4", loadingFiles && "animate-spin")} />
            <span>Quét Lại</span>
          </button>
        </div>
      </div>

      {/* Connection Check Banner */}
      {(!githubConfig.username || !githubConfig.repo) && (
        <div className="premium-card bg-amber-500/10 border-amber-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Chưa cài đặt cấu hình Quản lý File</h4>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mt-1">
                Vui lòng đợi Quản trị viên (Admin) thiết lập kho dữ liệu GitHub trong phần Trung tâm Quản trị.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Area Split View (Portable Computer Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-[600px] h-full">

        {/* Left Side Navigation (File System & Tree) */}
        <div className="lg:col-span-4 flex flex-col premium-card p-4 min-h-[450px] lg:h-[calc(100vh-230px)] bg-slate-50 dark:bg-black/10 overflow-hidden ring-1 ring-slate-100 dark:ring-white/5 rounded-3xl">
          
          {/* Header Specs */}
          <div className="pb-4 mb-4 border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                <Github size={14} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">GitHub Repo</span>
                <span className="text-xs font-black text-slate-800 dark:text-zinc-200 select-all truncate">
                  {githubConfig.username ? `${githubConfig.username}/${githubConfig.repo}` : 'Chưa cấu hình'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1">
              <div className="flex items-center gap-1">
                <GitBranch size={10} className="text-slate-400" />
                <span className="font-mono">{githubConfig.branch || 'main'}</span>
              </div>
              <div className="flex gap-2">
                <span><b>{totalFilesCount}</b> tệp</span>
                <span>•</span>
                <span><b>{totalFoldersCount}</b> Thư mục</span>
              </div>
            </div>

            {/* Quick search */}
            <div className="relative mt-3">
              <input 
                type="text" 
                placeholder="Tìm nhanh tệp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Xoá
                </button>
              )}
            </div>

            {/* Navigation Tab selection */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-0.5 mt-2">
              <button 
                onClick={() => setViewMode('tree')}
                className={cn(
                  "py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-all",
                  viewMode === 'tree' ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Cây Thư Mục
              </button>
              <button 
                onClick={() => setViewMode('flat')}
                className={cn(
                  "py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-all",
                  viewMode === 'flat' ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Tất cả tệp ({totalFilesCount})
              </button>
            </div>
          </div>

          {/* Files / Folder contents container with customized styling */}
          <div className="flex-1 overflow-y-auto max-h-[500px] lg:max-h-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-800 pr-1 select-none space-y-1.5">
            {loadingFiles ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Đang nạp cấu trúc cây tệp...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 gap-2">
                <FileText size={32} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest mt-1">Trống rỗng</p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">Hãy đảm bảo cấu hình chính xác có mã token để truy xuất tệp.</p>
              </div>
            ) : viewMode === 'tree' ? (
              /* Tree Hierarchical View */
              <div className="space-y-1">
                {/* Back button for folder hierarchy if not at root */}
                {currentPath && (
                  <button 
                    onClick={() => {
                      const idx = currentPath.lastIndexOf('/');
                      setCurrentPath(idx === -1 ? '' : currentPath.substring(0, idx));
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <span>Quay lại thư mục cha</span>
                  </button>
                )}

                {/* Sub directories inside current path */}
                {currentLevelData.folders.map(folderPath => {
                  const name = folderPath.split('/').pop() || folderPath;
                  return (
                    <div 
                      key={folderPath}
                      onClick={() => setCurrentPath(folderPath)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-500/5 dark:hover:bg-indigo-500/5 hover:-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-bold text-slate-700 dark:text-zinc-300 truncate">{name}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })}

                {/* Files in currently selected directory */}
                {currentLevelData.files.map(fileNode => {
                  const isSelected = selectedFile?.path === fileNode.path;
                  const name = fileNode.path.split('/').pop() || fileNode.path;
                  return (
                    <div 
                      key={fileNode.path}
                      onClick={() => handleOpenFile(fileNode)}
                      className={cn(
                        "flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-xs cursor-pointer border",
                        isSelected 
                          ? "bg-slate-100 dark:bg-indigo-500/20 border-slate-300 dark:border-indigo-500/30 font-bold" 
                          : "border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {getFileIcon(fileNode.path)}
                      <span className="truncate flex-1">{name}</span>
                    </div>
                  );
                })}

                {currentLevelData.folders.length === 0 && currentLevelData.files.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-10 italic">Thư mục trống</p>
                )}
              </div>
            ) : (
              /* Flat Search view of all file paths */
              <div className="space-y-1">
                {filteredFlatFiles.map(fileNode => {
                  const isSelected = selectedFile?.path === fileNode.path;
                  return (
                    <div 
                      key={fileNode.path}
                      onClick={() => handleOpenFile(fileNode)}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-xl transition-all text-xs cursor-pointer border",
                        isSelected 
                          ? "bg-slate-100 dark:bg-indigo-500/20 border-slate-300 dark:border-indigo-500/30 font-bold" 
                          : "border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {getFileIcon(fileNode.path)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold truncate text-slate-800 dark:text-zinc-200">
                          {fileNode.path.split('/').pop()}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 truncate mt-0.5" title={fileNode.path}>
                          {fileNode.path}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredFlatFiles.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-10 italic">Không tìm thấy tệp trùng khớp</p>
                )}
              </div>
            )}
          </div>

          {/* Hierarchy Breadcrumbs Path */}
          {viewMode === 'tree' && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Thư mục hiện hành</span>
              <div className="flex items-center flex-wrap gap-1 text-[11px] font-mono bg-slate-100 dark:bg-white/5 p-2 rounded-xl mt-1 overflow-x-auto truncate">
                <span 
                  onClick={() => setCurrentPath('')}
                  className={cn("cursor-pointer hover:underline text-slate-500 dark:text-zinc-500", !currentPath && "text-blue-600 dark:text-white font-bold")}
                >
                  root
                </span>
                {currentPath.split('/').filter(Boolean).map((part, i, arr) => {
                  const pathUptoThis = arr.slice(0, i + 1).join('/');
                  return (
                    <React.Fragment key={pathUptoThis}>
                      <span className="text-slate-300 dark:text-zinc-700">/</span>
                      <span 
                        onClick={() => setCurrentPath(pathUptoThis)}
                        className={cn(
                          "cursor-pointer hover:underline text-slate-500 dark:text-zinc-500", 
                          currentPath === pathUptoThis && "text-blue-600 dark:text-white font-bold"
                        )}
                      >
                        {part}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side File Viewer Pane */}
        <div className={cn(
          "flex flex-col premium-card p-0 overflow-hidden border border-slate-200 dark:border-white/10 rounded-3xl min-h-[500px] transition-all duration-300",
          isFullscreen 
            ? "fixed inset-0 z-[100] bg-zinc-950 p-0 m-0 w-screen h-screen rounded-none" 
            : "lg:col-span-8 bg-white dark:bg-white/5"
        )}>
          {selectedFile ? (
            <div className={cn("flex flex-col h-full", !isFullscreen && "lg:h-[calc(100vh-230px)]")}>
              
              {/* File Meta Bar */}
              <div className="p-4 bg-slate-50/80 dark:bg-black/40 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 shrink-0">
                    {getFileIcon(selectedFile.path)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white text-ellipsis overflow-hidden">
                      {selectedFile.path.split('/').pop()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 break-all select-all">
                      {selectedFile.path}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                  {/* File actions */}
                  <button 
                    onClick={handleCopyContent}
                    disabled={loadingContent || isSelectedFileImage}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-850 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 hover:shadow-xs transition-all text-xs font-bold disabled:opacity-30"
                    title="Sao chép nội dung"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={handleDownloadContent}
                    disabled={loadingContent || isSelectedFileImage}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-850 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 hover:shadow-xs transition-all text-xs font-bold disabled:opacity-30"
                    title="Tải xuống tệp nội bộ"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <a 
                    href={`https://github.com/${githubConfig.username}/${githubConfig.repo}/blob/${githubConfig.branch || 'main'}/${selectedFile.path}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-white/5 hover:shadow-xs transition-all text-xs font-bold"
                    title="Mở trên GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-white/5 hover:shadow-xs transition-all text-xs font-bold"
                    title={isFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4 text-rose-500" /> : <Maximize2 className="w-4 h-4 text-indigo-500" />}
                  </button>
                </div>
              </div>

              {/* Viewport Content */}
              <div className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-6 text-sm relative scrollbar-thin scrollbar-thumb-zinc-800 font-mono text-zinc-100">
                {loadingContent ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 z-20">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-xs text-zinc-400 font-medium font-mono">Loading data packet from repository...</p>
                  </div>
                ) : isSelectedFileImage ? (
                  /* Image Panel */
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-white/5 rounded-2xl h-full min-h-[350px]">
                    <img 
                      src={imageUrl} 
                      alt={selectedFile.path} 
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-[400px] object-contain rounded-xl shadow-2xl bg-zinc-950 ring-1 ring-white/10"
                      onError={() => toast.error("Không thể hiển thị hình ảnh từ domain này")}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-xs text-zinc-400 font-mono italic">Raw Source Link:</p>
                      <a href={imageUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 underline break-all mt-1 inline-block">
                        {imageUrl}
                      </a>
                    </div>
                  </div>
                ) : selectedFile.path.endsWith('.md') ? (
                  /* Markdown styling integration */
                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 text-zinc-300 overflow-x-auto min-h-full">
                    <div className="prose dark:prose-invert prose-headings:font-sans prose-headings:font-bold prose-headings:text-white prose-a:text-indigo-400 max-w-none text-xs md:text-sm leading-relaxed">
                      <ReactMarkdown>{fileContent || '*Tệp rỗng hoặc không có nội dung thích hợp*'}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  /* Regular code shell with lines counting */
                  <div className="flex bg-slate-900 border border-thin border-white/5 rounded-2xl p-4 md:p-6 font-mono text-[11px] md:text-xs text-indigo-100 overflow-x-auto min-h-full h-fit">
                    {/* Line counts indicator */}
                    <div className="select-none text-right pr-4 border-r border-white/10 text-zinc-650 sticky left-0 bg-slate-900 mr-4 shrink-0 font-light">
                      {(fileContent || ' ').split('\n').map((_, index) => (
                        <div key={index}>{index + 1}</div>
                      ))}
                    </div>
                    {/* Code screen */}
                    <pre className="flex-1 focus:outline-none select-text whitespace-pre overflow-x-auto text-left leading-relaxed text-zinc-200">
                      <code>{fileContent || '// Tệp không chứa nội dung hoặc rỗng'}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Status byte footer bar */}
              <div className="px-6 py-2 bg-slate-50 dark:bg-black/60 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <Activity size={10} className="text-emerald-500 animate-pulse" />
                  <span>Trạng thái tệp: Đã tải tốt</span>
                </div>
                <div>
                  <span>Kích thước tệp: {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'N/A'}</span>
                </div>
              </div>

            </div>
          ) : (
            /* Blank screen guide */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 py-32 lg:h-[calc(100vh-230px)] bg-slate-50/50 dark:bg-transparent">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-6 border border-slate-200 dark:border-white/10">
                <Terminal size={40} className="stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-display">Chưa Chọn Tệp Tin</h3>
              <p className="text-sm text-slate-550 dark:text-zinc-400 max-w-sm">
                Nhấp chuột vào bất kỳ tệp tin nào ở khung cây thư mục trái để kích hoạt màn hình xem trước và các công cụ thực thi.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

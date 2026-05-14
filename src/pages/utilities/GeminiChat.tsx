import React, { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { 
  Send, 
  Bot, 
  User, 
  Settings2, 
  Loader2, 
  Trash2, 
  KeyRound, 
  Sparkles, 
  Code2, 
  FileText, 
  Plus, 
  Copy, 
  Check, 
  MessageSquare,
  History,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  ChevronDown,
  Mic,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Edit3,
  Search,
  ArrowLeft,
  Pin,
  ExternalLink as LinkIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import AppLogo from '../../components/ui/AppLogo';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  responseTime?: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  selectedModel: string;
  createdAt: number;
  isPinned?: boolean;
}

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (AI 5.1)', status: 'Active' },
  { id: 'gemini-1.5-flash-latest', name: 'Bmass AI 5.0 (Default)', status: 'Active' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Max)', status: 'Active' },
  { id: 'bmass-ai-5-pro', name: 'Bmass AI 5.0 Pro (Standard)', status: 'Active' },
  { id: 'bmass-ai-6-ultra', name: 'Bmass AI 6.0 Ultra (Enterprise)', status: 'Premium' },
  { id: 'bmass-ai-pro', name: 'Bmass AI Pro (Specialized)', status: 'Premium' },
  { id: 'gpt-4o', name: 'GPT-4o (Omni)', status: 'Premium' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', status: 'Premium' },
  { id: 'deepseek-v3', name: 'DeepSeek V3 (Reasoning)', status: 'Premium' },
  { id: 'llama-3.1-405b', name: 'Llama 3.1 405B (Ultra)', status: 'Premium' },
  { id: 'o1-preview', name: 'OpenAI o1-preview', status: 'Coming Soon' },
  { id: 'gpt-5-early', name: 'GPT-5 (Experimental)', status: 'Coming Soon' },
] as const;


import { useParams } from 'react-router-dom';

export default function GeminiChat() {
  const { user, isSuperAdmin } = useAuthStore();
  const { sessionId } = useParams();
  
  // Session Management
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('bmass_ai_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all sessions have isPinned property
        return parsed.map((s: any) => ({ ...s, isPinned: s.isPinned || false }));
      }
      
      const initialSession: ChatSession = {
        id: 'default',
        title: 'Cuộc trò chuyện mới',
        messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Bmass AI 5.0. Hệ thống hỗ trợ định danh BMASS. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
        selectedModel: 'gemini-3-flash-preview',
        createdAt: Date.now(),
        isPinned: false
      };
      return [initialSession];
    } catch (e) {
      return [{
        id: 'default',
        title: 'Cuộc trò chuyện mới',
        messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Bmass AI 5.0. Hệ thống hỗ trợ định danh BMASS. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
        selectedModel: 'gemini-3-flash-preview',
        createdAt: Date.now(),
        isPinned: false
      }];
    }
  });

  const togglePinSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
    toast.success('Đã cập nhật ghim');
  };

  const copySessionLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/utilities/chat/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã sao chép liên kết đoạn chat');
  };

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return localStorage.getItem('bmass_ai_current_session') || 'default';
  });

  useEffect(() => {
    if (sessionId && sessions.some(s => s.id === sessionId)) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId, sessions]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  const [checkingKey, setCheckingKey] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [isUsingSecondaryKey, setIsUsingSecondaryKey] = useState(false);
  const [userSecondaryKeyInfo, setUserSecondaryKeyInfo] = useState<{
    status: string;
    lastUsedAt?: any;
    lastError?: string;
  } | null>(null);

  const UPGRADE_URL = "https://one.google.com/ai?g1_last_touchpoint=62&g1_landing_page=75&utm_source=gemini&utm_medium=web&utm_campaign=gemini_ail_upsell_zero_state_banner";

  const handleUpgrade = () => {
    window.open(UPGRADE_URL, '_blank');
  };

  // Timer logic
  useEffect(() => {
    if (isLoading) {
      setResponseTime(0);
      timerRef.current = setInterval(() => {
        setResponseTime(prev => prev + 0.1);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;
  const selectedModel = currentSession.selectedModel;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const SUGGESTED_PROMPTS = [
    { title: 'Sáng tạo nội dung', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', prompts: ['Viết bài Facebook giới thiệu hệ thống BMASS', 'Lên ý tưởng kịch bản video giới thiệu dịch vụ', 'Viết email thông báo bảo trì hệ thống'] },
    { title: 'Kỹ thuật & Vận hành', icon: Code2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', prompts: ['Giải thích cách vận hành hệ thống định danh', 'Hướng dẫn sử dụng API BMASS Common', 'Làm sao để tối ưu hóa hiệu suất web app'] },
    { title: 'Dữ liệu & Phân tích', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', prompts: ['Phân tích xu hướng thị trường iGaming', 'Tóm tắt các quy định pháp lý về định danh số', 'Lập kế hoạch bảo mật dữ liệu khách hàng'] }
  ];

  useEffect(() => {
    const fetchKey = async () => {
      if (!user) return;
      
      try {
        setCheckingKey(true);
        // 1. Try system key
        const systemDoc = await getDoc(doc(db, 'settings', 'apiKeys'));
        let finalKey = '';
        
        if (systemDoc.exists() && systemDoc.data().geminiApiKey) {
          finalKey = systemDoc.data().geminiApiKey;
        }

        // 2. Check for user-provided secondary key
        const userKeyDoc = await getDoc(doc(db, 'user_ai_keys', user.uid));
        
        if (userKeyDoc.exists()) {
          const userKeyData = userKeyDoc.data();
          // If system key missing AND user key is active, use user key
          if (!finalKey && userKeyData.status === 'active') {
            finalKey = userKeyData.apiKey;
            setIsUsingSecondaryKey(true);
          }
          // Set secondary key info for UI
          setUserSecondaryKeyInfo({
            status: userKeyData.status,
            lastUsedAt: userKeyData.lastUsedAt,
            lastError: userKeyData.lastError
          });
        }

        if (finalKey) {
          setAiClient(new GoogleGenAI({ apiKey: finalKey }));
        }
      } catch (error) {
        console.error("Lỗi khi tải API Key:", error);
      } finally {
        setCheckingKey(false);
      }
    };
    fetchKey();
  }, [user]);

  const saveUserApiKey = async (key: string) => {
    if (!user || !key.trim()) return;
    
    try {
      const keyRef = doc(db, 'user_ai_keys', user.uid);
      await setDoc(keyRef, {
        userId: user.uid,
        email: user.email,
        apiKey: key.trim(),
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
        status: 'active'
      }, { merge: true });
      
      setAiClient(new GoogleGenAI({ apiKey: key.trim() }));
      setIsUsingSecondaryKey(true);
      setUserSecondaryKeyInfo({
        status: 'active',
        lastUsedAt: new Date()
      });
      setShowApiKeyModal(false);
      toast.success('Đã cấu hình API Key cá nhân thành công!');
    } catch (error) {
      console.error("Lỗi khi lưu API Key:", error);
      toast.error('Không thể lưu API Key. Vui lòng thử lại.');
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    localStorage.setItem('bmass_ai_sessions', JSON.stringify(sessions));
    localStorage.setItem('bmass_ai_current_session', currentSessionId);
  }, [sessions, currentSessionId]);

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'Cuộc trò chuyện mới',
      messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Bmass AI 5.0. Hệ thống hỗ trợ định danh BMASS. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
      selectedModel: 'gemini-3-flash-preview',
      createdAt: Date.now(),
      isPinned: false
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setInput('');
    setShowSettings(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      const resetSession: ChatSession = {
        id: 'default',
        title: 'Cuộc trò chuyện mới',
        messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Bmass AI 5.0. Hệ thống hỗ trợ định danh BMASS. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
        selectedModel: 'gemini-3-flash-preview',
        createdAt: Date.now(),
        isPinned: false
      };
      setSessions([resetSession]);
      setCurrentSessionId('default');
      return;
    }
    
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(newSessions[0].id);
    }
  };

  const updateSession = (id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSend = async (overrideText?: string, isRegenerate?: boolean) => {
    const textToSend = overrideText || input.trim();
    if (!textToSend || isLoading) return;
    
    if (!aiClient) {
      setShowApiKeyModal(true);
      return;
    }

    if (!overrideText) setInput('');
    const newMessage: Message = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: Date.now() };
    
    // Determine history
    let historyMessages = messages;
    if (isRegenerate) {
      // Find the last user message index
      const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
      if (lastUserIdx !== -1) {
        historyMessages = messages.slice(0, lastUserIdx);
      }
    }

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const isFirstMessage = s.messages.length <= 1;

        return {
          ...s,
          title: isFirstMessage ? (textToSend.length > 25 ? textToSend.substring(0, 25) + '...' : textToSend) : s.title,
          messages: isRegenerate 
            ? s.messages.slice(0, s.messages.map(m => m.role).lastIndexOf('user') + 1)
            : [...s.messages, newMessage]
        };
      }
      return s;
    }));
    
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const historyText = historyMessages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + `\nUser: ${textToSend}`;

      const response = await aiClient.models.generateContent({
        model: selectedModel,
        contents: historyText
      });
      
      const duration = (Date.now() - startTime) / 1000;
      const text = response.text || 'Xin lỗi, tôi không thể tạo ra phản hồi vào lúc này.';

      const aiMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text, 
        timestamp: Date.now(),
        responseTime: duration
      };
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMessage] } : s
      ));
    } catch (error: any) {
      console.error('Bmass AI error:', error);
      
      // Check for API key related errors
      const isApiKeyError = error?.message?.toLowerCase().includes('api key') || 
                            error?.message?.toLowerCase().includes('unauthorized') ||
                            error?.message?.toLowerCase().includes('quota');

      if (isApiKeyError) {
        setShowApiKeyModal(true);
        // Automatically mark secondary key as invalid if it was being used
        if (isUsingSecondaryKey && user) {
          updateDoc(doc(db, 'user_ai_keys', user.uid), {
            status: 'invalid',
            lastError: error?.message || 'Invalid API Key'
          }).catch(console.error);
          setIsUsingSecondaryKey(false);
          setAiClient(null);
          setUserSecondaryKeyInfo(prev => prev ? { ...prev, status: 'invalid', lastError: error?.message || 'Invalid API Key' } : null);
        }
      } else {
        toast.error('Có lỗi xảy ra khi gọi AI: ' + (error?.message || 'Lỗi không xác định'));
      }

      const errorMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau hoặc kiểm tra lại cấu hình API Key.',
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, errorMessage] } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSend(lastUserMessage.text, true);
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    toast.success(type === 'up' ? 'Cảm ơn bạn đã phản hồi tốt!' : 'Cảm ơn bạn, chúng tôi sẽ cải thiện.');
  };

  const handleSearch = (text: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.onstart = () => toast('Đang nghe...', { icon: '🎤' });
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => toast.error('Lỗi nhận diện giọng nói.');
    recognition.start();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Đã sao chép');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (checkingKey) return (
    <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 flex w-full h-full relative bg-white dark:bg-zinc-950 overflow-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100 transition-opacity duration-1000">
         <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-gradient" />
         <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] animate-gradient" />
      </div>

      {/* SIDEBAR */}
      <div className={cn(
        "bg-white dark:bg-zinc-950/50 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 flex flex-col transition-all duration-500 z-40 h-full overflow-hidden",
        sidebarOpen ? "w-72" : "w-0 opacity-0 -translate-x-full"
      )}>
        <div className="p-4 flex flex-col h-full">
          <div className="mb-6 px-2">
            <button 
              onClick={createNewChat}
              className="group flex items-center gap-3 py-3 px-6 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all shadow-sm"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              Chat mới
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
               Gần đây
               <History size={14} />
            </div>
            
            {sessions
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.createdAt - a.createdAt;
              })
              .map(s => (
              <div 
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={cn(
                  "group relative mx-2 p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-200",
                  currentSessionId === s.id 
                    ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" 
                    : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400"
                )}
              >
                <div className="relative">
                  <MessageSquare size={16} className={cn("shrink-0", currentSessionId === s.id ? "text-blue-500" : "text-slate-400")} />
                  {s.isPinned && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-zinc-950" />
                  )}
                </div>
                <p className="text-sm font-medium truncate flex-1">
                  {s.title}
                </p>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => copySessionLink(s.id, e)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-all"
                    title="Sao chép link"
                  >
                    <LinkIcon size={12} />
                  </button>
                  <button 
                    onClick={(e) => togglePinSession(s.id, e)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      s.isPinned ? "text-blue-500 bg-blue-500/10" : "hover:bg-slate-200 dark:hover:bg-white/10"
                    )}
                    title={s.isPinned ? "Bỏ ghim" : "Ghim đoạn chat"}
                  >
                    <Pin size={12} className={cn(s.isPinned && "fill-current")} />
                  </button>
                  <button 
                    onClick={(e) => deleteSession(s.id, e)}
                    className="p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-all"
                    title="Xóa"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
             <div 
               onClick={handleUpgrade}
               className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
             >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                   <Sparkles size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Nâng cấp Bmass Premium</span>
                   <span className="text-[10px] text-blue-500 font-medium tracking-tight">Sử dụng các model xịn nhất</span>
                </div>
             </div>

             <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt={user.displayName || user?.email || 'User'} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                        <User size={16} />
                     </div>
                   )}
                </div>
                <div className="flex flex-col min-w-0">
                   <div className="flex items-center gap-1.5">
                     <span className="text-xs font-bold text-slate-900 dark:text-white">
                       {user?.displayName || 'Người dùng Nucleus'}
                     </span>
                     <div className="px-1 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/10 text-[8px] font-black text-blue-600 uppercase tracking-tighter">Nucleus</div>
                   </div>
                   <span className="text-[10px] text-slate-400">{user?.email}</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight">Miễn phí</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">
        {/* HEADER */}
        <div className="h-16 px-4 md:px-6 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setSidebarOpen(!sidebarOpen)}
               className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500 transition-all"
             >
               <ChevronLeft size={20} className={cn("transition-transform duration-500", !sidebarOpen && "rotate-180")} />
             </button>
             
             {!sidebarOpen && (
               <div className="flex items-center gap-2 ml-2">
                 <AppLogo className="w-8 h-8" />
                 <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white">BMASS AI</span>
               </div>
             )}

             <div className="relative ml-2">
               <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    showSettings 
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-500/10" 
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  <span>{MODELS.find(m => m.id === selectedModel)?.name}</span>
                  <ChevronDown size={14} className={cn("transition-transform duration-300", showSettings && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                   >
                     <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                       <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống AI Nucleus & BMASS</span>
                       </div>
                        {MODELS.map(m => (
                          <button
                            key={m.id}
                            disabled={m.status !== 'Active'}
                            onClick={() => {
                              if (m.status === 'Active') {
                                updateSession(currentSessionId, { selectedModel: m.id });
                                setShowSettings(false);
                              }
                            }}
                            className={cn(
                              "w-full p-3 rounded-xl text-left transition-all flex items-center justify-between group",
                              selectedModel === m.id 
                                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" 
                                : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-400",
                              m.status !== 'Active' && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                   "text-sm font-medium",
                                   m.id.startsWith('bmass') && "text-blue-600 dark:text-blue-400 font-bold"
                                 )}>
                                   {m.name}
                                 </span>
                                {m.status !== 'Active' && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider",
                                    m.status === 'Premium' ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                                  )}>
                                    {m.status}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                 <span className="text-[10px] opacity-60 font-mono uppercase tracking-tighter">{m.id}</span>
                                 {m.id.startsWith('bmass') && (
                                   <span className="text-[8px] text-blue-500 font-bold uppercase tracking-tight px-1 rounded bg-blue-50 dark:bg-blue-500/10">Hệ thống xịn</span>
                                 )}
                               </div>
                            </div>
                            {selectedModel === m.id && <Check size={14} />}
                            {m.status !== 'Active' && <Shield size={12} className="text-slate-300 shrink-0" />}
                          </button>
                        ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={handleUpgrade}
               className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all"
               title="Nâng cấp"
             >
                <Sparkles size={18} className="text-blue-500" />
             </button>
             <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 overflow-hidden shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {user?.displayName?.charAt(0) || 'N'}
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-8 pb-4 space-y-8 no-scrollbar scroll-smooth">
          {messages.length <= 1 ? (
             <div className="min-h-full flex flex-col items-center justify-center py-12 max-w-4xl mx-auto w-full">
               <div className="flex flex-col items-center text-center space-y-8 mb-12">
                 <div className="relative group">
                    <div className="absolute -inset-8 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 animate-gradient" />
                    <AppLogo className="w-20 h-20 relative z-10" isLoading={isLoading} />
                 </div>
                 <div className="space-y-3">
                   <h2 className="text-4xl md:text-5xl font-display font-medium text-slate-900 dark:text-white tracking-tight">
                      Xin chào, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient font-bold">{user?.displayName || 'Nucleus User'}</span>
                   </h2>
                   <p className="text-slate-500 dark:text-zinc-400 text-lg font-medium">
                      Bmass AI 5.0 - Trí tuệ nhân tạo định danh BMASS.
                   </p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                 {SUGGESTED_PROMPTS.map((group, i) => (
                   <div key={i} className="space-y-3">
                     {group.prompts.slice(0, 1).map((p, j) => (
                       <button
                         key={j}
                         onClick={() => handleSend(p)}
                         className="w-full p-6 text-left bg-white dark:bg-zinc-900/50 border border-slate-200/50 dark:border-white/5 rounded-[24px] hover:bg-slate-50 dark:hover:bg-white/5 hover:border-blue-500/30 transition-all group group font-medium text-sm text-slate-700 dark:text-zinc-300 shadow-sm"
                       >
                         <div className="flex items-center gap-3 mb-2">
                           <group.icon size={16} className={group.color} />
                           <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">{group.title}</span>
                         </div>
                         {p}
                       </button>
                     ))}
                   </div>
                 ))}
               </div>
             </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-12">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "group flex animate-in fade-in slide-in-from-bottom-2 duration-500",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex gap-4 md:gap-6 w-full max-w-[90%]",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center relative overflow-hidden",
                      msg.role === 'user' ? "shadow-sm border border-slate-200 dark:border-white/10" : ""
                    )}>
                      {msg.role === 'user' ? (
                        user?.photoURL ? (
                          <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                            <User size={18} />
                          </div>
                        )
                      ) : (
                        <AppLogo className="w-full h-full" isLoading={isLoading && msg.id === messages[messages.length - 1].id} />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className={cn(
                        "text-slate-800 dark:text-zinc-200 leading-relaxed font-medium text-sm md:text-base px-2",
                        msg.role === 'user' ? "text-right" : "text-left"
                      )}>
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-inherit">
                          <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                        </div>
                      </div>

                      {msg.role === 'model' && (
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -ml-2">
                            <button 
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                              title="Copy"
                            >
                              {copiedId === msg.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            </button>
                            <button 
                              onClick={() => handleFeedback('up')}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 transition-all" 
                              title="Hữu ích"
                            >
                              <ThumbsUp size={16} />
                            </button>
                            <button 
                              onClick={() => handleFeedback('down')}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 transition-all" 
                              title="Không hữu ích"
                            >
                              <ThumbsDown size={16} />
                            </button>
                            <button 
                              onClick={handleRegenerate}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 transition-all" 
                              title="Tạo lại phản hồi"
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button 
                              onClick={() => handleSearch(msg.text)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 transition-all" 
                              title="Tìm kiếm thêm"
                            >
                              <Search size={16} />
                            </button>
                          </div>
                          
                          {/* Timer display for the message */}
                          {msg.role === 'model' && msg.responseTime !== undefined && (
                            <span className="text-[10px] text-slate-400 font-medium italic opacity-0 group-hover:opacity-100 transition-opacity">
                              Phản hồi trong {msg.responseTime.toFixed(1)} giây
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4 md:gap-6 animate-in fade-in duration-700">
                  <AppLogo className="w-8 h-8 md:w-10 md:h-10" isLoading={true} />
                  <div className="flex-1 space-y-4">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest animate-pulse">
                          Bmass AI đang phân tích dữ liệu ({responseTime.toFixed(1)}s)...
                        </span>
                     </div>
                     <div className="space-y-2">
                        <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full w-3/4 animate-shimmer" />
                        <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full w-1/2 animate-shimmer" />
                     </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-36" />
            </div>
          )}
        </div>

        {/* GRADIENT MASK FOR OVERLAY EFFECT */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent pointer-events-none z-20" />

        {/* INPUT BOX */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-8 pointer-events-none z-30">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-black/20 transition-all duration-500 focus-within:ring-2 ring-blue-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 focus-within:from-blue-500/5 focus-within:via-purple-500/5 focus-within:to-pink-500/5 transition-all duration-700 animate-gradient" />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) toast.success(`Đã chọn: ${file.name}`);
                  }}
                />
                
                <div className="flex items-end gap-2 p-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5 transition-all rounded-full shrink-0"
                  >
                    <Plus size={20} />
                  </button>
                  
                  <textarea 
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Đặt câu hỏi cho Bmass AI..."
                    className="flex-1 max-h-[250px] bg-transparent py-3 px-2 text-base outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-zinc-600 placeholder:text-slate-400 resize-none no-scrollbar leading-relaxed font-medium"
                  />

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleVoiceInput}
                      className="p-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5 transition-all rounded-full shrink-0"
                    >
                      <Mic size={20} />
                    </button>
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "p-3 rounded-full flex items-center justify-center transition-all shrink-0 duration-500",
                        input.trim() && !isLoading
                          ? "bg-blue-600 text-white hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                          : "text-slate-300 dark:text-zinc-800"
                      )}
                    >
                      {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </div>
                </div>
            </div>
            
            <p className="text-center text-[10px] text-slate-400 dark:text-zinc-600 font-medium mt-4 pointer-events-none">
               Bmass AI có thể hiển thị thông tin không chính xác. Hãy kiểm tra lại các phản hồi quan trọng.
            </p>
          </div>
        </div>
      </div>

      {/* API KEY MODAL */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApiKeyModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-white/10"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <KeyRound size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cấu hình API Key</h3>
                      <p className="text-sm text-slate-500">Sử dụng API Key cá nhân của bạn</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowApiKeyModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {userSecondaryKeyInfo && (
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between",
                      userSecondaryKeyInfo.status === 'active' 
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200/50 dark:border-rose-500/20"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          userSecondaryKeyInfo.status === 'active'
                            ? "bg-emerald-100 dark:bg-emerald-400/20 text-emerald-600"
                            : "bg-rose-100 dark:bg-rose-400/20 text-rose-600"
                        )}>
                          {userSecondaryKeyInfo.status === 'active' ? <Check size={16} /> : <X size={16} />}
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-bold",
                            userSecondaryKeyInfo.status === 'active' ? "text-emerald-800 dark:text-emerald-400" : "text-rose-800 dark:text-rose-400"
                          )}>
                            {userSecondaryKeyInfo.status === 'active' ? 'Bạn đang sử dụng Key cá nhân' : 'Key cá nhân không hợp lệ'}
                          </p>
                          <p className={cn(
                            "text-[10px]",
                            userSecondaryKeyInfo.status === 'active' ? "text-emerald-600/70" : "text-rose-600/70"
                          )}>
                            {userSecondaryKeyInfo.status === 'active' 
                              ? 'Đã cấu hình và đang hoạt động tốt' 
                              : userSecondaryKeyInfo.lastError || 'Khóa này đã bị vô hiệu hóa hoặc sai'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setUserApiKey('');
                        }}
                        className={cn(
                          "text-[10px] font-bold hover:underline",
                          userSecondaryKeyInfo.status === 'active' ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        Thay đổi
                      </button>
                    </div>
                  )}

                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200/50 dark:border-amber-500/20">
                    <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                      Để có trải nghiệm tốt nhất và không bị giới hạn, bạn nên sử dụng API Key riêng. 
                      Hệ thống sẽ lưu trữ khóa này an toàn cho tài khoản của bạn.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Hướng dẫn lấy Key:</p>
                    <ol className="text-sm text-slate-600 dark:text-zinc-400 space-y-3 ml-4 list-decimal">
                      <li>Truy cập <a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold">Google AI Studio</a></li>
                      <li>Nhấn <b>"Create API key"</b></li>
                      <li>Đặt tên cho Key của bạn</li>
                      <li>Copy API Key và dán vào ô bên dưới</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">API Key của bạn</label>
                    <div className="relative">
                      <input 
                        type="password"
                        value={userApiKey}
                        onChange={(e) => setUserApiKey(e.target.value)}
                        placeholder="Dán API Key tại đây..."
                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => saveUserApiKey(userApiKey)}
                    disabled={!userApiKey.trim()}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Lưu & Sử dụng ngay
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Settings2, 
  Loader2, 
  Trash2, 
  Sparkles, 
  Code2, 
  FileText, 
  Plus, 
  Copy, 
  Check, 
  MessageSquare,
  History,
  ChevronDown,
  RotateCcw,
  Pin,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import AppLogo from '../../components/ui/AppLogo';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useParams, useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
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
  { id: 'gemini-3.1-flash-lite', name: 'Gemini Lite (Nhanh)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini Flash (Cân bằng)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini Pro (Thông minh)' },
] as const;

export default function GeminiChat() {
  const { user, isSuperAdmin } = useAuthStore();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // Session Management
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({ ...s, isPinned: s.isPinned || false }));
      }
      
      return [{
        id: 'default',
        title: 'Cuộc trò chuyện mới',
        messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Trợ lý AI Gemini. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
        selectedModel: 'gemini-3-flash-preview',
        createdAt: Date.now(),
        isPinned: false
      }];
    } catch (e) {
      return [{
        id: 'default',
        title: 'Cuộc trò chuyện mới',
        messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Trợ lý AI Gemini. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
        selectedModel: 'gemini-3-flash-preview',
        createdAt: Date.now(),
        isPinned: false
      }];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return localStorage.getItem('ai_current_session') || 'default';
  });

  useEffect(() => {
    if (sessionId && sessions.some(s => s.id === sessionId)) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId, sessions]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [checkingKey, setCheckingKey] = useState(false);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;
  const selectedModel = currentSession.selectedModel;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const SUGGESTED_PROMPTS = [
    { title: 'Sáng tạo nội dung', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', prompts: ['Lên ý tưởng kịch bản video giới thiệu', 'Viết email nhắc nhở lịch hẹn', 'Viết đoạn văn ngắn giới thiệu bản thân'] },
    { title: 'Chuyên môn & Logic', icon: Code2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', prompts: ['Giải thích cách AI hoạt động cho người mới', 'Ví dụ về code React Hook', 'Làm sao để tối ưu hóa trang web'] },
    { title: 'Phân tích & Tóm tắt', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', prompts: ['Tóm tắt tin tức công nghệ hôm nay', 'Mô tả nguyên lý hoạt động của blockchain', 'Phân tích điểm mạnh điểm yếu của Javascript'] }
  ];

  // No longer fetching key on client
  useEffect(() => {
    setCheckingKey(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions));
      localStorage.setItem('ai_current_session', currentSessionId);
    } catch (e) {
      console.error("Failed to save chat sessions to localStorage due to cyclic data:", e?.message || String(e));
    }
  }, [sessions, currentSessionId]);

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'Cuộc trò chuyện mới',
      messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Trợ lý AI Gemini. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
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
        messages: [{ id: '1', role: 'model', text: 'Xin chào! Tôi là Trợ lý AI Gemini. Tôi có thể giúp gì cho bạn hôm nay?', timestamp: Date.now() }],
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

  const togglePinSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  const updateSession = (id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSend = async (overrideText?: string, isRegenerate?: boolean) => {
    const textToSend = overrideText || input.trim();
    if (!textToSend || isLoading) return;
    
    if (!overrideText) setInput('');
    const newMessage: Message = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: Date.now() };
    
    let historyMessages = messages;
    if (isRegenerate) {
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

    try {
      // Build context from history
      const historyText = messages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + `\nUser: ${textToSend}`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          contents: {
            parts: [{ text: historyText }]
          }
        })
      });
      
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Lỗi xử lý AI');
      }

      const data = await response.json();
      const text = data.text || 'Xin lỗi, tôi không thể tạo ra phản hồi vào lúc này.';

      const aiMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text, 
        timestamp: Date.now()
      };
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMessage] } : s
      ));
    } catch (error: any) {
      console.error('Gemini error:', error?.message || String(error));
      toast.error('Có lỗi xảy ra khi gọi AI: ' + (error?.message || 'Lỗi không xác định'));

      const errorMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: 'Xin lỗi, tôi đang gặp sự cố kết nối hoặc cấu hình API Key không hợp lệ. Vui lòng kiểm tra lại.',
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, errorMessage] } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Đã sao chép');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (checkingKey) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-zinc-400 font-medium tracking-wide">Đang kiểm tra cấu hình hệ thống...</p>
    </div>
  );

  return (
    <div className="flex-1 flex w-full h-full relative bg-white dark:bg-zinc-950 overflow-hidden">
      {/* SIDEBAR */}
      <div className={cn(
        "bg-slate-50 dark:bg-zinc-900 border-r border-slate-200 dark:border-white/10 flex flex-col transition-all duration-300 z-40 h-full overflow-hidden shrink-0",
        sidebarOpen ? "w-64 md:w-72" : "w-0 opacity-0"
      )}>
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={createNewChat}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm mb-6"
          >
            <Plus size={18} />
            Chat mới
          </button>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            <div className="px-2 py-2 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
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
                  "group relative p-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-colors",
                  currentSessionId === s.id 
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-white/5" 
                    : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400 border border-transparent"
                )}
              >
                <div className="relative shrink-0">
                  <MessageSquare size={16} />
                  {s.isPinned && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className="text-sm font-medium truncate flex-1 leading-none">
                  {s.title}
                </p>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => togglePinSession(s.id, e)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      s.isPinned ? "text-blue-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    )}
                    title={s.isPinned ? "Bỏ ghim" : "Ghim đoạn chat"}
                  >
                    <Pin size={14} className={cn(s.isPinned && "fill-current")} />
                  </button>
                  <button 
                    onClick={(e) => deleteSession(s.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
             <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white dark:bg-black border border-slate-200 dark:border-white/10 shrink-0">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt={user.displayName || user.email || 'User'} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <User size={16} />
                     </div>
                   )}
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                     {user?.displayName || 'Người dùng'}
                   </span>
                   <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">{user?.email}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">
        {/* HEADER */}
        <div className="h-16 px-4 md:px-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setSidebarOpen(!sidebarOpen)}
               className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 transition-colors"
             >
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                 <line x1="3" y1="12" x2="21" y2="12"></line>
                 <line x1="3" y1="6" x2="21" y2="6"></line>
                 <line x1="3" y1="18" x2="21" y2="18"></line>
               </svg>
             </button>
             
             {!sidebarOpen && (
               <div className="flex items-center gap-2 hidden sm:flex">
                 <AppLogo className="w-6 h-6" />
                 <span className="font-semibold text-slate-900 dark:text-white">AI Assistant</span>
               </div>
             )}

             <div className="relative">
               <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                    showSettings 
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" 
                      : "text-slate-600 dark:text-zinc-300 border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <span>{MODELS.find(m => m.id === selectedModel)?.name}</span>
                  <ChevronDown size={14} />
                </button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div 
                     initial={{ opacity: 0, y: 5 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 5 }}
                     className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                   >
                     <div className="p-1.5 space-y-0.5">
                        {MODELS.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                                updateSession(currentSessionId, { selectedModel: m.id });
                                setShowSettings(false);
                            }}
                            className={cn(
                              "w-full p-2.5 rounded-lg text-left transition-colors flex items-center justify-between",
                              selectedModel === m.id 
                                ? "bg-slate-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" 
                                : "hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300"
                            )}
                          >
                            <span className="text-sm font-medium">{m.name}</span>
                            {selectedModel === m.id && <Check size={16} />}
                          </button>
                        ))}
                     </div>
                   </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto w-full no-scrollbar pt-8 pb-32">
          {messages.length <= 1 ? (
             <div className="min-h-[50vh] flex flex-col items-center justify-center py-12 max-w-3xl mx-auto px-4">
               <div className="text-center mb-12">
                 <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                   <Bot size={32} className="text-white" />
                 </div>
                 <h2 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mb-3">
                    Xin chào, {user?.displayName ? user.displayName.split(' ')[0] : 'bạn'}
                 </h2>
                 <p className="text-slate-500 dark:text-zinc-400">
                    Trợ lý AI sẵn sàng hỗ trợ công việc của bạn hôm nay.
                 </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                 {SUGGESTED_PROMPTS.map((group, i) => (
                   <div key={i} className="space-y-3">
                     {group.prompts.slice(0, 1).map((p, j) => (
                       <button
                         key={j}
                         onClick={() => handleSend(p)}
                         className="w-full h-full p-5 text-left bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all group group text-sm text-slate-700 dark:text-zinc-300"
                       >
                         <div className="flex items-center gap-2 mb-3">
                           <group.icon size={18} className={group.color} />
                           <span className="text-xs font-semibold text-slate-500">{group.title}</span>
                         </div>
                         <p className="font-medium">{p}</p>
                       </button>
                     ))}
                   </div>
                 ))}
               </div>
             </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "group flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex gap-4 w-full max-w-[85%] md:max-w-[75%]",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full shrink-0 flex items-center justify-center relative overflow-hidden",
                      msg.role === 'user' 
                        ? "bg-slate-200 dark:bg-zinc-800" 
                        : "bg-blue-600"
                    )}>
                      {msg.role === 'user' ? (
                        user?.photoURL ? (
                          <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-slate-600 dark:text-zinc-400" />
                        )
                      ) : (
                        <Bot size={16} className="text-white" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className={cn(
                        "font-medium text-[15px] px-5 py-3.5 leading-relaxed rounded-2xl",
                        msg.role === 'user' 
                          ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-tr-sm" 
                          : "bg-white dark:bg-black text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10 shadow-sm rounded-tl-sm"
                      )}>
                        <div className={cn(
                           "prose prose-sm dark:prose-invert max-w-none break-words",
                           msg.role === 'user' ? "text-inherit" : "prose-p:leading-relaxed"
                        )}>
                          <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                        </div>
                      </div>

                      {msg.role === 'model' && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
                          >
                            {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            <span className="sr-only">Copy</span>
                          </button>
                          <button 
                            onClick={() => handleSend(messages[messages.length - 2]?.text, true)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors" 
                            title="Tạo lại phản hồi"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4 animate-in fade-in duration-300 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-blue-600 shrink-0 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4">
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                     </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* INPUT BOX */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-6 bg-gradient-to-t from-white via-white dark:from-zinc-950 dark:via-zinc-950 to-transparent pt-10">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white dark:bg-black border border-slate-200 dark:border-white/20 rounded-2xl shadow-lg focus-within:ring-2 ring-blue-500/20 transition-all flex items-end p-2 gap-2">
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
                  disabled={false}
                  placeholder="Message AI Assistant..."
                  className="flex-1 max-h-[200px] bg-transparent py-2.5 px-3 text-[15px] outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-zinc-500 placeholder:text-slate-400 resize-none no-scrollbar font-medium"
                />

                <div className="flex items-center pb-1 pr-1 shrink-0">
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                      input.trim() && !isLoading
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-100 text-slate-400 dark:bg-zinc-900 dark:text-zinc-600"
                    )}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                  </button>
                </div>
            </div>
            
            <p className="text-center text-xs text-slate-500 dark:text-zinc-500 mt-3 font-medium">
               Gemini có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin quan trọng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { Send, Bot, User, Settings2, Loader2, Trash2, KeyRound, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini Lite (Nhanh)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini Flash (Cân bằng)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini Pro (Thông minh)' },
] as const;

export default function GeminiChat() {
  const { isSuperAdmin } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
  
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  const [checkingKey, setCheckingKey] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'apiKeys'));
        if (docSnap.exists() && docSnap.data().geminiApiKey) {
          setAiClient(new GoogleGenAI({ apiKey: docSnap.data().geminiApiKey }));
        }
      } catch (error) {
        console.error("Lỗi khi tải Gemini API Key:", error);
      } finally {
        setCheckingKey(false);
      }
    };
    fetchKey();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!aiClient) {
      toast.error('Chưa cấu hình API Key. Vui lòng liên hệ Admin.');
      return;
    }

    const userText = input.trim();
    setInput('');
    const newMessage: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      let historyText = messages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + `\nUser: ${userText}`;

      const response = await aiClient.models.generateContent({
        model: selectedModel,
        contents: historyText,
      });

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: response.text || '' }
      ]);
    } catch (error: any) {
      console.error('Gemini error:', error);
      toast.error('Có lỗi xảy ra khi gọi AI: ' + (error?.message || 'Lỗi không xác định'));
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ id: '1', role: 'model', text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?' }]);
  };

  if (checkingKey) return (
    <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-slate-950 dark:text-white tracking-tight">Gemini AI Assistant</h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Trợ lý trí tuệ nhân tạo thế hệ mới của Google được tích hợp trực tiếp.</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    showSettings ? "bg-slate-900 text-white dark:bg-white dark:text-black" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400"
                )}
            >
                <Settings2 size={14} /> Cấu hình
            </button>
            <button 
                onClick={clearChat}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
            >
                <Trash2 size={14} /> Dọn dẹp
            </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-2 block uppercase tracking-widest">Mô hình hoạt động</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {MODELS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            className={cn(
                                "p-4 rounded-xl border text-sm font-medium transition-all text-left flex flex-col gap-1",
                                selectedModel === m.id 
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-blue-500 dark:hover:border-indigo-500/50"
                            )}
                        >
                            <span>{m.name}</span>
                            <span className={cn("text-[10px] uppercase tracking-tighter opacity-70", selectedModel === m.id ? "text-white" : "text-slate-400")}>{m.id}</span>
                        </button>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[600px] lg:h-[700px]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
            {!aiClient ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <KeyRound size={48} strokeWidth={1} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold dark:text-white">API Key Required</h3>
                        <p className="text-slate-500 dark:text-zinc-400 max-w-sm">Hệ thống trợ lý AI cần được cấu hình API Key từ trang Quản trị để có thể phản hồi các yêu cầu của bạn.</p>
                    </div>
                    {isSuperAdmin && (
                         <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-500 dark:text-zinc-500 max-w-xs">
                             Hướng dẫn: Dashboard &gt; API Keys &gt; Thêm Google Gemini API Key.
                         </div>
                    )}
                </div>
            ) : (
                <>
                    {messages.map(msg => (
                        <div key={msg.id} className={cn("flex w-full group animate-in fade-in slide-in-from-bottom-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            <div className={cn("flex flex-col gap-2 max-w-[85%] md:max-w-[75%]", msg.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-1")}>
                                    {msg.role === 'user' ? (<>User <User size={10} /></>) : (<><Bot size={10} /> Gemini Assistant</>)}
                                </div>
                                <div className={cn(
                                    "px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-sm",
                                    msg.role === 'user' 
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-tr-sm" 
                                        : "bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-zinc-100 rounded-tl-sm"
                                )}>
                                    <div className={cn(
                                        "prose prose-sm max-w-none break-words",
                                        msg.role === 'user' 
                                            ? "prose-invert dark:prose-zinc marker:text-white" 
                                            : "prose-slate dark:prose-invert prose-headings:text-slate-900 dark:prose-headings:text-white prose-pre:bg-slate-800 dark:prose-pre:bg-black"
                                    )}>
                                        <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start w-full animate-in fade-in">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-1">
                                    <Bot size={10} /> Gemini Assistant
                                </div>
                                <div className="px-5 py-5 rounded-3xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-tl-sm flex gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </>
            )}
        </div>

        {/* Chat Input */}
        <div className="p-6 bg-slate-50/50 dark:bg-zinc-900/30 border-t border-slate-200 dark:border-white/5">
            <div className="relative group">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={!aiClient || isLoading}
                    placeholder={aiClient ? "Hỏi bất cứ điều gì..." : "Hệ thống đang offline"}
                    className="w-full h-16 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-6 pr-16 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-indigo-500/20 focus:border-blue-500 dark:focus:border-indigo-500 transition-all outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-zinc-600"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || !aiClient}
                    className="absolute right-3 top-3 w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                >
                    <Send size={18} />
                </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 opacity-40">
                <Sparkles size={12} className="text-amber-500" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">Khai phá sức mạnh vạn năng của trí tuệ nhân tạo</span>
            </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, X, Send, Bot, User, Settings2, Loader2, Maximize2, Minimize2, Trash2, KeyRound } from 'lucide-react';
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

export function GeminiChatBox() {
  const { isSuperAdmin } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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
      // Build history for context
      let historyText = "";
      if (messages.length > 1) {
         historyText = messages.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + `\nUser: ${userText}`;
      } else {
         historyText = userText;
      }

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

  if (checkingKey) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
              className={cn(
                "bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right",
                isExpanded ? "w-[80vw] h-[80vh] md:w-[60vw] md:h-[80vh] rounded-2xl" : "w-[350px] h-[500px] sm:w-[400px] sm:h-[600px] rounded-3xl"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-slate-900 dark:text-white font-medium text-sm">Gemini Assistant</h3>
                    <p className="text-slate-500 dark:text-zinc-500 text-[10px] uppercase tracking-wider">{MODELS.find(m => m.id === selectedModel)?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowSettings(!showSettings)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <Settings2 size={16} />
                  </button>
                  <button onClick={() => setIsExpanded(!isExpanded)} className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-900/50 px-4 py-3 overflow-hidden text-sm"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-zinc-400 mb-2 block font-medium uppercase tracking-wider">Chọn Model AI</label>
                        <select 
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-indigo-500/50"
                        >
                          {MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                         <span className="text-xs text-slate-500 dark:text-zinc-500">Mô hình càng thông minh thì phản hồi càng lâu.</span>
                         <button onClick={clearChat} className="flex items-center gap-1 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors">
                           <Trash2 size={14}/> Xóa lịch sử
                         </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {!aiClient ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
                        <KeyRound size={32} strokeWidth={1.5} />
                      </div>
                      <h4 className="text-slate-900 dark:text-white font-medium">Chưa cấu hình AI</h4>
                      <p className="text-sm text-slate-500 dark:text-zinc-400">Trợ lý Gemini cần API Key để hoạt động.</p>
                      {isSuperAdmin ? (
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-4 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">Vui lòng vào Dashboard &gt; API Keys để thêm Gemini API Key.</p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-4">Vui lòng đợi Quản trị viên hệ thống thiết lập.</p>
                      )}
                   </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <div key={msg.id} className={cn("flex max-w-[85%]", msg.role === 'user' ? "ml-auto" : "mr-auto")}>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-blue-600 dark:bg-indigo-600 text-white rounded-br-sm" 
                            : "bg-slate-100 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-200 border border-slate-200 dark:border-white/5 rounded-bl-sm"
                        )}>
                          <div className={cn(
                            "prose prose-sm max-w-none break-words",
                            msg.role === 'user' 
                              ? "prose-invert text-white marker:text-white prose-p:text-white prose-headings:text-white prose-strong:text-white" 
                              : "prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800 dark:prose-pre:bg-zinc-900 prose-zinc"
                          )}>
                             <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex max-w-[85%] mr-auto">
                        <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-200 border border-slate-200 dark:border-white/5 rounded-bl-sm flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-white/5">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if(e.key === 'Enter') handleSend();
                    }}
                    disabled={!aiClient}
                    placeholder={aiClient ? "Nhập tin nhắn..." : "Vui lòng cấu hình API Key"}
                    className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none focus:border-blue-500 dark:focus:border-indigo-500/50 transition-colors disabled:opacity-50"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || !aiClient}
                    className="absolute right-2 w-8 h-8 bg-blue-600 dark:bg-indigo-500 hover:bg-blue-700 dark:hover:bg-indigo-400 disabled:bg-slate-300 dark:disabled:bg-zinc-800 disabled:text-slate-500 dark:disabled:text-zinc-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <Send size={14} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-colors border border-indigo-400/30"
            >
              <MessageSquare size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

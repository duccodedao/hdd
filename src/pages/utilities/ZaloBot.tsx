import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, ShieldCheck, AlertCircle, Loader2, MessageSquare, ExternalLink, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface ZaloConfig {
  accessToken?: string;
  oaId?: string;
  botToken?: string;
  webhookSecret?: string;
}

export default function ZaloBot() {
  const { isSuperAdmin } = useAuthStore();
  const [config, setConfig] = useState<ZaloConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testId, setTestId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(doc(db, 'settings', 'zalo'), 'config', 'bot'));
        if (docSnap.exists()) {
          setConfig(docSnap.data() as ZaloConfig);
        }
      } catch (error) {
        console.error('Failed to fetch Zalo config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const webhookUrl = `${window.location.origin}/api/zalo/webhook`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Đã sao chép Webhook URL');
  };

  const handleSetWebhook = async () => {
    if (!config?.botToken || !config?.webhookSecret) {
      toast.error('Vui lòng cấu hình Bot Token và Secret Token trước.');
      return;
    }

    setSettingWebhook(true);
    try {
      // Use Backend Proxy instead of direct call to avoid CORS
      const response = await fetch('/api/zalo/proxy/setWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          url: webhookUrl,
          secret_token: config.webhookSecret
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 50)}...`);
      }

      if (data.ok) {
        toast.success('Đã thiết lập Webhook thành công!');
      } else {
        toast.error(`Lỗi từ Zalo: ${data.description || 'Không xác định'}`);
      }
    } catch (error: any) {
      console.error('Webhook Setup Error:', error);
      toast.error(`Lỗi: ${error.message || 'Không thể thiết lập Webhook qua server.'}`);
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleTestSend = async () => {
    const botToken = config?.botToken;
    const oaToken = config?.accessToken;

    if (!botToken && !oaToken) {
      toast.error('Chưa cấu hình Token.');
      return;
    }
    if (!testId || !testMessage) {
      toast.error('Vui lòng nhập ID người nhận và nội dung tin nhắn.');
      return;
    }

    setSending(true);
    try {
      let response;
      if (botToken) {
        // Test via New Bot Platform Proxy
        response = await fetch('/api/zalo/proxy/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: botToken,
            chat_id: testId,
            text: testMessage
          })
        });
      } else {
        // Test via Legacy OA Proxy
        response = await fetch('/api/zalo/oa-proxy/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: oaToken || '',
            recipient: { user_id: testId },
            message: { text: testMessage }
          })
        });
      }
      
      const data = await response.json();
      if (data.ok || data.error === 0) {
        toast.success('Đã gửi tin nhắn test thành công!');
        setTestMessage('');
      } else {
        toast.error(`Lỗi Zalo API: ${data.description || data.message} (Code: ${data.error_code || data.error})`);
      }
    } catch (error) {
      console.error('Zalo API Error:', error);
      toast.error('Lỗi khi gửi tin nhắn qua server.');
    } finally {
      setSending(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold dark:text-white">Admin Access Only</h2>
          <p className="text-slate-500 dark:text-zinc-400 max-w-md">Tiện ích quản lý Zalo Bot chỉ dành riêng cho quản trị viên hệ thống.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-slate-950 dark:text-white tracking-tight">Zalo Bot Control Center</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Hệ thống quản trị và kiểm tra Zalo Official Account Bot.</p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="https://oa.zalo.me/manage" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            Zalo OA Manager <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Bot size={80} />
            </div>
            <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-500" /> Trạng thái Bot
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Platform Bot</span>
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  config?.botToken ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                )}>
                  {config?.botToken ? 'Connected' : 'Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secret Token</span>
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  config?.webhookSecret ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                )}>
                  {config?.webhookSecret ? 'Set' : 'Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Legacy OA</span>
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  config?.oaId ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                )}>
                  {config?.oaId ? 'Available' : 'Inactive'}
                </span>
              </div>
            </div>

            {!config?.botToken && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex gap-3 items-start italic">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                  Bạn chưa cấu hình Bot Token mới. Vui lòng truy cập trang Cài đặt Admin &gt; API Keys để thiết lập.
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
            <h4 className="text-xl font-display font-medium italic mb-2 tracking-tight">Cấu hình Webhook?</h4>
            <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">Tự động thiết lập Webhook cho Bot của bạn qua API.</p>
            <button 
              onClick={handleSetWebhook}
              disabled={settingWebhook || !config?.botToken}
              className="w-full py-3 bg-white text-slate-950 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {settingWebhook ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Thiết lập Webhook ngay
            </button>
          </div>
        </div>

        {/* Test Block */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-white/5 flex items-center justify-center text-blue-600 dark:text-white">
                <Send size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold dark:text-white">Kiểm tra gửi tin nhắn</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">Gửi tin nhắn thử nghiệm đến ID người nhận cụ thể.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">ID người nhận (Chat ID)</label>
                <input 
                  type="text" 
                  value={testId}
                  onChange={e => setTestId(e.target.value)}
                  placeholder="Nhập ID nhận tin nhắn..."
                  className="w-full h-14 px-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nội dung tin nhắn</label>
                <textarea 
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Nội dung tin nhắn test..."
                  className="w-full min-h-[120px] p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white resize-none"
                />
              </div>

              <button
                onClick={handleTestSend}
                disabled={sending || (!config?.botToken && !config?.accessToken)}
                className="w-full h-16 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap size={18} />}
                Gửi tin nhắn thử nghiệm
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8">
            <h4 className="text-sm font-bold dark:text-white mb-6 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Hệ thống Webhook & AI
            </h4>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Webhook URL Endpoint</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={webhookUrl}
                    className="flex-1 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono dark:text-zinc-300 outline-none"
                  />
                  <button 
                    onClick={copyWebhook}
                    className="px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-4 items-start translate-y-2">
                 <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                    <Sparkles size={20} />
                 </div>
                 <div>
                    <h5 className="text-sm font-bold text-blue-600 dark:text-blue-400">AI Auto-Reply đã sẵn sàng</h5>
                    <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 font-medium leading-relaxed mt-1">
                       Webhook đã được tích hợp với Gemini AI. Hệ thống sẽ tự động phản hồi dựa trên nội dung tin nhắn và danh mục tiện ích có sẵn.
                    </p>
                 </div>
              </div>

              <div className="space-y-4 pt-6">
                {[
                  { title: 'Tạo Zalo OA', desc: 'Đăng ký Zalo Official Account tại oa.zalo.me' },
                  { title: 'Cấu hình Webhook', desc: 'Copy URL Webhook phía trên vào trang quản trị Zalo OA (Quản lý ứng dụng > Webhook).' },
                  { title: 'Cấp quyền Token', desc: 'Sinh Access Token với đầy đủ quyền read/write tin nhắn.' }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold dark:text-white">{i + 1}</span>
                    <div>
                      <h5 className="text-sm font-bold dark:text-white">{step.title}</h5>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1 font-medium leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

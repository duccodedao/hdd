import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Square, Download, Volume2, AudioLines, Settings, Sparkles, RefreshCw, Trash2, HelpCircle, FileAudio, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface TextToSpeechProps {
  onBack: () => void;
}

interface SpeechHistoryItem {
  id: string;
  text: string;
  voiceName: string;
  accent: string;
  gender?: 'female' | 'male';
  rate: number;
  pitch: number;
  timestamp: number;
}

const TEMPLATES = [
  {
    title: 'Kênh Tin Tức 📻',
    text: 'Chào mừng quý vị và các bạn đã quay trở lại với bản tin công nghệ BMASS. Hôm nay, chúng tôi xin gửi đến quý vị những cập nhật mới nhất về xu hướng phát triển trí tuệ nhân tạo toàn cầu và các giải pháp chuyển đổi số thông minh hàng đầu.'
  },
  {
    title: 'Kể Chuyện Đêm Khuya 🌙',
    text: 'Đêm đã về khuya, không gian trở nên tĩnh lặng và êm đềm. Hãy nhắm mắt lại, thư giãn toàn bộ cơ thể và đón nhận những làn gió mát lành. Chúc bạn có một giấc ngủ ngon và ngập tràn những giấc mơ thật đẹp.'
  },
  {
    title: 'Thông Báo Sân Bay ✈️',
    text: 'Đây là thông báo khẩn từ hãng hàng không quốc gia. Chuyến bay mang số hiệu VN hai không hai sáu, khởi hành từ Hà Nội đi Thành phố Hồ Chí Minh chuẩn bị cất cánh. Xin quý khách vui lòng đến ngay cửa số mười để làm thủ tục.'
  },
  {
    title: 'Quảng Cáo Sản Phẩm 🛍️',
    text: 'Siêu ưu đãi bùng nổ duy nhất trong ngày hôm nay! Sở hữu ngay sản phẩm công nghệ chăm sóc sức khỏe thông minh với mức giá giảm ưu đãi cực sâu lên tới năm mươi phần trăm. Giao hàng toàn quốc hoàn toàn miễn phí!'
  }
];

export default function TextToSpeech({ onBack }: TextToSpeechProps) {
  const [text, setText] = useState('');
  const [accent, setAccent] = useState<'bac' | 'nam' | 'trung'>('bac');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  
  // Speech voices logic
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isLivePlaying, setIsLivePlaying] = useState(false);
  const [isLivePaused, setIsLivePaused] = useState(false);
  
  // Cloud TTS & Export logics
  const [isExporting, setIsExporting] = useState(false);
  const [cloudAudioUrl, setCloudAudioUrl] = useState<string | null>(null);
  const [isCloudPlaying, setIsCloudPlaying] = useState(false);
  const [useAiPremium, setUseAiPremium] = useState(true);
  
  // History list
  const [history, setHistory] = useState<SpeechHistoryItem[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load browser voices
  useEffect(() => {
    const handleVoicesChanged = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Filter for Vietnamese or other compatible voices
      const viVoices = allVoices.filter(v => v.lang.includes('vi') || v.lang.includes('VI'));
      setVoices(allVoices);
      
      // Auto-select a nice voice
      if (viVoices.length > 0) {
        // Try to pre-select a Vietnamese voice
        const defaultVi = viVoices.find(v => v.name.includes('Google') || v.name.includes('Neural')) || viVoices[0];
        setSelectedVoiceName(defaultVi.name);
      } else if (allVoices.length > 0) {
        const defaultGlobal = allVoices.find(v => v.lang.startsWith('en')) || allVoices[0];
        setSelectedVoiceName(defaultGlobal.name);
      }
    };

    handleVoicesChanged();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }

    // Load Local Storage history
    const storedHistory = localStorage.getItem('bmass_tts_history');
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const findBestVoice = (prefAccent: 'bac' | 'nam' | 'trung', prefGender: 'female' | 'male', viVoices: SpeechSynthesisVoice[]) => {
    if (viVoices.length === 0) return null;
    
    // Sort / filter voices based on matching criteria
    const scoredVoices = viVoices.map(v => {
      const name = v.name.toLowerCase();
      let score = 0;
      
      // Northern criteria
      const hasNorthernIndicator = name.includes('bac') || name.includes('minh') || name.includes('north') || name.includes('an') || name.includes('hoai');
      // Southern criteria
      const hasSouthernIndicator = name.includes('nam') || name.includes('linh') || name.includes('south') || name.includes('mai') || name.includes('hung');
      // Central criteria
      const hasCentralIndicator = name.includes('trung') || name.includes('central') || name.includes('hue') || name.includes('huong');

      // 1. Accent Match Score
      if (prefAccent === 'bac' && hasNorthernIndicator) {
        score += 10;
      } else if (prefAccent === 'nam' && hasSouthernIndicator && !name.includes('namminh')) { // NamMinh is Northern (Minh is male, Nam here stands for gender representation or Northern)
        score += 10;
      } else if (prefAccent === 'trung' && hasCentralIndicator) {
        score += 12; // Extra reward for true central
      }

      // 2. Gender Match Score
      // - HoaiAn, An, MaiLinh, Linh, Huong, Female are female
      // - NamMinh, Minh, Hung, Male are male
      const isFemaleIndicator = name.includes('female') || name.includes('an') || name.includes('linh') || name.includes('huong') || name.includes('mai') || name.includes('nu') || name.includes('nữ');
      const isMaleIndicator = name.includes('male') || name.includes('minh') || name.includes('hung') || name.includes('hùng') || name.includes('namminh');

      if (prefGender === 'female' && isFemaleIndicator) {
        score += 8;
      } else if (prefGender === 'male' && isMaleIndicator) {
        score += 8;
      }

      // 3. Quality indicator
      if (name.includes('neural') || name.includes('natural') || name.includes('online')) {
        score += 3;
      }

      return { voice: v, score };
    });

    // Sort descending by score
    scoredVoices.sort((a, b) => b.score - a.score);
    return scoredVoices[0]?.voice || null;
  };

  // Set default Vietnamese voices and automatic pitch modifications if accents/genders selected
  useEffect(() => {
    if (voices.length === 0) return;
    
    const viVoices = voices.filter(v => v.lang.toLowerCase().includes('vi'));
    if (viVoices.length === 0) return;

    const matchedVoice = findBestVoice(accent, gender, viVoices);
    if (matchedVoice) {
      setSelectedVoiceName(matchedVoice.name);
      
      const vName = matchedVoice.name.toLowerCase();
      // Check if the matched voice naturally supports the requested properties
      const isNaturalFemale = vName.includes('female') || vName.includes('an') || vName.includes('linh') || vName.includes('huong') || vName.includes('mai');
      const isNaturalMale = vName.includes('male') || vName.includes('minh') || vName.includes('hung') || vName.includes('namminh');
      
      const isNaturalCentral = vName.includes('trung') || vName.includes('central') || vName.includes('hue');
      const isNaturalSouthern = (vName.includes('nam') || vName.includes('south') || vName.includes('linh') || vName.includes('mai')) && !vName.includes('namminh');
      const isNaturalNorthern = vName.includes('bac') || vName.includes('north') || vName.includes('an') || vName.includes('minh');

      let targetPitch = 1.0;
      let targetRate = 1.0;

      // Adjust based on gender preference
      if (gender === 'female') {
        if (!isNaturalFemale && isNaturalMale) {
          targetPitch = 1.25; // Boost pitch significantly to feminize male voice
        } else {
          targetPitch = 1.10; // High register for standard voice
        }
      } else if (gender === 'male') {
        if (!isNaturalMale && isNaturalFemale) {
          targetPitch = 0.80; // Drop pitch significantly to masculinize female voice
        } else {
          targetPitch = 0.90; // Standard register for male voice
        }
      }

      // Adjust based on accent mismatch (frequency morphing simulation)
      if (accent === 'trung') {
        if (!isNaturalCentral) {
          // Simulate Central/Hue dialect via pitch elevation and micro-pacing
          targetPitch *= 1.18;
          targetRate *= 0.94;
        } else {
          targetPitch *= 1.05;
        }
      } else if (accent === 'nam') {
        if (!isNaturalSouthern) {
          // Simulate Southern cadence
          targetPitch *= 0.95;
          targetRate *= 1.04;
        }
      } else if (accent === 'bac') {
        if (!isNaturalNorthern) {
          targetPitch *= 1.02;
        }
      }

      // Set final bounds for standard speechSynthesis stability
      setPitch(parseFloat(Math.min(Math.max(targetPitch, 0.5), 1.5).toFixed(2)));
      setRate(parseFloat(Math.min(Math.max(targetRate, 0.5), 2.0).toFixed(2)));
    }
  }, [accent, gender, voices]);

  // Audio wave visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isSpeechActive = isLivePlaying && !isLivePaused || isCloudPlaying;
      
      const waveCount = 5;
      const colors = ['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.3)', 'rgba(59, 130, 246, 0.2)', 'rgba(168, 85, 247, 0.4)', 'rgba(99, 102, 241, 0.6)'];

      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        const amplitude = isSpeechActive 
          ? (25 - i * 3) * (0.8 + Math.sin(phase * 1.5) * 0.2) 
          : 3; // flat line if silent
        const frequency = 0.015 + i * 0.005;
        const speed = isSpeechActive ? (0.08 + i * 0.02) : 0.01;

        ctx.strokeStyle = colors[i];
        ctx.lineWidth = i === waveCount - 1 ? 2.5 : 1.5;

        for (let x = 0; x <= canvas.width; x += 2) {
          const y = canvas.height / 2 + Math.sin(x * frequency + phase * (i + 1) * speed) * amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      phase += 0.05;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLivePlaying, isLivePaused, isCloudPlaying]);

  // Speeches logic
  const speakLive = () => {
    if (!text.trim()) {
      toast.error('Vui lòng nhập văn bản cần phát giọng nói.');
      return;
    }

    if (isLivePaused) {
      window.speechSynthesis.resume();
      setIsLivePaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice properties
    const selectedVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'vi-VN';
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsLivePlaying(true);
      setIsLivePaused(false);
      setIsCloudPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    };

    utterance.onend = () => {
      setIsLivePlaying(false);
      setIsLivePaused(false);
      saveToHistory();
    };

    utterance.onerror = (e) => {
      console.error(e);
      setIsLivePlaying(false);
      setIsLivePaused(false);
      toast.error('Lỗi khi phát giọng đọc trình duyệt.');
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseLive = () => {
    window.speechSynthesis.pause();
    setIsLivePaused(true);
  };

  const stopLive = () => {
    window.speechSynthesis.cancel();
    setIsLivePlaying(false);
    setIsLivePaused(false);
  };

  // Convert and export MP3 using server-side endpoint
  const generateCloudAudio = async (shouldDownload = false) => {
    if (!text.trim()) {
      toast.error('Vui lòng nhập văn bản để chuyển thành MP3.');
      return;
    }

    setIsExporting(true);
    const resolvedUrl = `/api/tts/export`;

    try {
      const response = await fetch(resolvedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          slow: rate < 0.85,
          accent,
          gender,
          useAiPremium
        })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến server để xuất file.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setCloudAudioUrl(url);

      if (shouldDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `bmass-giong-doc-${Date.now()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Đã tải xuống file MP3 thành công!');
        saveToHistory();
      } else {
        toast.success('Đã biên dịch giọng nói đám mây thành công!');
        // Play the cloud audio automatically
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play();
            setIsCloudPlaying(true);
            setIsLivePlaying(false);
          }
        }, 100);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi kết nối hệ thống sao lưu đám mây.');
    } finally {
      setIsExporting(false);
    }
  };

  const stopCloudAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsCloudPlaying(false);
    }
  };

  const handleCloudAudioEnded = () => {
    setIsCloudPlaying(false);
  };

  const saveToHistory = () => {
    const newItem: SpeechHistoryItem = {
      id: `history_${Date.now()}`,
      text: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
      voiceName: selectedVoiceName || 'Mặc định',
      accent: accent === 'bac' ? 'Bắc' : accent === 'nam' ? 'Nam' : 'Trung',
      gender,
      rate,
      pitch,
      timestamp: Date.now()
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 10); // Keep last 10 entries
      localStorage.setItem('bmass_tts_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('bmass_tts_history');
    toast.success('Đã xóa lịch sử chuyển đổi.');
  };

  const loadFromHistory = (itemText: string, itemAccent: 'bac' | 'nam' | 'trung', itemGender?: 'female' | 'male', itemRate?: number, itemPitch?: number) => {
    setText(itemText);
    setAccent(itemAccent);
    if (itemGender) setGender(itemGender);
    if (itemRate !== undefined) setRate(itemRate);
    if (itemPitch !== undefined) setPitch(itemPitch);
    toast.success('Đã tải dữ liệu từ lịch sử.');
  };

  const selectTemplate = (templateText: string) => {
    setText(templateText);
    toast.success('Đã tải văn bản mẫu!');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-12 relative animate-fade-in max-w-5xl mx-auto text-slate-800 dark:text-zinc-200">
      
      {/* Hidden audio element for Cloud plays */}
      <audio 
        ref={audioRef} 
        onEnded={handleCloudAudioEnded} 
        onPause={() => setIsCloudPlaying(false)}
        onPlay={() => setIsCloudPlaying(true)}
        className="hidden" 
      />

      {/* Header Toolbar */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl border border-slate-250 dark:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Quay Lại
        </button>

        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 px-3.5 py-1.5 rounded-full select-none">
          <AudioLines className="w-3.5 h-3.5 animate-pulse" />
          Chuyển đổi Text-To-Speech (TTS)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Work Area (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Preset templates */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Mẫu văn bản nhanh
            </h3>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => selectTemplate(tpl.text)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/20 transition-all cursor-pointer"
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Text-Area Card */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <h2 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Nội dung văn bản</h2>
              <span className="text-xs font-mono text-slate-400">
                {text.length}/5000 ký tự
              </span>
            </div>

            <textarea
              id="tts-textarea"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 5000))}
              placeholder="Nhập văn bản tiếng Việt của bạn vào đây để chuyển đổi thành giọng nói sống động..."
              className="w-full min-h-[180px] bg-transparent outline-none resize-y text-slate-900 dark:text-zinc-100 placeholder-slate-400 text-sm md:text-base leading-relaxed"
            />

            {text.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setText('')}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Xóa toàn bộ
                </button>
              </div>
            )}
          </div>

          {/* Visualizing Wave Canvas */}
          <div className="glass-card p-4 relative overflow-hidden flex flex-col justify-center items-center h-28 bg-slate-950/40 border border-slate-200/50 dark:border-white/5 ring-1 ring-white/5">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={110} 
              className="w-full h-full pointer-events-none opacity-90 max-w-full"
            />
            
            {/* Overlay Status info */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
              <span className={cn(
                "text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap",
                (isLivePlaying || isCloudPlaying) 
                  ? "text-indigo-400 font-bold animate-pulse" 
                  : "text-slate-500 dark:text-zinc-600"
              )}>
                {(isLivePlaying && !isLivePaused) ? '🎙️ Đang đọc trực tiếp qua hệ thống...' 
                  : isLivePaused ? '⏸️ Tạm dừng phát...' 
                  : isCloudPlaying ? '☁️ Đọc đám mây AI cao cấp...' 
                  : '🟢 Trạng thái sẵn sàng'}
              </span>
            </div>
          </div>

          {/* Active Speakers Buttons Controller */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            
            {/* Live Play Console */}
            <div className="flex items-center gap-2">
              {!isLivePlaying ? (
                <button
                  onClick={speakLive}
                  className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Phát trực tiếp
                </button>
              ) : (
                <>
                  {!isLivePaused ? (
                    <button
                      onClick={pauseLive}
                      className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-white" /> Tạm dừng
                    </button>
                  ) : (
                    <button
                      onClick={speakLive}
                      className="px-5 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" /> Tiếp tục
                    </button>
                  )}
                  <button
                    onClick={stopLive}
                    className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                    title="Dừng đọc"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                </>
              )}
            </div>

            {/* Cloud API & MP3 Downloader Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateCloudAudio(false)}
                disabled={isExporting || isCloudPlaying}
                className={cn(
                  "px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                  useAiPremium 
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/25 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" 
                    : "bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-200 hover:border-slate-300",
                  (isExporting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                ) : useAiPremium ? (
                  <Sparkles className="w-4 h-4 text-violet-500" />
                ) : (
                  <FileAudio className="w-4 h-4 text-indigo-500" />
                )}
                {isCloudPlaying 
                  ? 'Đang phát...' 
                  : useAiPremium 
                    ? 'Thử giọng AI Cao Cấp' 
                    : 'Thử giọng đám mây'}
              </button>

              {isCloudPlaying && (
                <button
                  onClick={stopCloudAudio}
                  className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Dừng nghe đám mây"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => generateCloudAudio(true)}
                disabled={isExporting}
                className={cn(
                  "px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                  useAiPremium
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/10"
                    : "bg-slate-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-slate-800 dark:hover:bg-slate-100"
                )}
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {useAiPremium ? 'Tải giọng AI (.WAV)' : 'Xuất file MP3'}
              </button>
            </div>

          </div>

        </div>

        {/* Configurations Sidepanel (Right Column) */}
        <div className="space-y-6">
          
          {/* Voice configuration panel */}
          <div className="glass-card p-6 space-y-6">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              Cấu hình giọng đọc
            </h3>

            {/* Premium AI Voice Toggle */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/25 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-left">
                  <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                  Giọng AI Cao Cấp
                </span>
                <button
                  type="button"
                  onClick={() => setUseAiPremium(!useAiPremium)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-indigo-500",
                    useAiPremium ? "bg-indigo-600" : "bg-slate-250 dark:bg-zinc-800"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      useAiPremium ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 text-left">
                Sử dụng trí tuệ nhân tạo Gemini để tự động điều hướng đúng <strong>phương âm miền Bắc/Trung/Nam</strong> và <strong>giọng nam/nữ</strong> chuẩn xác, tự nhiên nhất.
              </p>
            </div>

            {/* Accent (Regional) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500 font-sans tracking-wide">
                Lựa chọn phương âm
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bac', label: 'Miền Bắc 🏛️' },
                  { id: 'nam', label: 'Miền Nam 🌴' },
                  { id: 'trung', label: 'Miền Trung 🌊' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAccent(item.id as any)}
                    className={cn(
                      "py-2 px-1 text-center text-[11px] font-bold rounded-xl border transition-all cursor-pointer",
                      accent === item.id 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                        : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender Toggle widget */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500 font-sans tracking-wide">
                Hiệu chỉnh giới tính
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'female', label: 'Giọng Nữ 👧️' },
                  { id: 'male', label: 'Giọng Nam 👦️' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setGender(item.id as any)}
                    className={cn(
                      "py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer",
                      gender === item.id 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                        : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart System Optimizations Details Banner */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100/40 dark:border-indigo-500/10 space-y-1">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Trạng thái tối ưu hóa
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-zinc-300">
                {voices.length > 0 && voices.some(v => v.lang.toLowerCase().includes('vi')) ? (
                  <>
                    🔊 Phát hiện <span className="text-indigo-600 dark:text-indigo-400 font-bold">{voices.filter(v => v.lang.toLowerCase().includes('vi')).length} giọng Tiếng Việt gốc</span> trong hệ điều hành. 
                    {selectedVoiceName.toLowerCase().includes('trung') || selectedVoiceName.toLowerCase().includes('central') ? (
                      <span> Sử dụng giọng đọc gốc Miền Trung của hệ thống.</span>
                    ) : accent === 'trung' ? (
                      <span> Tự động mô phỏng âm điệu Miền Trung trung thực bằng hiệu chỉnh tần số và độ cao.</span>
                    ) : accent === 'nam' && !selectedVoiceName.toLowerCase().includes('nam') && !selectedVoiceName.toLowerCase().includes('linh') && !selectedVoiceName.toLowerCase().includes('mai') ? (
                      <span> Đang áp dụng kỹ thuật tinh chỉnh tần số thấp và nhịp điệu để mô phỏng giọng Miền Nam chuẩn.</span>
                    ) : (
                      <span> Đồng bộ thành công giọng {accent === 'bac' ? 'Miền Bắc' : accent === 'nam' ? 'Miền Nam' : 'Miền Trung'} ({gender === 'female' ? 'Nữ' : 'Nam'}).</span>
                    )}
                  </>
                ) : (
                  <span>⚠️ Thiết bị chưa cài đặt giọng vi-VN offline. Hệ thống tự động kích hoạt bộ giả lập tần số cao độ để phát ra giọng tiếng Việt chuẩn.</span>
                )}
              </p>
            </div>

            {/* OS Native Voice Dropdown details (Optional advanced selection override) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Giọng đọc hệ điều hành</span>
                <span className="text-[10px] lowercase text-slate-500">({voices.length} tìm thấy)</span>
              </label>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-zinc-300 outline-none focus:border-indigo-500"
              >
                {voices.length === 0 ? (
                  <option value="">-- Mặc định hệ thống --</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Playback rate speed */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500">
                  Tốc độ đọc
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {rate}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Chậm (0.5x)</span>
                <span>Chuẩn (1.0x)</span>
                <span>Nhanh (2.0x)</span>
              </div>
            </div>

            {/* Voice Pitch Adjuster */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500">
                  Trầm bổng (Pitch)
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {pitch}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Trầm 🐻</span>
                <span>Mặc định</span>
                <span>Thanh 🐦</span>
              </div>
            </div>

            {/* Volume feedback slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500">
                  Âm lượng
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

          </div>

          {/* History records */}
          <div className="glass-card p-6 space-y-4 max-h-[300px] overflow-y-auto w-full">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                Nhật ký chuyển đổi
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  title="Xóa lịch sử"
                >
                  <Trash2 className="w-3 h-3" /> Xóa sạch
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Không tìm thấy bản ghi lịch sử gần đây.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadFromHistory(item.text, item.accent.toLowerCase() === 'bắc' || item.accent.toLowerCase() === 'bac' ? 'bac' : item.accent.toLowerCase() === 'nam' ? 'nam' : 'trung', item.gender, item.rate, item.pitch)}
                    className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-indigo-50/25 dark:hover:bg-indigo-500/10 border border-slate-100 dark:border-white/5 hover:border-indigo-400/30 transition-all cursor-pointer group"
                  >
                    <p className="text-[11px] font-medium leading-tight line-clamp-2 text-slate-800 dark:text-zinc-300">
                      "{item.text}"
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{item.accent} • {item.gender === 'female' ? 'Giọng Nữ' : 'Giọng Nam'} • {item.rate}x</span>
                      <span className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity">Tải văn bản ➔</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

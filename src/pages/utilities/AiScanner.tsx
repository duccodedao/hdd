import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scan, FileText, Upload, Loader2, Copy, Check, Sparkles, ArrowLeft, Trash2, Edit3, Box } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface AiScannerProps {
  onBack: () => void;
}

export default function AiScanner({ onBack }: AiScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.includes('image')) {
        const reader = new FileReader();
        reader.onload = (event) => setPreview(event.target?.result as string);
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
        setPreview('pdf-file');
      }
      setResult('');
    }
  };

  const processWithAi = async () => {
    if (!file || !preview) return;
    
    setIsProcessing(true);
    try {
      const prompt = `Bạn là một chuyên gia OCR cao cấp. Hãy đọc và trích xuất TOÀN BỘ văn bản từ tài liệu này. 
      LƯU Ý QUAN TRỌNG:
      1. Sửa lỗi chính tả tự động.
      2. Giữ nguyên định dạng đoạn văn, tiêu đề.
      3. Nếu là bảng biểu, hãy chuyển thành văn bản có cấu trúc dễ đọc.
      4. Chỉ trả về phần văn bản đã trích xuất, không thêm lời chào hay giải thích.`;

      let base64Data = '';
      let mimeType = file.type;

      if (file.type.includes('image')) {
        base64Data = preview.split(',')[1];
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
          reader.readAsDataURL(file);
        });
        base64Data = await base64Promise;
        mimeType = 'application/pdf';
      }

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi xử lý AI');
      }

      const data = await response.json();
      setResult(data.text || '');
      toast.success('Đã quét và trích xuất bằng AI thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi xử lý bằng AI. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Đã sao chép vào bộ nhớ tạm');
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-12 relative min-h-screen animate-fade-in font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-100 dark:border-white/5 pb-8">
        <div className="space-y-1">
          <button 
            onClick={onBack} 
            className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5 mb-6 group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay Lại
          </button>
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                <Scan className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                  Quét Văn Bản <span className="text-indigo-500 italic">AI Neural</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Trích xuất văn bản từ hình ảnh và PDF với độ chính xác Neural Network.</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái AI</span>
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs uppercase tracking-tighter">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Hệ thống Sẵn sàng
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload & Preview (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={cn(
               "w-full aspect-[4/3] rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative group",
               preview ? "border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl" : "border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] bg-white dark:bg-zinc-900/50"
            )}
          >
            {preview ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative">
                {preview === 'pdf-file' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-zinc-950">
                    <div className="w-24 h-24 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                       <FileText className="w-10 h-10" />
                    </div>
                    <div className="text-center space-y-1">
                       <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block max-w-[250px] truncate px-4">{file?.name}</span>
                       <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Tài liệu PDF</span>
                    </div>
                  </div>
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-contain p-4" />
                )}
                
                <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setResult(''); }}
                     className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                   >
                     <Trash2 className="w-3.5 h-3.5" /> Thay đổi tệp
                   </button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center space-y-6 px-8">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500 border border-slate-200/50 dark:border-white/5">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <div>
                   <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Tải tài liệu lên</h3>
                   <div className="flex flex-wrap justify-center gap-2">
                      {['JPG', 'PNG', 'WEBP', 'PDF'].map(ext => (
                         <span key={ext} className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-white/5 uppercase tracking-widest">{ext}</span>
                      ))}
                   </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">Nhấn để chọn hoặc kéo thả tệp vào vùng này để bắt đầu nhận diện AI.</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
          </div>

          {preview && !result && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={processWithAi}
              disabled={isProcessing}
              className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] shadow-2xl hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  Đang phân tích Neural <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  Khởi động quét AI <Sparkles className="w-4 h-4" />
                </>
              )}
            </motion.button>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3 border border-indigo-500/20">
                   <Edit3 size={16} />
                </div>
                <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1.5 ">Tự động sửa lỗi</h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">AI tự động chuẩn hóa chính tả và ngữ pháp sau khi trích xuất.</p>
             </div>
             <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 border border-emerald-500/20">
                   <Box size={16} />
                </div>
                <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1.5">Giữ cấu hình</h4>
                <p className="text-[9px] text-slate-500 leading-relaxed">Bảo lưu cấu trúc đoạn văn, tiêu đề và danh sách tài liệu.</p>
             </div>
          </div>
        </div>

        {/* Right Side: Result (Span 7) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-[500px]">
           <AnimatePresence mode="wait">
             {result ? (
               <motion.div 
                 key="result"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="flex flex-col h-full space-y-4"
               >
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-indigo-500" />
                       <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">Dữ liệu trích xuất</h3>
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all text-slate-600 dark:text-zinc-300 shadow-sm"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Đã sao chép' : 'Sao chép văn bản'}
                    </button>
                 </div>
                 
                 <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-inner overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-zinc-300 font-sans custom-scrollbar">
                    {result}
                 </div>

                 <div className="pt-2 flex justify-between items-center px-4">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Loader2 className="w-3 h-3 text-emerald-500" /> Neural processing complete
                    </span>
                    <button 
                      onClick={() => setResult('')}
                      className="text-[9px] font-bold text-rose-500 hover:underline uppercase tracking-widest"
                    >
                       Xóa kết quả
                    </button>
                 </div>
               </motion.div>
             ) : (
               <motion.div 
                 key="empty"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] bg-white dark:bg-zinc-900/50"
               >
                  <div className="space-y-4 max-w-xs transition-opacity duration-500">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6 opacity-40">
                       <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-[0.2em]">Sẵn sàng tiếp nhận</h3>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium leading-relaxed">Khi bạn tải tài liệu và nhấn quét, kết quả phân tích AI sẽ hiển thị tại không gian này.</p>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

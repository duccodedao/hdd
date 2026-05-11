import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scan, FileText, Upload, Loader2, Copy, Check, Sparkles, ArrowLeft, Trash2, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { GoogleGenAI } from '@google/genai';

interface AiScannerProps {
  onBack: () => void;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
        // For PDF, we just set a "flag" or special string for preview
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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
      });

      setResult(response.text || '');
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
    <div className="max-w-6xl mx-auto px-6 py-8 lg:py-16 relative min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-10 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left Side: Upload & Preview */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-400">AI Powered OCR</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-medium text-white tracking-tighter uppercase italic leading-none">
              Scan to <span className="text-indigo-400">Text.</span>
            </h1>
            <p className="text-zinc-400 text-base font-medium leading-relaxed">
              Trích xuất văn bản từ tài liệu với độ chính xác cao nhờ sức mạnh AI.
            </p>
          </div>

          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={cn(
               "w-full h-48 md:h-64 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative group",
               preview ? "border-white/10 bg-zinc-900 shadow-2xl" : "border-white/10 hover:border-indigo-500/50 hover:bg-white/5 bg-zinc-900"
            )}
          >
            {preview ? (
              <>
                {preview === 'pdf-file' ? (
                  <div className="flex flex-col items-center gap-4">
                    <FileText className="w-16 h-16 text-indigo-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{file?.name}</span>
                  </div>
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setResult(''); }}
                     className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 px-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-zinc-500 group-hover:text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase italic">Tải tài liệu lên</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Hỗ trợ JPG, PNG, WEBP, PDF</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
          </div>

          {preview && !result && (
            <button 
              onClick={processWithAi}
              disabled={isProcessing}
              className="w-full h-12 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-indigo-500/20"
            >
              {isProcessing ? (
                <>
                  Đang xử lý <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  Bắt đầu quét AI <Scan className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Side: Result */}
        <div className="h-full min-h-[400px]">
           <AnimatePresence mode="wait">
             {result ? (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex flex-col h-full space-y-4"
               >
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest italic">Kết quả</h3>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors text-zinc-300"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Đã chép' : 'Sao chép'}
                    </button>
                 </div>
                 
                 <div className="flex-1 bg-zinc-900 border border-white/5 rounded-3xl p-6 md:p-8 shadow-inner overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 font-serif">
                    {result}
                 </div>
               </motion.div>
             ) : (
               <div className="h-full flex items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-3xl bg-zinc-900/50">
                  <div className="space-y-3">
                    <FileText className="w-10 h-10 text-zinc-700 mx-auto" />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">Kết quả sẽ hiển thị tại đây</p>
                  </div>
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

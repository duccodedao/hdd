import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FileText, Upload, Loader2, Download, ArrowLeft, FileType } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { cn, safeJsonStringify } from '../../lib/utils';
import toast from 'react-hot-toast';

interface PdfToWordProps {
  onBack: () => void;
}

export default function PdfToWord({ onBack }: PdfToWordProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResultBlob(null);
    } else if (selectedFile) {
      toast.error('Vui lòng chọn tệp PDF');
    }
  };

  const convertToWord = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;

      const prompt = `Bạn là một chuyên gia chuyển đổi tài liệu. Hãy trích xuất toàn bộ văn bản và cấu trúc cơ bản từ tệp PDF này. 
      Trả về văn bản thuần túy đã được định dạng tốt (giữ lại các tiêu đề, danh sách). 
      KHÔNG thêm các ký tự đặc biệt như Markdown (không dùng ** hay ##), chỉ trả về văn bản sạch để lưu vào file Word.`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify({
          model: "gemini-3.5-flash",
          contents: {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'application/pdf'
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
      const text = data.text || '';
      
      // Create Word Doc
      const doc = new Document({
        sections: [{
          properties: {},
          children: text.split('\n').map(line => 
            new Paragraph({
              children: [new TextRun(line)],
            })
          ),
        }],
      });

      const blob = await Packer.toBlob(doc);
      setResultBlob(blob);
      toast.success('Chuyển đổi thành công! Bạn có thể tải xuống kết quả.');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi chuyển đổi. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultBlob || !file) return;
    saveAs(resultBlob, `${file.name.replace('.pdf', '')}-BmassConverted.docx`);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 lg:py-12 relative min-h-screen font-sans animate-fade-in">
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
                <FileType className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                  Chuyển đổi <span className="text-indigo-500 italic">PDF sang Word</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Sử dụng trí tuệ nhân tạo để trích xuất và tái cấu trúc tài liệu PDF sang Word.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-10">
        <div 
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
             "w-full h-56 md:h-72 rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative group",
             file ? "border-indigo-500/50 bg-white dark:bg-zinc-900 shadow-2xl" : "border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] bg-white dark:bg-zinc-900/50"
          )}
        >
          <div className="text-center space-y-6 px-8">
            <div className={cn(
              "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-2 transition-all duration-500 border shadow-sm",
              file ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5 group-hover:scale-110 group-hover:text-indigo-500"
            )}>
              {file ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
            </div>
            {file ? (
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider italic truncate max-w-[300px]">{file.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                <div className="pt-4">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setFile(null); setResultBlob(null); }}
                     className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                   >
                     Hủy chọn tệp
                   </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Tải tệp PDF của bạn</h3>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed">Nhấn để trình duyệt tệp hoặc kéo thả trực tiếp vào đây</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          {file && !resultBlob && (
            <button 
              onClick={convertToWord}
              disabled={isProcessing}
              className="w-full sm:w-auto h-14 px-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] shadow-xl hover:bg-slate-800 dark:hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  AI Đang chuyển đổi <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                </>
              ) : (
                <>
                  Bắt đầu Chuyển sang Word <FileType className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {resultBlob && (
             <div className="w-full sm:w-auto flex flex-col items-center gap-4">
                <button 
                  onClick={downloadResult}
                  className="h-14 px-12 bg-indigo-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 animate-in fade-in zoom-in"
                >
                  Tải xuống tệp Word <Download className="w-4 h-4" />
                </button>
                <button 
                   onClick={() => { setFile(null); setResultBlob(null); }}
                   className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
                >
                    Thực hiện tệp mới
                </button>
             </div>
          )}
        </div>

        <div className="p-8 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/10 dark:bg-white/5 dark:border-white/10 shadow-sm">
           <div className="flex gap-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0">
                 <FileType className="w-5 h-5" />
              </div>
              <div className="space-y-2 pt-1">
                 <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Ghi chú về nhận diện AI</h4>
                 <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                   Hệ thống sử dụng mô hình ngôn ngữ lớn để đọc và hiểu cấu trúc văn bản. Các thành phần như bảng biểu phức tạp hoặc biểu đồ có thể sẽ được chuyển đổi sang dạng văn bản thuần có cấu trúc để đảm bảo tính biên tập dễ dàng nhất.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

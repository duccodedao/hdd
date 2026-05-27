import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Loader2, Download, Scissors } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { PDFDocument } from 'pdf-lib';

interface PdfSplitterProps {
  onBack: () => void;
}

export default function PdfSplitter({ onBack }: PdfSplitterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageRange, setPageRange] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        setTotalPages(pdfDoc.getPageCount());
        setFile(selectedFile);
        setPageRange(`1-${pdfDoc.getPageCount()}`);
        setResultUrl(null);
      } catch (err) {
        toast.error('Không thể đọc file PDF. Hãy chắc chắn tệp không bị lỗi.');
      }
    } else if (selectedFile) {
      toast.error('Vui lòng chọn tệp PDF');
    }
  };

  const parsePageRange = (rangeText: string, max: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeText.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          for (let i = start; i <= end; i++) {
            if (i <= max) pages.add(i);
          }
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num) && num > 0 && num <= max) {
          pages.add(num);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const splitPdf = async () => {
    if (!file) return;
    
    const pagesToExtract = parsePageRange(pageRange, totalPages);
    if (pagesToExtract.length === 0) {
      toast.error('Khoảng trang không hợp lệ.');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      
      const newPdf = await PDFDocument.create();
      
      // Page indices are 0-based in pdf-lib
      const indices = pagesToExtract.map(p => p - 1);
      const copiedPages = await newPdf.copyPages(originalPdf, indices);
      
      copiedPages.forEach((page) => {
        newPdf.addPage(page);
      });

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      
      toast.success('Đã tách tệp PDF!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tách. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
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
             <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                <Scissors className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                  <span className="text-rose-500 italic">Tách</span> trang PDF
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Trích xuất những trang quan trọng hoặc tách riêng từng phần của tài liệu.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-10">
        <div 
          onClick={() => !file && !isProcessing && fileInputRef.current?.click()}
          className={cn(
             "w-full min-h-[20rem] md:min-h-[24rem] py-12 rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative group",
             file ? "border-rose-500/20 bg-white dark:bg-zinc-900 shadow-xl" : "cursor-pointer border-slate-200 dark:border-white/10 hover:border-rose-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] bg-white dark:bg-zinc-900/50"
          )}
        >
          <div className="text-center space-y-6 px-8 relative z-10 w-full max-w-lg mx-auto">
            <div className={cn(
              "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-2 transition-all duration-500 border shadow-sm",
              file ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5 group-hover:scale-110 group-hover:text-rose-500"
            )}>
              {file ? <Scissors className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
            </div>
            
            {file ? (
              <div className="space-y-4">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider italic truncate">{file.name}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{totalPages} Trang • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>

                {!resultUrl && (
                  <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-left">
                     <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-2">Trang Cần Trích Xuất</label>
                     <input 
                       type="text" 
                       value={pageRange}
                       onChange={(e) => setPageRange(e.target.value)}
                       placeholder={`Ví dụ: 1-5, 8, 11-13`}
                       className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder:text-slate-400"
                     />
                     <p className="text-[10px] text-slate-500 mt-2">Tổng số trang hiển có: <strong className="text-rose-500">{totalPages}</strong>. Có thể dùng dấu phẩy hoặc gạch ngang (VD: 1,3,5-10).</p>
                  </div>
                )}
                
                <div className="pt-2 flex justify-center gap-4">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setFile(null); setResultUrl(null); }}
                     className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline px-4 py-2"
                   >
                     Chọn Tệp Khác
                   </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Tải tệp PDF để tách</h3>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed">Nhấn để trình duyệt tệp hoặc kéo thả trực tiếp vào đây</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          {file && !resultUrl && (
            <button 
              onClick={splitPdf}
              disabled={isProcessing}
              className="w-full sm:w-auto h-14 px-12 bg-rose-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] shadow-xl hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  Đang cắt dữ liệu <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  Bắt đầu tách <Scissors className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {resultUrl && (
             <div className="w-full sm:w-auto flex flex-col items-center gap-4">
                <div className="text-center mb-2">
                    <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Đã tách thành công</p>
                    <p className="text-[10px] text-slate-500 mt-1">Từ trang {pageRange}</p>
                </div>
                <a 
                  href={resultUrl}
                  download={`${file?.name.replace('.pdf', '')}-split.pdf`}
                  className="h-14 px-14 bg-rose-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.25em] shadow-xl shadow-rose-500/20 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-3 w-full sm:w-auto animate-in zoom-in fade-in"
                >
                  Tải Xuống Kết Quả <Download className="w-4 h-4" />
                </a>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

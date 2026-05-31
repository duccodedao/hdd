import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Upload, Loader2, Download, Trash2, GripVertical, FilePlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { PDFDocument } from 'pdf-lib';
import { useConfirmStore } from '../../store/confirmStore';

interface PdfMergerProps {
  onBack: () => void;
}

interface PDFFileItem {
  id: string;
  file: File;
  previewUrl: string;
}

export default function PdfMerger({ onBack }: PdfMergerProps) {
  const [pdfFiles, setPdfFiles] = useState<PDFFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirmStore();

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
      if (files.length !== e.target.files.length) {
        toast.error('Chỉ hỗ trợ file định dạng PDF.');
      }
      
      const newItems = files.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      
      setPdfFiles(prev => [...prev, ...newItems]);
      setResultPdfUrl(null);
    }
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPdfFiles(prev => prev.filter(item => item.id !== id));
    setResultPdfUrl(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === pdfFiles.length - 1)) return;
    
    const newItems = [...pdfFiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setPdfFiles(newItems);
    setResultPdfUrl(null);
  };

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      toast.error('Vui lòng chọn ít nhất 2 file PDF để ghép.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const finalDoc = await PDFDocument.create();

      for (const item of pdfFiles) {
        const arrayBuffer = await item.file.arrayBuffer();
        const currentPdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await finalDoc.copyPages(currentPdf, currentPdf.getPageIndices());
        copiedPages.forEach((page) => {
          finalDoc.addPage(page);
        });
      }

      const pdfBytes = await finalDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultPdfUrl(url);
      
      toast.success('Đã ghép tài liệu thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi khi ghép PDF. Hãy thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    openConfirm({
      title: 'Xóa danh sách file',
      message: 'Bạn có chắc muốn xóa tất cả file đang chọn?',
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
      onConfirm: () => {
        setPdfFiles([]);
        setResultPdfUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="w-full flex justify-center py-4 sm:py-8 lg:py-12 min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-4xl space-y-6 animate-fade-in px-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-100 dark:border-white/5 pb-8">
          <div className="space-y-1">
            <button 
              onClick={onBack} 
              className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5 mb-6 group w-fit"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay Lại
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center border border-orange-200 dark:border-orange-500/30">
                <FilePlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                  Ghép <span className="text-orange-500 italic">Nhiều PDF</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Ghép nhiều file PDF thành 1 định dạng duy nhất.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Upload Area */}
            <div 
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all bg-slate-50 dark:bg-zinc-900/50 cursor-pointer overflow-hidden group",
                "border-slate-300 dark:border-white/15 hover:border-orange-400 dark:hover:border-orange-500"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFilesChosen} 
                accept="application/pdf"
                multiple
                className="hidden" 
              />
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-lg text-slate-800 dark:text-zinc-200 font-bold mb-1">Tải file lên</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-500 text-center">Bấm để chọn nhiều tài liệu PDF</p>
            </div>

            {/* List Files */}
            {pdfFiles.length > 0 && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white">File đã chọn ({pdfFiles.length})</h3>
                  <button onClick={clearAll} className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">Xóa Tất Cả</button>
                </div>
                
                <div className="space-y-2">
                  <AnimatePresence>
                    {pdfFiles.map((item, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-xl"
                      >
                        <div className="flex flex-col gap-1 items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
                          <button onClick={() => moveItem(index, 'up')} className="p-0.5 hover:bg-slate-200 rounded" disabled={index === 0}>
                            <GripVertical className="w-3 h-3 rotate-90" />
                          </button>
                          <button onClick={() => moveItem(index, 'down')} className="p-0.5 hover:bg-slate-200 rounded" disabled={index === pdfFiles.length - 1}>
                            <GripVertical className="w-3 h-3 rotate-90" />
                          </button>
                        </div>
                        
                        <div className="w-10 h-10 rounded border bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <FilePlus className="w-5 h-5 text-orange-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 truncate">{item.file.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={(e) => removeFile(item.id, e)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="pt-6">
                  <button
                    onClick={mergePdfs}
                    disabled={isProcessing || pdfFiles.length < 2}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Đang Ghép...</>
                    ) : (
                      <><FilePlus className="w-4 h-4" /> Bắt Đầu Ghép</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-full">
            <div className="bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-2xl w-full h-[600px] lg:h-full min-h-[500px] flex overflow-hidden relative">
              {resultPdfUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-800">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <FilePlus className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Đã đóng gói thành công!</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 max-w-sm">
                    Việc xem trước PDF có thể bị trình duyệt chặn. Vui lòng tải xuống tệp tin đã ghép để xem kết quả.
                  </p>
                  <a 
                    href={resultPdfUrl} 
                    download="Merged-Document.pdf"
                    className="flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 text-white rounded-xl font-bold uppercase tracking-widest transition-all hover:-translate-y-1"
                  >
                    <Download className="w-5 h-5" /> Tải Xuống Ngay
                  </a>
                </div>
              ) : (
                <div className="m-auto flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600 p-8 text-center space-y-4">
                  <FilePlus className="w-16 h-16 opacity-20" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Khu vực Xem trước</h4>
                    <p className="text-sm mt-1">Kết quả sau khi đổi sẽ hiển thị tại đây.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileImage, Download, X, Plus, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ImageToPdfProps {
  onBack: () => void;
}

export default function ImageToPdf({ onBack }: ImageToPdfProps) {
  const [images, setImages] = useState<{ id: string; url: string; file: File }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file
    }));
    setImages(prev => [...prev, ...newImages]);
    setResultBlob(null);
  };

  const removeImage = (id: string, url: string) => {
    URL.revokeObjectURL(url);
    setImages(prev => prev.filter(img => img.id !== id));
    setResultBlob(null);
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    
    try {
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        const { file } = images[i];
        const imgData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        if (i > 0) pdf.addPage();
        
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => (img.onload = resolve));

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = img.width / img.height;
        let width = pageWidth - 20;
        let height = width / ratio;

        if (height > pageHeight - 20) {
          height = pageHeight - 20;
          width = height * ratio;
        }

        pdf.addImage(imgData, 'JPEG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height);
      }

      const blob = pdf.output('blob');
      setResultBlob(blob);
      toast.success('Đã tạo PDF thành công! Bạn có thể tải xuống kết quả.');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Bmass-Images-Converted.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 lg:py-12 relative min-h-screen font-sans animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-100 dark:border-white/5 pb-8">
        <div className="space-y-1">
          <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-500 mb-4 transition-all group w-fit">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Quay lại Thực đơn
          </button>
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                <FileImage className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                  Chuyển đổi <span className="text-rose-500 italic">Ảnh sang PDF</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Đóng gói tập hợp hình ảnh thành duy nhất một tệp PDF chuyên nghiệp.</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {images.length > 0 && !resultBlob && (
              <button 
                onClick={() => { setImages([]); setResultBlob(null); }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                 Xóa tất cả
              </button>
           )}
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          <label className="aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer group bg-white dark:bg-zinc-900 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all">
               <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
            </div>
            <span className="text-[9px] font-black text-slate-400 group-hover:text-indigo-500 uppercase tracking-[0.2em] text-center px-4">Tải ảnh lên</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          {images.map((img, idx) => (
            <motion.div 
              key={img.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group bg-white dark:bg-zinc-900"
            >
              <img src={img.url} alt="upload" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                 <button 
                   onClick={() => removeImage(img.id, img.url)}
                   className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="absolute top-4 left-4 w-7 h-7 rounded-lg bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-center text-[9px] font-black text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/10 z-10">
                {idx + 1}
              </div>
            </motion.div>
          ))}
        </div>

        {images.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6"
          >
            <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
               <div className="pl-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sẵn sàng đóng gói</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{images.length} tập tin hình ảnh</div>
               </div>

               {!resultBlob ? (
                  <button 
                    onClick={generatePdf}
                    disabled={isProcessing}
                    className="h-12 px-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 dark:hover:bg-zinc-100 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        Đang tạo <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                      </>
                    ) : (
                      <>
                        Xuất PDF <FileText className="w-4 h-4" />
                      </>
                    )}
                  </button>
               ) : (
                  <button 
                    onClick={downloadResult}
                    className="h-12 px-8 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3 animate-in zoom-in"
                  >
                    Tải PDF <Download className="w-4 h-4" />
                  </button>
               )}
            </div>
          </motion.div>
        )}

        {images.length === 0 && (
           <div className="py-24 text-center space-y-6 opacity-40">
              <div className="w-20 h-20 rounded-[2.5rem] bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center">
                 <FileImage className="w-8 h-8 text-slate-400" />
              </div>
              <div className="space-y-1">
                 <h3 className="text-sm font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.25em]">Chưa có hình ảnh</h3>
                 <p className="text-[10px] text-slate-400 dark:text-zinc-600 font-medium tracking-wider">Tải lên các tệp ảnh từ thiết bị để bắt đầu khởi tạo PDF.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="max-w-4xl mx-auto px-6 py-8 lg:py-16 relative min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-10 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
      </button>

      <div className="space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-medium text-white tracking-tighter uppercase italic leading-none">
            Image to <span className="text-indigo-400">PDF.</span>
          </h1>
          <p className="text-zinc-400 text-base font-medium max-w-xl">
            Chuyển đổi hình ảnh sang tập tin PDF chất lượng cao.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <label className="aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer group bg-zinc-900/50">
            <Plus className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400 mb-2" />
            <span className="text-[8px] font-bold text-zinc-500 group-hover:text-indigo-400 uppercase tracking-widest text-center px-4">Thêm ảnh</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          {images.map((img, idx) => (
            <motion.div 
              key={img.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-sm group"
            >
              <img src={img.url} alt="upload" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button 
                   onClick={() => removeImage(img.id, img.url)}
                   className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-zinc-900/90 backdrop-blur-md flex items-center justify-center text-[9px] font-bold text-white shadow-sm border border-white/10">
                {idx + 1}
              </div>
            </motion.div>
          ))}
        </div>

        {images.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
            {!resultBlob ? (
              <button 
                onClick={generatePdf}
                disabled={isProcessing}
                className="w-full sm:w-auto h-12 px-10 bg-white text-black rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    Đang xử lý <Loader2 className="w-4 h-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Xuất PDF ({images.length} ảnh) <FileText className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button 
                 onClick={downloadResult}
                 className="w-full sm:w-auto h-12 px-10 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 animate-in fade-in zoom-in"
               >
                 Tải xuống kết quả <Download className="w-4 h-4" />
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

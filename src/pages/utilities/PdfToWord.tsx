import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FileText, Upload, Loader2, Download, ArrowLeft, FileType } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { GoogleGenAI } from '@google/genai';

interface PdfToWordProps {
  onBack: () => void;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
      });

      const text = response.text || '';
      
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
    <div className="max-w-4xl mx-auto px-6 py-8 lg:py-16 relative min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-10 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
      </button>

      <div className="space-y-10">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-medium text-white tracking-tighter uppercase italic leading-none">
            PDF to <span className="text-indigo-400">Word.</span>
          </h1>
          <p className="text-zinc-400 text-base font-medium max-w-xl">
            Sử dụng AI để chuyển đổi tệp PDF sang định dạng Word (.docx) chuyên nghiệp.
          </p>
        </div>

        <div 
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
             "w-full h-48 md:h-64 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative group",
             file ? "border-indigo-500/50 bg-zinc-900 shadow-2xl" : "border-white/10 hover:border-indigo-500/50 hover:bg-white/5 bg-zinc-900/50"
          )}
        >
          <div className="text-center space-y-4 px-6">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500",
              file ? "bg-indigo-600 text-white" : "bg-white/5 text-zinc-600 group-hover:scale-110 group-hover:text-indigo-400"
            )}>
              {file ? <FileText className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
            </div>
            {file ? (
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest italic">{file.name}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tải tệp PDF lên</h3>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Kéo thả hoặc nhấp để chọn tệp</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {file && !resultBlob && (
            <button 
              onClick={convertToWord}
              disabled={isProcessing}
              className="w-full sm:w-auto h-12 px-10 bg-white text-black rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  Đang chuyển đổi <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  Chuyển sang Word <FileType className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {resultBlob && (
             <button 
               onClick={downloadResult}
               className="w-full sm:w-auto h-12 px-10 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 animate-in fade-in zoom-in"
             >
               Tải xuống kết quả <Download className="w-4 h-4" />
             </button>
          )}
        </div>

        <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 dark:bg-white/5 dark:border-white/10">
           <div className="flex gap-4">
              <FileType className="w-6 h-6 text-indigo-400 flex-shrink-0" />
              <div className="space-y-2">
                 <h4 className="text-sm font-bold text-indigo-300 dark:text-indigo-200 uppercase tracking-widest">Lưu ý về định dạng</h4>
                 <p className="text-sm text-indigo-300/70 dark:text-indigo-200/50 leading-relaxed">
                   Công cụ này sử dụng AI để nhận diện nội dung văn bản. Các bố cục phức tạp, bảng biểu lồng nhau hoặc hình ảnh chèn ngang có thể không được bảo toàn 100%. Phù hợp nhất cho các tài liệu dạng văn bản, báo cáo và hợp đồng.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Copy, 
  FileText, 
  Eraser, 
  PenTool, 
  Sparkles, 
  Plus, 
  Trash2, 
  Info, 
  Settings, 
  Maximize2, 
  FileEdit,
  Check,
  Type
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface DocumentTemplatesProps {
  onBack: () => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  organization: string;
  parentOrg: string;
  orgName: string;
  kínhGửi1: string;
  kínhGửi2: string;
  title: string;
  mộttả: string;
}

const PRESETS: TemplatePreset[] = [
  {
    id: 'tram-y-te',
    name: 'Trạm Y tế Hiệp Thành',
    organization: 'Trạm Y tế phường Hiệp Thành thuộc Uỷ Ban Nhân dân phường Hiệp Thành.',
    parentOrg: 'ỦY BAN NHÂN DÂN PHƯỜNG HIỆP THÀNH',
    orgName: 'TRẠM Y TẾ',
    kínhGửi1: 'Lãnh đạo Trạm Y tế Phường Hiệp Thành;',
    kínhGửi2: 'Phòng Hành chính;',
    title: 'ĐƠN XIN NGHỈ PHÉP',
    mộttả: 'Theo mẫu chuẩn của Trạm Y tế Phường Hiệp Thành (như ảnh mẫu).'
  },
  {
    id: 'doanh-nghiep',
    name: 'Công ty Công nghệ BMASS',
    organization: 'Bộ phận Phát triển Phần mềm thuộc Ban Giám đốc Công ty TNHH Giải pháp Công nghệ BMASS.',
    parentOrg: 'CÔNG TY TNHH GIẢI PHÁP BMASS',
    orgName: 'PHÒNG NHÂN SỰ',
    kínhGửi1: 'Ban Giám đốc Công ty TNHH BMASS;',
    kínhGửi2: 'Phòng Nhân sự;',
    title: 'ĐƠN XIN NGHỈ PHÉP',
    mộttả: 'Mẫu cho cán bộ nhân viên làm việc tại doanh nghiệp tư nhân.'
  },
  {
    id: 'hanh-chinh-su-nghiep',
    name: 'Trường Tiểu học Nguyễn Huệ',
    organization: 'Tổ chuyên môn khối 3, Trường Tiểu học Nguyễn Huệ, Quận 12.',
    parentOrg: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO TP.HCM',
    orgName: 'TRƯỜNG TIỂU HỌC NGUYỄN HUỆ',
    kínhGửi1: 'Ban Giám hiệu Trường Tiểu học Nguyễn Huệ;',
    kínhGửi2: 'Công đoàn nhà trường;',
    title: 'ĐƠN XIN NGHỈ PHÉP',
    mộttả: 'Mẫu dành cho giáo viên, cán bộ viên chức nghành giáo dục.'
  }
];

export default function DocumentTemplates({ onBack }: DocumentTemplatesProps) {
  const { user, userData } = useAuthStore();
  
  // Tabs for mobile (form vs preview)
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Form Fields State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('tram-y-te');
  const [parentOrg, setParentOrg] = useState(PRESETS[0].parentOrg);
  const [orgName, setOrgName] = useState(PRESETS[0].orgName);
  const [organization, setOrganization] = useState(PRESETS[0].organization);
  const [kínhGửi1, setKínhGửi1] = useState(PRESETS[0].kínhGửi1);
  const [kínhGửi2, setKínhGửi2] = useState(PRESETS[0].kínhGửi2);
  const [hasKínhGửi2, setHasKínhGửi2] = useState(true);
  
  const [fullName, setFullName] = useState(userData?.displayName || user?.displayName || 'Nguyễn Văn A');
  const [position, setPosition] = useState('Bác sĩ điều trị');
  const [leaveTypeDescription, setLeaveTypeDescription] = useState('nghỉ phép thường niên');
  const [totalDays, setTotalDays] = useState('02');
  const [fromDate, setFromDate] = useState('08/06/2026');
  const [toDate, setToDate] = useState('09/06/2026');
  const [reason, setReason] = useState('Giải quyết công việc cá nhân và đưa gia đình đi khám bệnh định kỳ.');
  
  const [locationName, setLocationName] = useState('Hiệp Thành');
  const [docDate, setDocDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear());
    return { day, month, year };
  });

  // Presentation customizers
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [fontSize, setFontSize] = useState<number>(14); // in px for display, scales perfectly
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [hasWatermark, setHasWatermark] = useState<boolean>(true);
  const [showLeftHeader, setShowLeftHeader] = useState<boolean>(false);

  // Digital Signature Pad Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureImgUrl, setSignatureImgUrl] = useState<string | null>(null);

  // Apply default preset values when preset changes
  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setParentOrg(preset.parentOrg);
      setOrgName(preset.orgName);
      setOrganization(preset.organization);
      setKínhGửi1(preset.kínhGửi1);
      setKínhGửi2(preset.kínhGửi2);
      setHasKínhGửi2(preset.kínhGửi2 !== '');
      setShowLeftHeader(presetId !== 'tram-y-te');
      toast.success(`Đã áp dụng mẫu ${preset.name}`);
    }
  };

  // Canvas drawing handlers
  useEffect(() => {
    if (activeTab === 'form' || window.innerWidth >= 1280) {
      initCanvas();
    }
  }, [activeTab]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear & styling
    ctx.strokeStyle = '#1e3a8a'; // Deep blue ink
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const getEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getEventCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getEventCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Auto-save the signature state
    saveSignatureImage();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initCanvas();
    setHasSignature(false);
    setSignatureImgUrl(null);
    toast.success('Đã xoá chữ ký');
  };

  const saveSignatureImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const url = canvas.toDataURL('image/png');
    setSignatureImgUrl(url);
  };

  // Prepopulate dates helper
  const setQuickDates = (daysOffset: number) => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + daysOffset - 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    
    const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    setFromDate(fmt(today));
    setToDate(fmt(end));
    setTotalDays(pad(daysOffset));
    toast.success(`Đã tự động điền lịch nghỉ ${daysOffset} ngày`);
  };

  // Export 1: High-fidelity Printing using isolated dynamic iframe
  const handlePrint = () => {
    // Create an iframe to print isolated document copy content safely
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      toast.error('Không thể tạo luồng in ấn!');
      return;
    }

    // Determine font family
    const fontStr = fontFamily === 'serif' ? '"Times New Roman", Times, "Liberation Serif", serif' : 'Arial, sans-serif';

    // Generate accurate HTML content with Styles matched exactly to selected preset (Vietnamese Decree 30 standards)
    const contentHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>In Đơn Xin Nghỉ Phép - ${fullName}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 20mm 15mm 20mm 30mm;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            font-family: ${fontStr};
            font-size: ${fontSize}px;
            line-height: ${lineHeight};
            color: #000;
            background-color: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .m-0 { margin: 0; }
          .mb-4 { margin-bottom: 12px; }
          .mb-6 { margin-bottom: 16px; }
          .font-bold { font-weight: bold; }
          .font-italic { font-style: italic; }
          .text-center { text-align: center; }
          .text-justify { text-align: justify; }
          .text-right { text-align: right; }
          .uppercase { text-transform: uppercase; }
          .w-full { width: 100%; }
          
          /* Header Layout - Side-by-side table to prevent wrapping or stacking in print */
          .header-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 15px;
          }
          .header-table td {
            border: none;
            padding: 0;
            vertical-align: top;
          }
          
          .motto-line {
            display: inline-block;
            border-bottom: 1.5px solid #000;
            width: 130px;
            height: 1px;
            margin-top: 4px;
          }
          .org-line {
            display: inline-block;
            border-bottom: 1.5px solid #000;
            width: 55px;
            height: 1px;
            margin-top: 4px;
          }
          
          .input-dotted {
            font-weight: bold;
            display: inline-block;
            border-bottom: 1px dotted #111;
            text-align: center;
          }
          
          .signature-table {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
          }
          .signature-table td {
            text-align: center;
            vertical-align: top;
            width: 33.33%;
          }
          .signature-img {
            max-height: 55px;
            max-width: 125px;
            object-fit: contain;
          }
          .content-block {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
        </style>
      </head>
      <body>
        <div>
          <!-- Motto & Organization Header -->
          ${showLeftHeader ? `
            <table class="header-table">
              <tr>
                <td style="width: 45%; text-align: center;">
                  <p class="m-0 uppercase" style="font-size: ${fontSize - 1.5}px; letter-spacing: -0.2px;">${parentOrg || 'CƠ QUAN CHỦ QUẢN'}</p>
                  <p class="m-0 font-bold uppercase" style="font-size: ${fontSize - 1.5}px; margin-top: 2px;">${orgName || 'ĐƠN VỊ BAN HÀNH'}</p>
                  <div class="org-line"></div>
                </td>
                <td style="width: 55%; text-align: center;">
                  <p class="m-0 font-bold uppercase" style="font-size: ${fontSize - 1.5}px; letter-spacing: 0.2px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p class="m-0 font-bold" style="font-size: ${fontSize}px; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</p>
                  <div class="motto-line"></div>
                </td>
              </tr>
            </table>
          ` : `
            <div class="text-center" style="margin-bottom: 12px;">
              <p class="m-0 font-bold uppercase" style="font-size: ${fontSize - 0.5}px; letter-spacing: 0.2px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p class="m-0 font-bold" style="font-size: ${fontSize}px; margin-top: 3px;">Độc lập – Tự do – Hạnh phúc</p>
              <div class="motto-line"></div>
            </div>
          `}

          <!-- Title -->
          <div class="text-center" style="margin-top: 14px; margin-bottom: 14px;">
            <h1 class="font-bold m-0 uppercase" style="font-size: ${fontSize + 3}px; letter-spacing: 0.5px;">ĐƠN XIN NGHỈ PHÉP</h1>
          </div>

          <!-- Recipient -->
          <div class="mb-4" style="padding-left: 45px; text-align: justify;">
            <p class="m-0 font-bold" style="display: inline;">${selectedPresetId === 'tram-y-te' ? 'Kính gởi:' : 'Kính gửi:'} </p>
            <div style="display: inline-block; vertical-align: top; padding-left: 4px;">
              <p class="m-0">- ${kínhGửi1 || '..........................................................;'}</p>
              ${hasKínhGửi2 ? `<p class="m-0">- ${kínhGửi2 || '..........................................................;'}</p>` : ''}
            </div>
          </div>

          <!-- Body Contents -->
          <div class="content-block">
            ${selectedPresetId === 'tram-y-te' ? `
              <p class="m-0 text-justify">
                Tôi tên: <span class="input-dotted" style="min-w: 220px; font-weight: bold;">${fullName || '............................................................'}</span>&nbsp;chức vụ: <span class="input-dotted" style="min-w: 160px; font-weight: bold;">${position || '.......................................'}</span>
              </p>
              
              <p class="m-0 text-justify">
                ${organization || 'Trạm Y tế phường Hiệp Thành thuộc Uỷ Ban Nhân dân phường Hiệp Thành.'}
              </p>

              <p class="m-0 text-justify">
                Nay tôi làm đơn này kính gởi đến Lãnh đạo Trạm Y tế phường Hiệp Thành cho tôi xin nghỉ phép <span class="input-dotted" style="min-w: 80px; font-weight: bold;">${totalDays || '......'}</span> ngày
              </p>

              <p class="m-0 text-justify">
                Từ ngày: <span class="input-dotted" style="min-w: 140px; font-weight: bold;">${fromDate || '................................'}</span>&nbsp;đến hết ngày: <span class="input-dotted" style="min-w: 140px; font-weight: bold;">${toDate || '................................'}</span>
              </p>

              <p class="m-0 text-justify">
                Lý do: <span class="input-dotted" style="width: 84%; text-align: left; padding-left: 5px; font-weight: normal;">${reason || '.........................................................................................................'}</span>
              </p>

              <p class="m-0 text-justify">
                Kính mong được sự chấp thuận của Lãnh đạo.
              </p>
              
              <p class="m-0 text-justify">
                Chân thành cảm ơn!
              </p>
            ` : `
              <p class="m-0 text-justify">
                Tôi tên là: <span class="input-dotted" style="min-w: 220px; font-weight: bold;">${fullName || '...................................................'}</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: <span class="input-dotted" style="min-w: 160px; font-weight: bold;">${position || '..........................'}</span>
              </p>
              <p class="m-0 text-justify">
                Đơn vị công tác: <span class="font-bold">${parentOrg || 'Cơ quan chủ quản'}${orgName ? ` - ${orgName}` : ''}</span>
              </p>
              
              <p class="m-0 text-justify" style="text-indent: 1.27cm;">
                Nay tôi làm đơn này kính gửi đến quý Lãnh đạo cho tôi xin nghỉ phép <span class="font-bold">${leaveTypeDescription || 'nghỉ phép thường niên'}</span> với số lượng <span class="input-dotted" style="min-w: 60px; font-weight: bold;">${totalDays || '...'}</span> ngày.
              </p>
              <p class="m-0 text-justify" style="text-indent: 1.27cm;">
                Từ ngày: <span class="input-dotted" style="min-w: 120px; font-weight: bold;">${fromDate || '................'}</span> &nbsp;&nbsp;&nbsp;&nbsp; đến hết ngày: <span class="input-dotted" style="min-w: 120px; font-weight: bold;">${toDate || '................'}</span>
              </p>
              <p class="m-0 text-justify" style="text-indent: 1.27cm;">
                Lý do xin nghỉ: ${reason || '..................................................................................'}
              </p>
              
              <p class="m-0 text-justify" style="text-indent: 1.27cm;">
                Kính mong nhận được sự xem xét và tạo điều kiện chấp thuận của quý Lãnh đạo.
              </p>
              <p class="m-0 text-justify">Tôi xin chân thành cảm ơn!</p>
            `}
          </div>
        </div>

        <div style="margin-top: 30px;">
          <!-- Location and Date -->
          <div class="text-right font-italic mb-4" style="font-size: ${fontSize - 1}px; padding-right: 15px; margin-bottom: 12px;">
            ${locationName || '....................'}, ngày ${docDate.day || '...'} tháng ${docDate.month || '...'} năm ${docDate.year || '202...'}
          </div>

          <!-- Signatures Table -->
          <table class="signature-table" style="font-size: ${fontSize - 2}px;">
            <tr>
              <td class="font-bold uppercase">
                ${selectedPresetId === 'tram-y-te' ? 'DUYỆT<br/>LÃNH ĐẠO' : 'DUYỆT LÃNH ĐẠO'}
              </td>
              <td class="font-bold uppercase">
                ${selectedPresetId === 'tram-y-te' ? 'XÁC NHẬN<br/>KHOA/PHÒNG' : 'XÁC NHẬN KHOA/PHÒNG'}
              </td>
              <td class="font-bold">
                ${selectedPresetId === 'tram-y-te' ? 'Người viết đơn' : 'NGƯỜI LÀM ĐƠN'}
              </td>
            </tr>
            ${selectedPresetId === 'tram-y-te' ? '' : `
            <tr>
              <td class="font-italic" style="font-size: 9pt; color: #555;">(Ký và ghi rõ họ tên)</td>
              <td class="font-italic" style="font-size: 9pt; color: #555;">(Ký và ghi rõ họ tên)</td>
              <td class="font-italic" style="font-size: 9pt; color: #555;">(Ký và ghi rõ họ tên)</td>
            </tr>
            `}
            <tr>
              <td style="height: 60px;"></td>
              <td style="height: 60px;"></td>
              <td style="height: 60px; vertical-align: bottom;">
                ${signatureImgUrl ? `<div><img class="signature-img" src="${signatureImgUrl}" /></div>` : ''}
              </td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td class="font-bold" style="padding-top: 5px;">
                ${fullName || '....................'}
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(contentHTML);
    doc.close();

    // Trigger printing inside virtual viewport context securely
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Remove temporary iframe after printing dialog is shown
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 6000);
    }, 500);
  };

  // Export 2: Copy formatted raw text
  const handleCopyText = () => {
    const cleanText = selectedPresetId === 'tram-y-te' ? `
       CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          Độc lập - Tự do - Hạnh phúc
       ---------------------------

            ĐƠN XIN NGHỈ PHÉP

Kính gởi:  - ${kínhGửi1}
           ${hasKínhGửi2 ? `- ${kínhGửi2}` : ''}

Tôi tên: ${fullName || '....................'}    chức vụ: ${position || '....................'}
${organization || 'Trạm Y tế phường Hiệp Thành thuộc Uỷ Ban Nhân dân phường Hiệp Thành.'}

Nay tôi làm đơn này kính gởi đến Lãnh đạo Trạm Y tế phường Hiệp Thành cho tôi xin nghỉ phép ${totalDays || '...'} ngày.
Từ ngày: ${fromDate || '................'} đến hết ngày: ${toDate || '................'}

Lý do: ${reason || '................................................'}

Kính mong được sự chấp thuận của Lãnh đạo.
Chân thành cảm ơn!

${locationName}, ngày ${docDate.day} tháng ${docDate.month} năm ${docDate.year}

     [ DUYỆT LÃNH ĐẠO ]       [ XÁC NHẬN KHOA/PHÒNG ]      [ Người viết đơn ]
                                                            ${fullName}
    `.trim() : `
${parentOrg.toUpperCase()}          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
${orgName.toUpperCase()}                  Độc lập - Tự do - Hạnh phúc
-----------------                  ---------------------------

ĐƠN XIN NGHỈ PHÉP

Kính gửi:  - ${kínhGửi1}
           ${hasKínhGửi2 ? `- ${kínhGửi2}` : ''}

Tôi tên là: ${fullName}   - Chức vụ: ${position}
Đơn vị công tác: ${parentOrg}${orgName ? ` - ${orgName}` : ''}

Nay tôi làm đơn này kính gửi đến quý Lãnh đạo cho tôi xin nghỉ phép ${leaveTypeDescription} với số ngày là: ${totalDays} ngày.
Từ ngày: ${fromDate} đến hết ngày: ${toDate}

Lý do xin nghỉ: ${reason}

Kính mong nhận được sự xem xét và chấp thuận của quý Ban Lãnh đạo.
Tôi xin chân thành cảm ơn!

${locationName}, ngày ${docDate.day} tháng ${docDate.month} năm ${docDate.year}

    [ DUYỆT LÃNH ĐẠO ]         [ XÁC NHẬN KHOA/PHÒNG ]         [ NGƯỜI LÀM ĐƠN ]
                                                              ${fullName}
    `.trim();

    navigator.clipboard.writeText(cleanText)
      .then(() => toast.success('Đã sao chép nội dung văn bản vào bộ nhớ tạm!'))
      .catch(() => toast.error('Sao chép thất bại!'));
  };

  // Export 3: Download as real DOC file (formatted MS Word)
  const handleDownloadWord = () => {
    const docHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Đơn xin nghỉ phép - ${fullName}</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Times New Roman', serif; 
            font-size: ${fontSize}pt; 
            line-height: 1.5; 
            margin: 1in;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .font-italic { font-style: italic; }
          .m-0 { margin: 0; }
          .mb-4 { margin-bottom: 16px; }
          .mt-8 { margin-top: 32px; }
          .table-sig {
            width: 100%;
            margin-top: 40px;
            border-collapse: collapse;
          }
          .table-sig td {
            text-align: center;
            vertical-align: top;
            width: 33.33%;
            font-size: ${fontSize - 2}pt;
          }
        </style>
      </head>
      <body>
        ${showLeftHeader ? `
        <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 24px;">
          <tr>
            <td style="width: 45%; text-align: center; vertical-align: top; border: none; padding: 0;">
              <p style="margin: 0; text-transform: uppercase; font-size: ${fontSize - 2}pt;">${parentOrg || 'CƠ QUAN CHỦ QUẢN'}</p>
              <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: ${fontSize - 2}pt; margin-top: 2px;">${orgName || 'ĐƠN VỊ BAN HÀNH'}</p>
              <p style="margin: 0; text-align: center; line-height: 0.3;">
                <span style="display: inline-block; border-bottom: 1px solid black; width: 60px; height: 1px;"></span>
              </p>
            </td>
            <td style="width: 55%; text-align: center; vertical-align: top; border: none; padding: 0;">
              <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: ${fontSize - 1.5}pt; letter-spacing: 0.2px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p style="margin: 0; font-weight: bold; font-size: ${fontSize}pt; margin-top: 2px;">Độc lập - Tự do - Hạnh phúc</p>
              <p style="margin: 0; text-align: center; line-height: 0.3;">
                <span style="display: inline-block; border-bottom: 1px solid black; width: 140px; height: 1px;"></span>
              </p>
            </td>
          </tr>
        </table>
        ` : `
        <div class="text-center" style="margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: ${fontSize - 0.5}pt; letter-spacing: 0.2px; text-align: center;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-weight: bold; font-size: ${fontSize}pt; margin-top: 2px; text-align: center;">Độc lập - Tự do - Hạnh phúc</p>
        </div>
        `}
        
        <div class="text-center mt-8 mb-4" style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
          <br/>
          <h2 class="font-bold" style="font-size: ${fontSize + 2}pt; margin: 0; text-transform: uppercase;">ĐƠN XIN NGHỈ PHÉP</h2>
          <br/>
        </div>

        ${selectedPresetId === 'tram-y-te' ? `
        <div style="margin-left: 40px; margin-bottom: 20px;">
          <p class="m-0"><span class="font-bold">Kính gởi: </span> - ${kínhGửi1 || '..........................................................;'}</p>
          ${hasKínhGửi2 ? `<p class="m-0">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - ${kínhGửi2}</p>` : ''}
        </div>

        <p class="m-0">Tôi tên: <span class="font-bold">${fullName || '...................................................'}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; chức vụ: <span class="font-bold">${position || '..........................'}</span></p>
        <p class="mb-4" style="text-align: justify; text-indent: 0.5in;">${organization || 'Trạm Y tế phường Hiệp Thành thuộc Uỷ Ban Nhân dân phường Hiệp Thành.'}</p>
        
        <p style="text-align: justify; text-indent: 0.5in;">
          Nay tôi làm đơn này kính gởi đến Lãnh đạo Trạm Y tế phường Hiệp Thành cho tôi xin nghỉ phép <span class="font-bold">${totalDays || '...'}</span> ngày.
        </p>
        <p class="m-0" style="text-indent: 0.5in;">Từ ngày: <span class="font-bold">${fromDate || '................'}</span> &nbsp;&nbsp;&nbsp;&nbsp; đến hết ngày: <span class="font-bold">${toDate || '................'}</span></p>
        <p style="text-align: justify; text-indent: 0.5in;">Lý do: ${reason || '..................................................................................'}</p>
        
        <p style="text-align: justify; text-indent: 0.5in;">Kính mong được sự chấp thuận của Lãnh đạo.</p>
        <p class="mb-4">Chân thành cảm ơn!</p>
        ` : `
        <div style="margin-left: 40px; margin-bottom: 20px;">
          <p class="m-0"><span class="font-bold">Kính gửi: </span> - ${kínhGửi1 || '..........................................................;'}</p>
          ${hasKínhGửi2 ? `<p class="m-0">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - ${kínhGửi2}</p>` : ''}
        </div>

        <p class="m-0">Tôi tên là: <span class="font-bold">${fullName || '...................................................'}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: <span class="font-bold">${position || '..........................'}</span></p>
        <p class="mb-4" style="text-align: justify; text-indent: 0.5in;">Đơn vị công tác: <span class="font-bold">${parentOrg || 'Cơ quan chủ quản'}${orgName ? ` - ${orgName}` : ''}</span></p>
        
        <p style="text-align: justify; text-indent: 0.5in;">
          Nay tôi làm đơn này kính gửi đến quý Lãnh đạo cho tôi xin nghỉ phép <span class="font-bold">${leaveTypeDescription || 'nghỉ phép thường niên'}</span> với số lượng <span class="font-bold">${totalDays || '...'}</span> ngày.
        </p>
        <p class="m-0" style="text-indent: 0.5in;">Từ ngày: <span class="font-bold">${fromDate || '................'}</span> &nbsp;&nbsp;&nbsp;&nbsp; đến hết ngày: <span class="font-bold">${toDate || '................'}</span></p>
        <p style="text-align: justify; text-indent: 0.5in;">Lý do xin nghỉ: ${reason || '..................................................................................'}</p>
        
        <p style="text-align: justify; text-indent: 0.5in;">Kính mong nhận được sự xem xét và tạo điều kiện chấp thuận của quý Lãnh đạo.</p>
        <p class="mb-4">Tôi xin chân thành cảm ơn!</p>
        `}

        <div class="text-right font-italic" style="font-size: ${fontSize - 1}pt; text-align: right;">
          ${locationName || '....................'}, ngày ${docDate.day || '...'} tháng ${docDate.month || '...'} năm ${docDate.year || '202...'}
        </div>

        <table class="table-sig" style="width: 100%; margin-top: 40px; border-collapse: collapse;">
          <tr>
            <td class="font-bold" style="text-transform: uppercase; text-align: center; font-weight: bold; width: 33%;">
              ${selectedPresetId === 'tram-y-te' ? 'DUYỆT<br/>LÃNH ĐẠO' : 'DUYỆT LÃNH ĐẠO'}
            </td>
            <td class="font-bold" style="text-transform: uppercase; text-align: center; font-weight: bold; width: 33%;">
              ${selectedPresetId === 'tram-y-te' ? 'XÁC NHẬN<br/>KHOA/PHÒNG' : 'XÁC NHẬN KHOA/PHÒNG'}
            </td>
            <td class="font-bold" style="text-align: center; font-weight: bold; width: 33%;">
              ${selectedPresetId === 'tram-y-te' ? 'Người viết đơn' : 'NGƯỜI LÀM ĐƠN'}
            </td>
          </tr>
          ${selectedPresetId === 'tram-y-te' ? '' : `
          <tr>
            <td class="font-italic" style="font-size: 9pt; color: #555; text-align: center; font-style: italic;">(Ký và ghi rõ họ tên)</td>
            <td class="font-italic" style="font-size: 9pt; color: #555; text-align: center; font-style: italic;">(Ký và ghi rõ họ tên)</td>
            <td class="font-italic" style="font-size: 9pt; color: #555; text-align: center; font-style: italic;">(Ký và ghi rõ họ tên)</td>
          </tr>
          `}
          <tr>
            <td style="height: 100px;"></td>
            <td style="height: 100px;"></td>
            <td style="height: 100px; vertical-align: bottom; text-align: center;">
              ${signatureImgUrl ? `<img src="${signatureImgUrl}" style="max-height: 50px; max-width: 120px;" /><br/>` : ''}
              <p class="font-bold" style="margin: 0; padding-top: 10px; font-weight: bold;">${fullName || '....................'}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([docHTML], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Don_xin_nghi_phep_${fullName.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải xuống file Microsoft Word (.doc)');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full relative p-4 lg:p-12 animate-fade-in text-slate-800 dark:text-zinc-200">
      {/* Top action breadcrumbs */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack} 
          className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/5"
        >
          <ArrowLeft className="w-4 h-4" /> Quay Lại
        </button>

        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Mẫu Văn Bản Hành Chính</span>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Khung Mẫu Văn Bản</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-full dark:bg-indigo-505/20">A4 Realtime Preview</span>
        </h2>
        <p className="text-slate-600 dark:text-zinc-400 text-sm max-w-2xl">
          Tạo đơn xin nghỉ phép đúng chuẩn bố cục quy phạm văn bản Việt Nam. Điền thông tin vào biểu mẫu, vẽ chữ ký tay kỹ thuật số và tải tệp đính kèm chuyên nghiệp.
        </p>
      </div>

      {/* Preset Pickers */}
      <div className="glass-card p-4 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center gap-4 dark:bg-zinc-900/40 border border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Áp dụng mẫu nhanh:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-xl transition-all border cursor-pointer",
                selectedPresetId === preset.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10"
                  : "bg-white dark:bg-zinc-800 border-slate-250 dark:border-white/5 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-750"
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab controls for mobile screen sizes */}
      <div className="flex xl:hidden border-b border-slate-200 dark:border-white/10 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('form')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase border-b-2 cursor-pointer transition-all",
            activeTab === 'form' 
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          1. Biểu mẫu nhập liệu
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase border-b-2 cursor-pointer transition-all",
            activeTab === 'preview' 
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          2. Kết quả xem trước (A4)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch flex-1">
        
        {/* Left Side: Input Form (Visible on XL or when mobile activeTab === 'form') */}
        <div className={cn(
          "flex flex-col gap-6",
          activeTab !== 'form' && "hidden xl:flex"
        )}>
          
          {/* Main Form Fields Panel */}
          <div className="glass-card p-6 rounded-3xl space-y-6 flex-1 overflow-visible border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/40">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
              Thông tin hành chính đơn từ
            </h3>

            {/* Recipient Group */}
            <div className="space-y-3.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Đơn vị nhận đơn (Kính gửi)</label>
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold font-serif">-</span>
                  <input
                    type="text"
                    value={kínhGửi1}
                    onChange={(e) => setKínhGửi1(e.target.value)}
                    placeholder="Lãnh đạo đơn vị nhận đơn thứ 1"
                    className="w-full text-xs font-medium pl-6 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                  />
                </div>

                {hasKínhGửi2 && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold font-serif">-</span>
                      <input
                        type="text"
                        value={kínhGửi2}
                        onChange={(e) => setKínhGửi2(e.target.value)}
                        placeholder="Đơn vị nhận đơn thứ 2 (Phòng ban/Bộ phận)"
                        className="w-full text-xs font-medium pl-6 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setKínhGửi2('');
                        setHasKínhGửi2(false);
                      }}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-550/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Xoá đơn vị này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {!hasKínhGửi2 && (
                  <button
                    type="button"
                    onClick={() => setHasKínhGửi2(true)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm nơi kính gửi thứ hai
                  </button>
                )}
              </div>
            </div>

            {/* Sender and Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Người viết đơn (Tôi tên là)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Chức vụ phụ trách</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Cơ quan chủ quản / Công ty chính</label>
                <input
                  type="text"
                  value={parentOrg}
                  onChange={(e) => setParentOrg(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Cơ quan ban hành / Đơn vị thực hiện</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Leave parameters */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pt-2 pb-3">
              <span className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
              Chế độ nghỉ phép
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Hình thức nghỉ phép</label>
                <input
                  type="text"
                  value={leaveTypeDescription}
                  onChange={(e) => setLeaveTypeDescription(e.target.value)}
                  placeholder="nghỉ phép thường niên / nghỉ phép không lương"
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Số ngày nghỉ</label>
                <input
                  type="text"
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  className="w-full text-xs font-bold text-center px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Fast Preset Dates selection */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chọn nhanh số ngày nghỉ:</span>
              {[1, 2, 3, 5, 12].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setQuickDates(d)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 hover:text-slate-900 rounded-lg cursor-pointer transition-all"
                >
                  {d} {d === 1 ? 'ngày' : 'ngày'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Từ ngày</label>
                <input
                  type="text"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="08/06/2026"
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Đến hết ngày</label>
                <input
                  type="text"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="09/06/2026"
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Lý do xin nghỉ</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full text-xs font-semibold p-4 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none resize-none"
              />
            </div>

            {/* Date name write */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Địa danh viết đơn</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-550 focus:bg-white outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 md:col-span-2">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ngày</label>
                  <input
                    type="text"
                    value={docDate.day}
                    onChange={(e) => setDocDate({ ...docDate, day: e.target.value })}
                    className="w-full text-xs text-center font-semibold px-2 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-505 outlined-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tháng</label>
                  <input
                    type="text"
                    value={docDate.month}
                    onChange={(e) => setDocDate({ ...docDate, month: e.target.value })}
                    className="w-full text-xs text-center font-semibold px-2 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-505 outlined-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Năm</label>
                  <input
                    type="text"
                    value={docDate.year}
                    onChange={(e) => setDocDate({ ...docDate, year: e.target.value })}
                    className="w-full text-xs text-center font-semibold px-2 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-505 outlined-none"
                  />
                </div>
              </div>
            </div>

            {/* Signature Pad */}
            <div className="border border-slate-100 dark:border-white/5 pt-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-indigo-500" />
                  Ký tay kỹ thuật số (Bút máy)
                </label>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" /> Xóa Ký Lại
                  </button>
                )}
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/40">
                <canvas
                  id="sig-canvas"
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className="w-full h-[150px] cursor-crosshair relative z-10"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none gap-1.5">
                    <PenTool className="w-5 h-5 text-slate-300 animate-bounce" />
                    <p className="text-[10px] font-medium uppercase tracking-widest">Kí nháp hoặc vẽ chữ kí của bạn tại đây</p>
                    <p className="text-[9px] text-slate-350 dark:text-zinc-650">(Hoạt động trên cả chuột và màn hình cảm ứng di động)</p>
                  </div>
                )}
                {hasSignature && (
                  <div className="absolute right-3 bottom-3 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
                    <Check className="w-3.5 h-3.5" /> Đã lưu chữ ký thành công
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Designer Controls Container */}
          <div className="glass-card p-6 rounded-3xl space-y-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/40">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" />
              Tuỳ chỉnh hiển thị trang A4
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Font Chữ Mô Phỏng</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFontFamily('serif')}
                    className={cn(
                      "py-2 px-3 text-xs font-serif font-bold rounded-xl border cursor-pointer flex items-center justify-center gap-1.5",
                      fontFamily === 'serif'
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-50 dark:bg-zinc-800 select-none text-slate-650 border-slate-200 dark:border-white/5"
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Times New Roman
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontFamily('sans')}
                    className={cn(
                      "py-2 px-3 text-xs font-sans font-bold rounded-xl border cursor-pointer flex items-center justify-center gap-1.5",
                      fontFamily === 'sans'
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-50 dark:bg-zinc-800 select-none text-slate-650 border-slate-200 dark:border-white/5"
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Arial Sans
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wide">Kích thước chữ ({fontSize}px)</span>
                  <span className="text-[10px] font-mono text-indigo-500 font-bold">Zoom để vừa trang</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min="11"
                    max="17"
                    step="0.5"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold min-w-[20px] text-right">{fontSize}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3.5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Đóng dấu chìm Watermark</span>
                <span className="text-[10px] text-slate-400">Hiện dấu chìm "CHƯA PHÊ DUYỆT" trên biểu mẫu bản nháp</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasWatermark}
                  onChange={(e) => setHasWatermark(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3.5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Tiêu đề cơ quan hành chính (Bố cục 2 bên)</span>
                <span className="text-[10px] text-slate-400">Hiện Đơn vị ban hành ở góc trái (Tắt đi để căn giữa Quốc hiệu như mẫu ảnh)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLeftHeader}
                  onChange={(e) => setShowLeftHeader(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

        </div>

        {/* Right Side: High Fidelity Page Preview (Visible on XL or when mobile activeTab === 'preview') */}
        <div className={cn(
          "flex flex-col gap-6 xl:sticky xl:top-6 h-fit",
          activeTab !== 'preview' && "hidden xl:flex"
        )}>
          
          {/* Action buttons bar */}
          <div className="glass-card p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Đã Cập Nhật</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3.5 py-2 hover:scale-[1.02] active:scale-[0.98] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-extrabold rounded-xl transition-all border border-slate-200 dark:border-white/10 flex items-center gap-1.5 cursor-pointer"
                title="Sao chép nội dung văn bản"
              >
                <Copy className="w-3.5 h-3.5" />
                Sao Chép
              </button>
              
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 hover:scale-[1.02] active:scale-[0.98] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-extrabold rounded-xl transition-all border border-slate-200 dark:border-white/10 flex items-center gap-1.5 cursor-pointer"
                title="In hoặc Lưu PDF bằng Trình duyệt"
              >
                <Printer className="w-3.5 h-3.5" />
                In / Lưu PDF
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-4 py-2 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                title="Tải xuống tệp .doc mở bằng Microsoft Word"
              >
                <Download className="w-3.5 h-3.5" />
                Tải File Word (.doc)
              </button>
            </div>
          </div>

          {/* Simulated Paper Stage Container */}
          <div className="w-full flex justify-center py-4 bg-slate-100/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-white/5 rounded-3xl p-6 overflow-x-auto min-h-[600px] items-start">
            
            {/* The simulated A4 container */}
            <div 
              id="a4-preview-area"
              className={cn(
                "relative mx-auto bg-white text-slate-900 border border-slate-350 shadow-2xl transition-all font-serif selection:bg-indigo-150 shrink-0",
                fontFamily === 'serif' ? 'font-serif' : 'font-sans'
              )}
              style={{
                width: '100%',
                maxWidth: '650px',
                aspectRatio: '1 / 1.414', // exact A4 proportion!
                padding: '20mm 15mm 20mm 30mm', // Standard Vietnamese administrative document layout guidelines (Decree 30/2020/NĐ-CP)
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                boxSizing: 'border-box'
              }}
            >
              
              {/* Optional Watermark indicator on screen for drafts */}
              {hasWatermark && (
                <div className="no-print-indicator absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                  <div className="text-[52px] font-black text-rose-500/5 dark:text-rose-500/[0.04] border-[7px] border-dashed border-rose-500/5 dark:border-rose-500/[0.04] px-8 py-4 rounded-3xl transform -rotate-[32deg] tracking-widest font-sans">
                    BẢN PHÁC THẢO
                  </div>
                </div>
              )}

              {/* Document Text Content */}
              <div id="a4-text-wrapper" className="relative z-10 w-full h-full flex flex-col justify-between select-text">
                
                <div className="flex flex-col">
                  {/* Header (Motto & Organization) */}
                  <div className="grid grid-cols-12 gap-2 w-full pb-3">
                    {showLeftHeader ? (
                      <>
                        {/* Left part: Organizations */}
                        <div className="col-span-5 flex flex-col items-center text-center">
                          <p className="m-0 uppercase tracking-tight text-slate-900 leading-snug" style={{ fontSize: `${fontSize - 1.5}px` }}>
                            {parentOrg || 'CƠ QUAN CHỦ QUẢN'}
                          </p>
                          <p className="font-bold m-0 uppercase mt-0.5 leading-snug text-slate-950" style={{ fontSize: `${fontSize - 1.5}px` }}>
                            {orgName || 'ĐƠN VỊ BAN HÀNH'}
                          </p>
                          <div className="mt-1 h-[1px] bg-black" style={{ width: '55px' }} />
                        </div>

                        {/* Right part: Motto */}
                        <div className="col-span-7 flex flex-col items-center text-center">
                          <p className="font-bold m-0 leading-snug tracking-[0.1px] text-slate-900 uppercase" style={{ fontSize: `${fontSize - 1.5}px` }}>
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </p>
                          <p className="font-bold m-0 leading-snug text-slate-900 mt-1" style={{ fontSize: `${fontSize}px` }}>
                            Độc lập - Tự do - Hạnh phúc
                          </p>
                          <div className="mt-1 h-[1px] bg-black" style={{ width: '130px' }} />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-12 flex flex-col items-center text-center w-full">
                        <p className="font-bold m-0 leading-snug tracking-[0.2px] text-slate-900 uppercase" style={{ fontSize: `${fontSize - 0.5}px` }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </p>
                        <p className="font-bold m-0 leading-snug text-slate-900 mt-1.5" style={{ fontSize: `${fontSize}px` }}>
                          Độc lập – Tự do – Hạnh phúc
                        </p>
                        <div className="mt-1.5 h-[1px] bg-black" style={{ width: '130px' }} />
                      </div>
                    )}
                  </div>

                  {/* Main Title Section */}
                  <div className="text-center w-full mt-4 mb-2">
                    <h1 className="font-bold m-0 uppercase tracking-wider" style={{ fontSize: `${fontSize + 3}px` }}>
                      ĐƠN XIN NGHỈ PHÉP
                    </h1>
                  </div>

                  {/* Recipient Kính gửi */}
                  <div className="mb-4 pl-12 text-justify">
                    <p className="m-0 leading-relaxed font-bold inline">{selectedPresetId === 'tram-y-te' ? 'Kính gởi:' : 'Kính gửi:'} </p>
                    <div className="inline-block align-top pl-1">
                      <p className="m-0 leading-relaxed">- {kínhGửi1 || '..........................................................;'}</p>
                      {hasKínhGửi2 && (
                        <p className="m-0 leading-relaxed">- {kínhGửi2 || '..........................................................;'}</p>
                      )}
                    </div>
                  </div>

                  {/* Main Form Contents */}
                  {selectedPresetId === 'tram-y-te' ? (
                    <div className="space-y-1.5 mb-2 text-justify">
                      <p className="m-0 leading-relaxed">
                        Tôi tên: <span className="font-bold inline-block border-b border-dotted border-black/60 min-w-[200px] text-center">{fullName || '............................................................'}</span>&nbsp;chức vụ: <span className="font-bold inline-block border-b border-dotted border-black/60 min-w-[150px] text-center">{position || '.......................................'}</span>
                      </p>
                      
                      <p className="m-0 leading-relaxed">
                        {organization || 'Trạm Y tế phường Hiệp Thành thuộc Uỷ Ban Nhân dân phường Hiệp Thành.'}
                      </p>

                      <p className="m-0 leading-relaxed text-justify">
                        Nay tôi làm đơn này kính gởi đến Lãnh đạo Trạm Y tế phường Hiệp Thành cho tôi xin nghỉ phép <span className="font-bold inline-block border-b border-dotted border-black/60 min-w-[100px] text-center">{totalDays || '......'}</span> ngày
                      </p>

                      <p className="m-0 leading-relaxed">
                        Từ ngày: <span className="font-bold inline-block border-b border-dotted border-black/60 min-w-[150px] text-center">{fromDate || '................................'}</span>&nbsp;đến hết ngày: <span className="font-bold inline-block border-b border-dotted border-black/60 min-w-[150px] text-center">{toDate || '................................'}</span>
                      </p>

                      <p className="m-0 leading-relaxed">
                        Lý do: <span className="font-normal inline-block border-b border-dotted border-black/60 w-[84%] pl-2">{reason || '.........................................................................................................'}</span>
                      </p>

                      <p className="m-0 leading-relaxed">
                        Kính mong được sự chấp thuận của Lãnh đạo.
                      </p>
                      
                      <p className="m-0 leading-relaxed">
                        Chân thành cảm ơn!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-3 text-justify">
                      <p className="m-0 leading-relaxed">
                        Tôi tên là: <span className="font-bold pl-1">{fullName || '....................................................................................'}</span>
                        <span className="inline-block pl-8">Chức vụ:</span> <span className="font-bold pl-1">{position || '.....................................................................'}</span>
                      </p>
                      
                      <p className="m-0 leading-relaxed">
                        Đơn vị công tác: <span className="font-bold pl-1 text-justify">{parentOrg}{orgName ? ` - ${orgName}` : ''}</span>
                      </p>

                      <p className="m-0 leading-relaxed" style={{ textIndent: '1.27cm' }}>
                        Nay tôi làm đơn này kính gửi đến quý Lãnh đạo cho tôi xin nghỉ phép <span className="font-bold pl-1">{leaveTypeDescription || '........................................'}</span>, số lượng: <span className="font-bold pl-1">{totalDays || '......'}</span> ngày.
                      </p>

                      <p className="m-0 leading-relaxed" style={{ textIndent: '1.27cm' }}>
                        Từ ngày: <span className="font-bold pl-1">{fromDate || '.......................'}</span> đến hết ngày: <span className="font-bold pl-1">{toDate || '.......................'}</span>
                      </p>

                      <p className="m-0 leading-relaxed text-justify" style={{ textIndent: '1.27cm' }}>
                        Lý do xin nghỉ: <span className="pl-1">{reason || '............................................................................................................................................................................................................................................'}</span>
                      </p>

                      <p className="m-0 leading-relaxed" style={{ textIndent: '1.27cm' }}>
                        Kính mong nhận được sự xem xét và tạo điều kiện chấp thuận của quý Ban Lãnh đạo.
                      </p>
                      
                      <p className="m-0 leading-relaxed">
                        Tôi xin chân thành cảm ơn!
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Signing Area */}
                <div className="mt-auto pt-6">
                  
                  {/* Location & Date */}
                  <div className="text-right italic mb-5 pr-4" style={{ fontSize: `${fontSize - 1}px` }}>
                    {locationName || '....................'}, ngày {docDate.day || '...'} tháng {docDate.month || '...'} năm {docDate.year || '202...'}
                  </div>

                  {/* Signatures Layout */}
                  <div className="grid grid-cols-3 gap-2 text-center w-full" style={{ fontSize: `${fontSize - 2}px` }}>
                    
                    <div className="flex flex-col items-center">
                      {selectedPresetId === 'tram-y-te' ? (
                        <>
                          <p className="font-bold m-0 uppercase leading-snug">DUYỆT</p>
                          <p className="font-bold m-0 uppercase leading-snug">LÃNH ĐẠO</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold m-0 uppercase leading-snug">DUYỆT LÃNH ĐẠO</p>
                          <p className="italic text-slate-500 m-0 text-[10px] leading-tight mt-0.5">(Ký và ghi rõ họ tên)</p>
                        </>
                      )}
                      <div className="h-16" />
                    </div>

                    <div className="flex flex-col items-center">
                      {selectedPresetId === 'tram-y-te' ? (
                        <>
                          <p className="font-bold m-0 uppercase leading-snug">XÁC NHẬN</p>
                          <p className="font-bold m-0 uppercase leading-snug">KHOA/PHÒNG</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold m-0 uppercase leading-snug">XÁC NHẬN KHOA/PHÒNG</p>
                          <p className="italic text-slate-500 m-0 text-[10px] leading-tight mt-0.5">(Ký và ghi rõ họ tên)</p>
                        </>
                      )}
                      <div className="h-16" />
                    </div>

                    <div className="flex flex-col items-center">
                      {selectedPresetId === 'tram-y-te' ? (
                        <p className="font-bold m-0 leading-snug">Người viết đơn</p>
                      ) : (
                        <>
                          <p className="font-bold m-0 uppercase leading-snug">NGƯỜI LÀM ĐƠN</p>
                          <p className="italic text-slate-500 m-0 text-[10px] leading-tight mt-0.5">(Ký và ghi rõ họ tên)</p>
                        </>
                      )}
                      
                      {/* Interactive Drawn Signature Preview! */}
                      <div className="h-16 flex items-center justify-center relative w-full pt-1">
                        {signatureImgUrl ? (
                          <img 
                            src={signatureImgUrl} 
                            alt="Signature" 
                            className="max-h-[50px] max-w-[124px] object-contain relative z-20 pointer-events-none" 
                          />
                        ) : (
                          <div className="no-print-indicator text-[9px] text-slate-350 italic border border-dashed border-slate-200 rounded px-1.5 py-1 select-none">Chưa ký</div>
                        )}
                      </div>

                      <p className="font-bold m-0 pt-1 text-slate-900 truncate max-w-full" style={{ fontSize: `${fontSize - 1}px` }}>
                        {fullName || '....................................'}
                      </p>
                    </div>

                  </div>

                </div>

              </div>
            </div>
            
          </div>
          
        </div>

      </div>
    </div>
  );
}

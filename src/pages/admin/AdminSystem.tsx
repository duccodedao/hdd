import React, { useState } from 'react';
import { collection, getDocs, writeBatch, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { Download, Upload, AlertCircle } from 'lucide-react';

export default function AdminSystem() {
  const [loading, setLoading] = useState(false);

  const collections = [
    'device_logins', 'blockedIps', 'users', 'contact_requests', 'utilities', 
    'activities', 'user_ai_keys', 'forms', 'form_responses', 
    'document_categories', 'documents'
  ];

  const handleExport = async () => {
    setLoading(true);
    try {
      const data: Record<string, any[]> = {};
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        data[col] = snap.docs.map(doc => {
          const docData = doc.data();
          // Sanitize Timestamps
          const sanitized: any = { id: doc.id };
          for (const key in docData) {
            if (docData[key] instanceof Timestamp) {
              sanitized[key] = { _t: 'timestamp', val: docData[key].toDate().toISOString() };
            } else {
              sanitized[key] = docData[key];
            }
          }
          return sanitized;
        });
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system_export_${new Date().toISOString()}.json`;
      link.click();
      toast.success('Đã xuất dữ liệu hệ thống.');
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi xuất dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            console.log("Starting import...");
            const data = JSON.parse(event.target?.result as string);
            
            let batch = writeBatch(db);
            let opCount = 0;
            const BATCH_SIZE = 400; // Keep safely below 500
            
            for (const col of collections) {
                if (data[col] && Array.isArray(data[col])) {
                    for (const item of data[col]) {
                        const { id, ...docData } = item;
                        // Process Timestamp
                        for (const key in docData) {
                            if (docData[key] && docData[key]._t === 'timestamp') {
                                docData[key] = Timestamp.fromDate(new Date(docData[key].val));
                            }
                        }
                        const docRef = doc(db, col, id);
                        batch.set(docRef, docData);
                        opCount++;

                        if (opCount >= BATCH_SIZE) {
                            await batch.commit();
                            console.log(`Committed batch of ${opCount} docs`);
                            batch = writeBatch(db);
                            opCount = 0;
                        }
                    }
                }
            }
            if (opCount > 0) {
                await batch.commit();
                console.log(`Committed final batch of ${opCount} docs`);
            }
            toast.success('Đã import dữ liệu hệ thống thành công');
        } catch (err) {
            console.error("Import error:", err);
            toast.error('Lỗi khi import dữ liệu: ' + (err as Error).message);
        } finally {
            setLoading(false);
            console.log("Import finished.");
        }
    };
    reader.onerror = (e) => {
        console.error("File reader error:", e);
        toast.error("Lỗi khi đọc file");
        setLoading(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">Hệ thống System Data</h2>
        <p className="text-sm text-slate-500">Xuất/Nhập dữ liệu toàn bộ hệ thống (dùng cho việc migrate firebase).</p>

        <div className="flex gap-4">
            <button disabled={loading} onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20">
                <Download size={16}/> {loading ? 'Đang xử lý...' : 'Xuất Toàn bộ JSON'}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg text-sm font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">
                <Upload size={16}/> {loading ? 'Đang import...' : 'Import Toàn bộ JSON'}
                <input disabled={loading} type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> Lưu ý: Import sẽ ghi đè lên dữ liệu hiện có dựa trên ID.
        </div>
    </div>
  );
}

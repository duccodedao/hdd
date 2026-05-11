import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Files } from 'lucide-react';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
  role?: 'standard' | 'primary' | 'prefilled';
}

interface Form {
  id: string;
  name: string;
  slug: string;
  description: string;
  questions: Question[];
  hasDataset?: boolean;
  dataset?: any[];
}

export default function FormView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  useEffect(() => {
    const fetchForm = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'forms'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setForm({ id: snap.docs[0].id, ...data } as Form);
          // Initialize answers
          const initialAnswers: any = {};
          (data.questions || []).forEach((q: any) => { 
            initialAnswers[q.id] = ''; 
          });
          setAnswers(initialAnswers);
        } else {
          setForm(null);
        }
      } catch (e) {
        console.error(e);
        toast.error('Lỗi khi tải thông tin Folder');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [slug]);

  // Handle record selection
  useEffect(() => {
    if (!selectedRecordId || !form?.dataset) return;
    
    const record = form.dataset.find(r => r._id === selectedRecordId);
    if (!record) return;

    const updatedAnswers = { ...answers };
    form.questions.forEach(q => {
      if (q.role === 'primary' || q.role === 'prefilled') {
        const val = record[q.label] || '';
        updatedAnswers[q.id] = val;
      }
    });
    setAnswers(updatedAnswers);
  }, [selectedRecordId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Check if dataset record is selected
    const primaryQuestions = form.questions.filter(q => q.role === 'primary');
    if (form.hasDataset && primaryQuestions.length > 0 && !selectedRecordId) {
      toast.error('Vui lòng chọn thông tin của bạn!');
      return;
    }

    // Validation
    for (const q of form.questions) {
      if (q.required && !answers[q.id]) {
        toast.error(`Vui lòng điền: ${q.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'form_responses'), {
        formId: form.id,
        formSlug: form.slug,
        answers,
        datasetRecordId: selectedRecordId || null,
        submittedAt: serverTimestamp(),
        userId: auth.currentUser?.uid || 'anonymous'
      });
      setSubmitted(true);
      toast.success('Gửi phản hồi thành công!');
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi gửi phản hồi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold dark:text-white mb-2">Folder không tồn tại</h2>
        <p className="text-slate-500 mb-8">Liên kết này có thể đã bị xóa hoặc không hợp lệ.</p>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-purple-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-10 text-center shadow-xl shadow-purple-500/5"
        >
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white mb-4">Gửi thành công!</h2>
          <p className="text-slate-600 dark:text-zinc-400 mb-8 leading-relaxed">
            Cảm ơn bạn đã phản hồi vào Folder <b>{form.name}</b>. Chúng tôi đã ghi nhận dữ liệu của bạn.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="w-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white py-3 rounded-2xl font-bold hover:bg-slate-200 transition"
          >
            Gửi phản hồi khác
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-12 px-6">
       <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 text-white shadow-xl shadow-purple-500/20 mb-2">
                <Files className="w-8 h-8" />
             </div>
             <h1 className="text-3xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{form.name}</h1>
             {form.description && (
               <p className="text-slate-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">{form.description}</p>
             )}
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 lg:p-10 shadow-xl shadow-purple-500/5 space-y-8">
             <div className="space-y-6">
                {form.hasDataset && form.dataset && (
                  <div className="p-6 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 space-y-4">
                     <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                        Chọn thông tin của bạn
                     </label>
                     <select
                       value={selectedRecordId}
                       onChange={(e) => setSelectedRecordId(e.target.value)}
                       className="w-full bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-500/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                     >
                        <option value="">-- Chọn từ danh sách --</option>
                        {form.dataset.map((record) => {
                          const primaryLabel = form.questions
                            .filter(q => q.role === 'primary')
                            .map(q => record[q.label])
                            .join(' - ');
                          return (
                            <option key={record._id} value={record._id}>
                               {primaryLabel || 'Bản ghi ' + record._id.slice(0,4)}
                            </option>
                          );
                        })}
                     </select>
                     <p className="text-[10px] text-purple-400 font-medium">Dữ liệu liên quan sẽ tự động được điền sau khi bạn chọn.</p>
                  </div>
                )}

                {form.questions.map((q) => {
                  const isReadOnly = q.role === 'primary' || q.role === 'prefilled';
                  
                  return (
                    <div key={q.id} className={`space-y-2 ${isReadOnly ? 'opacity-80' : ''}`}>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                        {q.label} {q.required && <span className="text-rose-500">*</span>}
                      </label>
                      
                      {q.type === 'textarea' ? (
                        <textarea
                          value={answers[q.id]}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white resize-none disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:cursor-not-allowed"
                          rows={4}
                          placeholder="Nhập câu trả lời..."
                          readOnly={isReadOnly}
                          disabled={isReadOnly}
                        />
                      ) : q.type === 'select' ? (
                        <select
                          value={answers[q.id]}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:cursor-not-allowed"
                          disabled={isReadOnly}
                        >
                          <option value="">Chọn một tùy chọn...</option>
                          {q.options?.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={q.type}
                          value={answers[q.id]}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:cursor-not-allowed"
                          placeholder="Nhập câu trả lời..."
                          readOnly={isReadOnly}
                          disabled={isReadOnly}
                        />
                      )}
                    </div>
                  );
                })}
             </div>

             <button 
               type="submit"
               disabled={submitting}
               className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50"
             >
               {submitting ? (
                 <>
                   <Loader2 className="w-6 h-6 animate-spin" />
                   Đang gửi...
                 </>
               ) : (
                 <>
                   <Send className="w-6 h-6" />
                   Gửi phản hồi
                 </>
               )}
             </button>
          </form>

          <div className="text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-40">
               Protected by Secure Shield & Firebase
             </p>
          </div>
       </div>
    </div>
  );
}

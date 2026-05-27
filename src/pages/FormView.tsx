import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Files } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface Question {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  required: boolean;
  options?: string[];
  correctAnswer?: string | string[];
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
  isAnonymous?: boolean;
  collectUserInfo?: boolean;
  limitOneResponse?: boolean;
  maxResponses?: number;
}

export default function FormView() {
  const { user } = useAuthStore();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [limitReached, setLimitReached] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | null }>({});
  const saveTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const updateAnswer = (qId: string, value: any) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [qId]: value };
      if (form) {
        localStorage.setItem(`form_draft_${form.slug}`, JSON.stringify(newAnswers));
      }
      return newAnswers;
    });

    setSaveStatus(prev => ({ ...prev, [qId]: 'saving' }));
    
    if (saveTimeouts.current[qId]) {
      clearTimeout(saveTimeouts.current[qId]);
    }
    
    saveTimeouts.current[qId] = setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [qId]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [qId]: null }));
      }, 2000);
    }, 800);
  };

  useEffect(() => {
    const fetchForm = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'forms'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const formId = snap.docs[0].id;
          const formData = { id: formId, ...data } as Form;
          setForm(formData);
          
          // Check limits
          if (formData.maxResponses && formData.maxResponses > 0) {
            const respQ = query(collection(db, 'form_responses'), where('formId', '==', formId));
            const respSnap = await getDocs(respQ);
            if (respSnap.size >= formData.maxResponses) {
              setLimitReached(true);
            }
          }

          if (formData.limitOneResponse && auth.currentUser) {
            const myRespQ = query(
              collection(db, 'form_responses'), 
              where('formId', '==', formId),
              where('userId', '==', auth.currentUser.uid),
              limit(1)
            );
            const myRespSnap = await getDocs(myRespQ);
            if (!myRespSnap.empty) {
              setHasResponded(true);
            }
          }

          // Initialize answers
          let initialAnswers: any = {};
          const savedDraft = localStorage.getItem(`form_draft_${formData.slug}`);
          if (savedDraft) {
            try {
              initialAnswers = JSON.parse(savedDraft);
            } catch (e) {}
          } else {
            (formData.questions || []).forEach((q: any) => { 
              initialAnswers[q.id] = ''; 
            });
          }
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
  }, [slug, user]);

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
    if (form) {
      localStorage.setItem(`form_draft_${form.slug}`, JSON.stringify(updatedAnswers));
    }
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
      const payload: any = {
        formId: form.id,
        formSlug: form.slug,
        answers,
        datasetRecordId: selectedRecordId || null,
        submittedAt: serverTimestamp(),
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        userDisplayName: auth.currentUser?.displayName || 'anonymous'
      };

      if (auth.currentUser) {
        payload.userId = auth.currentUser.uid;
        payload.userEmail = auth.currentUser.email || 'anonymous';
        payload.userDisplayName = auth.currentUser.displayName || 'anonymous';
      }

      await addDoc(collection(db, 'form_responses'), payload);
      localStorage.removeItem(`form_draft_${form.slug}`);
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

  if (limitReached) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-rose-300" />
        </div>
        <h2 className="text-2xl font-bold dark:text-white mb-2 text-center text-rose-500">Form đã đóng</h2>
        <p className="text-slate-500 mb-8 text-center max-w-sm">Biểu mẫu này đã đạt giới hạn số lượng người phản hồi tối đa.</p>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-600 font-bold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (hasResponded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold dark:text-white mb-2 text-center">Bạn đã hoàn thành!</h2>
        <p className="text-slate-500 mb-8 text-center max-w-sm">Biểu mẫu này chỉ cho phép mỗi người trả lời một lần duy nhất.</p>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-600 font-bold hover:underline">
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
            onClick={() => {
              setSubmitted(false);
            }}
            className="w-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white py-3 rounded-2xl font-bold hover:bg-slate-200 transition"
          >
            Gửi phản hồi khác
          </button>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-10 text-center shadow-xl shadow-blue-500/5"
        >
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white mb-2">Yêu cầu Đăng nhập</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Biểu mẫu này yêu cầu bạn đăng nhập bằng Google để xác minh danh tính trước khi trả lời.
          </p>
          <button 
            onClick={async () => {
              try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                toast.success('Đăng nhập thành công, tải lại biểu mẫu...');
                setTimeout(() => window.location.reload(), 1000);
              } catch (err) {
                toast.error('Đăng nhập thất bại.');
              }
            }}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 text-slate-700 dark:text-white py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng nhập bằng Google
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
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {q.label} {q.required && <span className="text-rose-500">*</span>}
                        </label>
                        {!isReadOnly && saveStatus[q.id] === 'saving' && <span title="Đang lưu..."><Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" /></span>}
                        {!isReadOnly && saveStatus[q.id] === 'saved' && <span title="Đã lưu vào bộ nhớ tạm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></span>}
                      </div>
                      
                      {q.type === 'textarea' ? (
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={(e) => updateAnswer(q.id, e.target.value)}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white resize-none disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:cursor-not-allowed"
                          rows={4}
                          placeholder="Nhập câu trả lời..."
                          readOnly={isReadOnly}
                          disabled={isReadOnly}
                        />
                      ) : q.type === 'select' ? (
                        <select
                          value={answers[q.id] || ''}
                          onChange={(e) => updateAnswer(q.id, e.target.value)}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:cursor-not-allowed"
                          disabled={isReadOnly}
                        >
                          <option value="">Chọn một tùy chọn...</option>
                          {q.options?.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : q.type === 'radio' ? (
                        <div className="space-y-2">
                           {q.options?.map((opt, i) => (
                             <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                               <input 
                                 type="radio" 
                                 name={q.id}
                                 value={opt}
                                 checked={answers[q.id] === opt}
                                 onChange={(e) => updateAnswer(q.id, e.target.value)}
                                 disabled={isReadOnly}
                                 className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300"
                               />
                               <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                             </label>
                           ))}
                        </div>
                      ) : q.type === 'checkbox' ? (
                        <div className="space-y-2">
                           {q.options?.map((opt, i) => {
                             const currentAnswers = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] ? [answers[q.id]] : []);
                             return (
                             <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                               <input 
                                 type="checkbox" 
                                 value={opt}
                                 checked={currentAnswers.includes(opt)}
                                 onChange={(e) => {
                                    const prevAns = Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] ? [answers[q.id]] : []);
                                    let newVal;
                                    if (e.target.checked) {
                                      newVal = [...prevAns, opt];
                                    } else {
                                      newVal = prevAns.filter((a: string) => a !== opt);
                                    }
                                    updateAnswer(q.id, newVal);
                                 }}
                                 disabled={isReadOnly}
                                 className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-white/10"
                               />
                               <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                             </label>
                           )})}
                        </div>
                      ) : q.type === 'file' ? (
                        <div>
                           <input 
                              type="file"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Update state temporarily to show loading
                                  updateAnswer(q.id, 'Đang tải lên Hệ thống...');
                                  toast.loading('Đang xử lý biên dịch dữ liệu...', { id: `upload-${q.id}` });
                                  try {
                                    const { getDoc, doc } = await import('firebase/firestore');
                                    const { db } = await import('../lib/firebase');
                                    const configDoc = await getDoc(doc(db, 'settings', 'github_integration'));
                                    
                                    let uploadedUrl = null;
                                    if (configDoc.exists()) {
                                      const data = configDoc.data();
                                      const config = {
                                        owner: data.owner || data.username || '',
                                        repo: data.repo || '',
                                        token: data.token || '',
                                        branch: data.branch || 'main',
                                        path: data.path || 'assets/uploads'
                                      };
                                      
                                      if (config.owner && config.repo && config.token) {
                                        const { githubService } = await import('../services/githubService');
                                        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                                        const uploadPath = `${config.path}/forms/${form.slug}/${new Date().getTime()}_${safeName}`;
                                        const result = await githubService.uploadFile(config as any, file, uploadPath, `Form Upload: ${form.name}`);
                                        uploadedUrl = result.url;
                                      }
                                    }

                                    if (uploadedUrl) {
                                      updateAnswer(q.id, uploadedUrl);
                                      toast.success('Upload dữ liệu thành công!', { id: `upload-${q.id}` });
                                    } else {
                                      toast.error('Cấu hình lưu trữ Github chưa hoàn tất, chuyển về Base64 cục bộ...', { id: `upload-${q.id}` });
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        updateAnswer(q.id, event.target?.result);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  } catch (error) {
                                    toast.error('Upload lỗi', { id: `upload-${q.id}` });
                                  }
                                }
                              }}
                              disabled={isReadOnly}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-500/10 dark:file:text-purple-400 dark:hover:file:bg-purple-500/20 disabled:opacity-50 cursor-pointer"
                           />
                           {answers[q.id] && answers[q.id].startsWith('http') && <a href={answers[q.id]} target="_blank" rel="noreferrer" className="block mt-2 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline break-all">Đã đính kèm tệp lên Storage Component</a>}
                           {answers[q.id] && answers[q.id].startsWith('data:') && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">Đã đính kèm Base64 Chunk Data.</p>}
                           {answers[q.id] === 'Đang tải lên Hệ thống...' && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-bold font-mono animate-pulse">Processing Upload Component...</p>}
                        </div>
                      ) : (
                        <input
                          type={q.type}
                          value={answers[q.id] || ''}
                          onChange={(e) => updateAnswer(q.id, e.target.value)}
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

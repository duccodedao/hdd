import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ShieldAlert, ChevronRight, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import MiniLoading from '../../components/ui/MiniLoading';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../../store/authStore';

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  React.useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const resolveIdentifierToEmail = async (id: string) => {
    if (id.includes('@')) return id;
    const q = query(collection(db, 'users'), where('phoneNumber', '==', id));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Account identifier not found.');
    return snap.docs[0].data().email;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error('Incomplete data.');
    
    setLoading(true);
    try {
      const email = await resolveIdentifierToEmail(identifier);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (!userDoc.exists()) {
        throw new Error('Hồ sơ không tồn tại.');
      }
      
      const role = userDoc.data()?.role;
      if (role !== 'admin' && role !== 'superadmin' && userCred.user.email !== 'sonlyhongduc@gmail.com') {
         await auth.signOut();
         throw new Error('Truy cập bị từ chối. Không đủ quyền hạn.');
      }

      toast.success('Xác thực quản trị thành công.');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Xác thực thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row relative overflow-hidden animate-fade-in font-sans">
      <Helmet>
        <title>Admin Gateway | BMASS Dashboard</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Admin Visual Side */}
      <div className="hidden md:flex flex-col justify-between p-16 w-1/2 relative bg-zinc-950 border-r border-white/5 overflow-hidden">
         <div className="absolute top-[30%] left-[-20%] w-[50vw] h-[50vw] bg-[#6366f1]/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-[#8b5cf6]/5 rounded-full blur-[100px]" />
         
         <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-4 mb-24">
                 <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                 </div>
                 <span className="text-xl font-black text-white tracking-[0.2em] uppercase">b.admin</span>
              </div>
  
              <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
                     <AlertTriangle className="w-3 h-3 text-red-500" />
                     <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Khu Vực Hạn Chế</span>
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] text-left">
                     Hệ thống <br /> <span className="text-zinc-600">quản trị.</span>
                  </h2>
                  <p className="text-zinc-400 text-lg max-w-sm leading-relaxed font-medium mt-6">
                    Hệ thống này chỉ dành cho nhân sự được ủy quyền. Mọi truy cập trái phép sẽ bị ghi lại.
                  </p>
              </div>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-12" />
         </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-[#0a0a0b] relative">
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
         
        <div className="w-full max-w-md space-y-10 relative z-10">
          <header className="space-y-3">
             <div className="md:hidden flex items-center gap-3 mb-10">
                 <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-indigo-400" />
                 </div>
                <span className="text-lg font-black text-white uppercase tracking-widest">b.admin</span>
             </div>
             <h3 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
               Gateway Access
             </h3>
             <p className="text-zinc-500 text-sm font-medium">
                Vui lòng cung cấp thông tin xác thực cấp cao.
             </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Định Danh Admin</label>
                <div className="relative">
                  <input 
                    type="text" 
                    disabled={loading}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-12 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-medium text-white placeholder:text-zinc-700"
                    placeholder="Email hoặc định danh"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mật khẩu cấp phép</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full bg-zinc-900 border border-white/5 rounded-xl px-4 pr-12 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-medium text-white placeholder:text-zinc-700"
                    placeholder="••••••••"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-zinc-700" />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-zinc-600 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? <MiniLoading className="w-4 h-4 text-white" /> : <>Xác Thực Quyền <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
            </button>
            
            <button 
                type="button"
                onClick={() => navigate('/')}
                className="w-full h-12 bg-transparent text-zinc-500 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
             >
                Trở về trang chủ
             </button>
          </form>
        </div>
      </div>
    </div>
  );
}

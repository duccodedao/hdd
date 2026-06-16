import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  Users, Search, Plus, Edit, Trash, Check, X, Calendar as CalendarIcon, BarChart3, Binary, User, Users2, PieChart as PieChartIcon, CheckSquare, ArrowRight, Clock
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useConfirmStore } from '../store/confirmStore';
import toast from 'react-hot-toast';

interface PopulationData {
  id: string;
  fromAge: number;
  toAge: number;
  maleCount: number;
  femaleCount: number;
  createdAt?: number;
  updatedAt?: number;
}

export default function PopulationPage() {
  const { user, isSuperAdmin, isAdmin, userData } = useAuthStore();
  const { openConfirm } = useConfirmStore();
  const canEdit = (isSuperAdmin || isAdmin) && userData?.role !== 'review';

  const [population, setPopulation] = useState<PopulationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PopulationData | null>(null);
  const [fromAge, setFromAge] = useState<number>(0);
  const [toAge, setToAge] = useState<number>(100);
  const [maleCount, setMaleCount] = useState<number>(0);
  const [femaleCount, setFemaleCount] = useState<number>(0);

  useEffect(() => {
    if (userData?.role === 'review') {
      setPopulation([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'hrm_population'), orderBy('fromAge', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PopulationData));
      setPopulation(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hrm_population');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFromAge(0);
    setToAge(100);
    setMaleCount(0);
    setFemaleCount(0);
  };

  const handleEdit = (item: PopulationData) => {
    setEditingItem(item);
    setFromAge(item.fromAge);
    setToAge(item.toAge);
    setMaleCount(item.maleCount);
    setFemaleCount(item.femaleCount);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (fromAge > toAge) {
      toast.error('Độ tuổi bắt đầu không thể lớn hơn độ tuổi kết thúc.');
      return;
    }

    const payload = {
      fromAge,
      toAge,
      maleCount,
      femaleCount,
      updatedAt: Date.now()
    };

    const toastId = toast.loading('Đang lưu...');
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'hrm_population', editingItem.id), payload);
        toast.success('Cập nhật thành công!', { id: toastId });
      } else {
        await addDoc(collection(db, 'hrm_population'), { ...payload, createdAt: Date.now() });
        toast.success('Thêm mới thành công!', { id: toastId });
      }
      handleCloseModal();
    } catch (err) {
      toast.error('Lỗi khi lưu dữ liệu', { id: toastId });
    }
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    openConfirm({
      title: 'Xóa dữ liệu',
      message: 'Bạn có chắc chắn muốn xóa khoảng độ tuổi này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'hrm_population', id));
          toast.success('Đã xóa thành công!');
        } catch (err) {
          toast.error('Lỗi khi xóa');
        }
      }
    });
  };

  const filteredList = population.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return `${item.fromAge}`.includes(q) || `${item.toAge}`.includes(q) || `${item.fromAge}-${item.toAge}`.includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (!canEdit || selectedIds.length === 0) return;
    openConfirm({
      title: 'Xóa hàng loạt',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} khoảng độ tuổi đã chọn?`,
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const tid = toast.loading('Đang xóa...');
        try {
          for (const id of selectedIds) {
            await deleteDoc(doc(db, 'hrm_population', id));
          }
          toast.success('Đã xóa thành công.', { id: tid });
          setSelectedIds([]);
        } catch (err) {
          toast.error('Lỗi khi xóa hàng loạt.', { id: tid });
        }
      }
    });
  };

  const totals = population.reduce((acc, curr) => ({
    male: acc.male + curr.maleCount,
    female: acc.female + curr.femaleCount,
    total: acc.total + curr.maleCount + curr.femaleCount,
    over18: acc.over18 + (curr.fromAge >= 18 ? curr.maleCount + curr.femaleCount : 0),
    over20: acc.over20 + (curr.fromAge >= 20 ? curr.maleCount + curr.femaleCount : 0),
    over40: acc.over40 + (curr.fromAge >= 40 ? curr.maleCount + curr.femaleCount : 0),
    over50: acc.over50 + (curr.fromAge >= 50 ? curr.maleCount + curr.femaleCount : 0),
    range50_69: acc.range50_69 + (curr.fromAge >= 50 && curr.toAge <= 69 ? curr.maleCount + curr.femaleCount : 0),
  }), { 
    male: 0, female: 0, total: 0, 
    over18: 0, over20: 0, over40: 0, over50: 0, range50_69: 0 
  });

  const chartData = [
    { name: 'Nam', value: totals.male },
    { name: 'Nữ', value: totals.female }
  ];

  const COLORS = ['#3b82f6', '#ec4899'];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 pb-20">
      <Helmet>
        <title>Dữ liệu Dân số Phường | BMASS</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 pt-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 text-indigo-500 font-mono text-[10px] font-bold uppercase tracking-widest bg-indigo-50/50 dark:bg-indigo-500/10 px-3 py-1 rounded-full w-fit">
            <Users className="w-3 h-3" />
            <span>Population Stats</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Dữ liệu Dân số Phường
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl mt-1.5 leading-relaxed">
            Thống kê chi tiết dân số theo các nhóm độ tuổi và giới tính của toàn Phường.
          </p>
          {population.length > 0 && (
            <p className="text-[10px] font-bold text-indigo-500/80 dark:text-indigo-400/80 mt-2 flex items-center gap-1.5 font-mono uppercase tracking-widest">
              <Clock size={12} />
              Dữ liệu được cập nhật vào ngày {new Date(Math.max(...population.map(p => p.updatedAt || p.createdAt || 0))).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>

        {/* Stats Summary & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng số Nam</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{totals.male.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-2xl">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng số Nữ</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{totals.female.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Users2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toàn phường</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totals.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Tỷ lệ giới tính</h3>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      borderRadius: '16px', 
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Expanded Stats Brackets */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dân số 18+</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{(totals.over18 || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dân số 20+</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{(totals.over20 || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dân số 40+</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{(totals.over40 || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dân số 50+</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{(totals.over50 || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dân số 50-69</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{(totals.range50_69 || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Tìm theo độ tuổi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-sm"
              />
            </div>
            {canEdit && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Plus size={16} />
                Thêm khoảng tuổi
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-black/25 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5">
                  <th className="py-4 px-6 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-4 px-6 w-16">STT</th>
                  <th className="py-4 px-6">Khoảng độ tuổi</th>
                  <th className="py-4 px-6">Số lượng Nam</th>
                  <th className="py-4 px-6">Số lượng Nữ</th>
                  <th className="py-4 px-6 bg-slate-100/30 dark:bg-white/5 font-bold text-slate-900 dark:text-white">Tổng cộng</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredList.map((item, index) => (
                  <tr key={item.id} className={`hover:bg-slate-50/20 dark:hover:bg-white/[0.01] transition-all ${selectedIds.includes(item.id) ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                    <td className="py-4 px-6">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">{index + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <CalendarIcon className="w-4 h-4 text-indigo-500" />
                        <span>{item.fromAge} - {item.toAge} tuổi</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-blue-600 dark:text-blue-400 font-medium italic">{item.maleCount.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-pink-600 dark:text-pink-400 font-medium italic">{item.femaleCount.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6 bg-slate-100/10 dark:bg-white/[0.02] font-black text-slate-900 dark:text-white text-base">
                      {(item.maleCount + item.femaleCount).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                              <Trash size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-full">
                          <Binary className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Chưa có dữ liệu nào được ghi nhận.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-white dark:border-white/10"
            >
              <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {editingItem ? <Edit size={20} className="text-indigo-500" /> : <Plus size={20} className="text-indigo-500" />}
                  {editingItem ? 'Sửa thông tin độ tuổi' : 'Thêm khoảng độ tuổi mới'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:bg-white dark:hover:bg-white/5 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Từ độ tuổi</label>
                    <input 
                      type="number"
                      value={fromAge}
                      onChange={(e) => setFromAge(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Đến độ tuổi</label>
                    <input 
                      type="number"
                      value={toAge}
                      onChange={(e) => setToAge(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 text-blue-500">Số lượng Nam</label>
                    <input 
                      type="number"
                      value={maleCount}
                      onChange={(e) => setMaleCount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 text-pink-500">Số lượng Nữ</label>
                    <input 
                      type="number"
                      value={femaleCount}
                      onChange={(e) => setFemaleCount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={handleCloseModal} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 text-sm font-bold rounded-2xl">Hủy</button>
                  <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-500/20">Lưu thông tin</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-[32px] shadow-2xl flex items-center gap-6 border border-white/10 shadow-indigo-500/20"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Đã chọn</span>
              <span className="text-sm font-black">{selectedIds.length} hàng</span>
            </div>
            
            <div className="h-8 w-px bg-white/10 dark:bg-slate-200" />
            
            <div className="flex items-center gap-2">
              <div className="relative group/actions">
                <button 
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-500/20"
                >
                  <CheckSquare size={14} /> Thao tác / Hành động
                  <ArrowRight size={14} className="group-hover/actions:rotate-90 transition-transform" />
                </button>
                
                <div className="absolute bottom-full mb-3 right-0 w-52 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all">
                  <button 
                    onClick={handleBulkDelete}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold transition-all text-left"
                  >
                    <Trash size={14} /> Xóa tất cả đã chọn
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setSelectedIds([])}
                className="p-3 hover:bg-white/10 dark:hover:bg-slate-100 rounded-xl transition-all"
                title="Hủy chọn"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

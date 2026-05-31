import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Globe, LineChart, Users, AppWindow, Files, ShieldAlert, Code, FolderOpen } from 'lucide-react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
// import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface AdminOverviewProps {
  siteStats: { 
    today: number, 
    month: number, 
    year: number, 
    total: number, 
    last7Days: { date: string, visits: number, devices: number }[] 
  };
  users: any[];
  allUtilities: any[];
  activityData: any[];
  roleDistribution: any[];
  contacts: any[];
  adminAppsCount: number;
}

export default function AdminOverview({ siteStats, users, allUtilities, activityData, roleDistribution, contacts, adminAppsCount }: AdminOverviewProps) {
  const [counts, setCounts] = useState({
    forms: 0,
    blockedIps: 0,
    apiKeys: 0,
    documents: 0,
    partners: 0,
    utilities: 0
  });
  
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [formsSnap, blockedSnap, apiKeysSnap, docsSnap, partnersSnap, utilsSnap] = await Promise.all([
          getCountFromServer(collection(db, 'forms')),
          getCountFromServer(collection(db, 'blockedIps')),
          getCountFromServer(collection(db, 'user_ai_keys')),
          getCountFromServer(collection(db, 'documents')),
          getCountFromServer(collection(db, 'partners')),
          getCountFromServer(collection(db, 'utilities'))
        ]);
        
        setCounts({
          forms: formsSnap.data().count,
          blockedIps: blockedSnap.data().count,
          apiKeys: apiKeysSnap.data().count,
          documents: docsSnap.data().count,
          partners: partnersSnap.data().count,
          utilities: utilsSnap.data().count
        });
      } catch (e) {
        console.error("Dashboard overview stats fetch error:", e);
      }
    };
    fetchCounts();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* 1. Lượt Truy Cập */}
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Lượt truy cập trang</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Activity size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Hôm nay</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{siteStats.today.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Globe size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tháng này</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{siteStats.month.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <LineChart size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Năm nay</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{siteStats.year.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Activity size={18} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tổng cộng</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{siteStats.total.toLocaleString()}</div>
        </div>
      </div>

      {/* 2. Thống kê Dữ liệu (Entity Counts) */}
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 mt-8">Tổng quan Dữ liệu</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Người Dùng</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <AppWindow className="text-indigo-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Ứng Dụng</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{adminAppsCount}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-emerald-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Tiện Ích</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts.utilities}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-rose-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Tiện ích ẩn</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{allUtilities.filter((u: any) => u.hidden).length}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="text-cyan-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Kho Văn Bản</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts.documents}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Files className="text-amber-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Forms</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts.forms}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-rose-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">IP Banned</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts.blockedIps}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-teal-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">Đối Tác</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts.partners}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Code className="text-purple-500 w-5 h-5"/>
            <span className="text-xs font-bold text-slate-500">API Keys</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{counts.apiKeys}</div>
        </div>
      </div>

      {/* 3. Charts */}
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 mt-8">Biểu Đồ & Hoạt Động</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simple Bar Chart for Activity */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm flex flex-col">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Lượt truy cập (7 ngày qua)</h4>
          <div className="flex justify-between items-center mb-6">
             <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div><span className="text-xs text-slate-500 font-medium">Lượt Xem (Visits)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-400"></div><span className="text-xs text-slate-500 font-medium">Thiết Bị Ghi Nhận</span></div>
             </div>
          </div>
          <div className="h-64 flex items-end gap-2 mt-auto">
            {siteStats.last7Days && siteStats.last7Days.length > 0 ? siteStats.last7Days.map((data, index) => {
              const maxCount = Math.max(...siteStats.last7Days.map(d => Math.max(d.visits, d.devices)), 1);
              const heightVisits = Math.max((data.visits / maxCount) * 100, 2);
              const heightDevices = Math.max((data.devices / maxCount) * 100, 2);
              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
                  <div className="absolute -top-10 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointers-events-none flex flex-col gap-0.5">
                     <span className="font-bold border-b border-white/20 pb-0.5 mb-0.5">{data.date}</span>
                     <span>Visits: {data.visits}</span>
                     <span>Devices: {data.devices}</span>
                  </div>
                  <div className="flex items-end justify-center w-full gap-0.5 h-full">
                     <div 
                       className="w-full bg-blue-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all duration-300 max-w-[12px]"
                       style={{ height: `${heightVisits}%` }}
                     ></div>
                     <div 
                       className="w-full bg-indigo-400 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all duration-300 max-w-[12px]"
                       style={{ height: `${heightDevices}%` }}
                     ></div>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 whitespace-nowrap">{data.date}</div>
                </div>
              );
            }) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">Chưa có dữ liệu hoạt động</div>
            )}
          </div>
        </div>
        
        {/* Simple Horizontal Bar Chart for Distribution (Alternative to Pie) */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Phân Bổ Quyền Hạn (Role Distribution)</h4>
          <div className="flex flex-col justify-center h-64 gap-4 overflow-y-auto">
            {roleDistribution.length > 0 ? roleDistribution.map((entry, index) => {
              const totalRoles = roleDistribution.reduce((acc, curr) => acc + curr.value, 0) || 1;
              const percentage = Math.round((entry.value / totalRoles) * 100);
              return (
                <div key={index} className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{entry.name}</span>
                    <span className="text-slate-500">{entry.value} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                  </div>
                </div>
              );
            }) : (
               <div className="flex h-full items-center justify-center text-sm text-slate-500">Đang tải phân bổ...</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

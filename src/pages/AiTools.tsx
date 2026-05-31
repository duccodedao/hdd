import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sparkles, ExternalLink, Search } from 'lucide-react';

export default function AiTools() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ai_tools'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in-memory instead of firestore query ordering
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setTools(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching AI tools:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTools = tools.filter(tool => 
    tool.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1800px] mx-auto py-8 lg:py-12 space-y-8 animate-fade-in no-scrollbar px-4 bg-transparent min-h-screen">
      <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">AI Tools</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Danh sách các công cụ AI hỗ trợ công việc do ban quản trị chọn lọc.</p>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Danh sách công cụ ({filteredTools.length})</h2>
            <div className="relative w-full sm:w-64">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm công cụ..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
               />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Logo AI</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên AI</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mô tả (Ngắn)</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="p-4">
                      {tool.logoUrl ? (
                        <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden shrink-0">
                          <img src={tool.logoUrl} alt={tool.name} className="w-full h-full object-cover rounded-lg" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                       <div className="font-bold text-slate-900 dark:text-white">{tool.name}</div>
                    </td>
                    <td className="p-4">
                       <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 max-w-sm">{tool.description}</div>
                    </td>
                    <td className="p-4 text-right">
                       <a 
                         href={tool.url} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                       >
                         Mở <ExternalLink className="w-3.5 h-3.5" />
                       </a>
                    </td>
                  </tr>
                ))}
                {filteredTools.length === 0 && !loading && (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-slate-500">Không tìm thấy công cụ nào!</td>
                   </tr>
                )}
                {loading && (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-slate-500">Đang tải danh sách...</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}

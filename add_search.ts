import fs from "fs";

let content = fs.readFileSync("src/pages/WalletPage.tsx", "utf8");

if (!content.includes("const [searchTx, setSearchTx] = useState('')")) {
  content = content.replace(
    "const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');",
    "const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');\n  const [searchTx, setSearchTx] = useState('');"
  );
}

const tableSearchForm = `        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Lịch sử nạp tiền ví</h3>
            <span className="text-[10px] font-bold text-slate-400">Thời gian thực</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-48 overflow-hidden rounded-xl border border-slate-100 dark:border-white/10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input 
                type="text" 
                value={searchTx} 
                onChange={(e) => setSearchTx(e.target.value)} 
                placeholder="Tìm mã giao dịch..." 
                className="pl-8 pr-3 py-1.5 w-full bg-slate-50 dark:bg-zinc-900 border-none outline-none text-xs font-medium text-slate-800 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-zinc-900 p-1 rounded-xl border border-slate-100 dark:border-white/5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'completed', label: 'Thành công' },
                { id: 'pending', label: 'Đang duyệt' },
                { id: 'cancelled', label: 'Đã hủy' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={\`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap cursor-pointer \${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-zinc-850 text-slate-900 dark:text-white shadow-sm font-black'
                      : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-350'
                  }\`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>`;

const originalTop = `        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Lịch sử nạp tiền ví</h3>
            <span className="text-[10px] font-bold text-slate-400">Thời gian thực</span>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-zinc-900 p-1 rounded-xl border border-slate-100 dark:border-white/5">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'completed', label: 'Thành công' },
              { id: 'pending', label: 'Đang duyệt' },
              { id: 'cancelled', label: 'Đã hủy' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={\`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap cursor-pointer \${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-zinc-850 text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-350'
                }\`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>`;

content = content.replace(originalTop, tableSearchForm);

const filterLogicOld = `<tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {deposits
                  .filter((d) => {
                    if (statusFilter === 'all') return true;
                    const isSucceeded = d.status === "completed" || d.status === "paid";
                    if (statusFilter === "completed") return isSucceeded;
                    if (statusFilter === "pending") return d.status === "pending";
                    if (statusFilter === "cancelled") return d.status !== "pending" && !isSucceeded;
                    return true;
                  })`;
const filterLogicNew = `<tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {deposits
                  .filter((d) => {
                    let matchesStatus = true;
                    if (statusFilter !== 'all') {
                      const isSucceeded = d.status === "completed" || d.status === "paid";
                      if (statusFilter === "completed") matchesStatus = isSucceeded;
                      else if (statusFilter === "pending") matchesStatus = d.status === "pending";
                      else if (statusFilter === "cancelled") matchesStatus = d.status !== "pending" && !isSucceeded;
                    }
                    
                    let matchesSearch = true;
                    if (searchTx.trim()) {
                      const searchStr = searchTx.toLowerCase();
                      matchesSearch = d.id?.toLowerCase().includes(searchStr) || 
                                      d.paymentDetails?.referenceCode?.toLowerCase().includes(searchStr);
                    }
                    
                    return matchesStatus && matchesSearch;
                  })`;

content = content.replace(filterLogicOld, filterLogicNew);

fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
console.log("Replaced successfully!");

import fs from "fs";

let content = fs.readFileSync("src/pages/StorePage.tsx", "utf8");

const oldHero = `<div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-12 text-white">
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            Product Marketplace
          </div>
          <h1 className="text-5xl font-black tracking-tighter leading-none">
            Cửa hàng <span className="text-indigo-500 italic">BMASS.</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            Sở hữu ngay các công cụ AI cao cấp và kho văn bản chuyên nghiệp chỉ với một lần thanh toán bằng ví điện tử.
          </p>
          <div className="flex items-center gap-4 pt-4">
             <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-white/10">
                <div className="p-2 bg-indigo-500 rounded-xl">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none mb-1">Số dư của bạn</p>
                  <p className="text-xl font-black text-white">{(userData?.balance || 0).toLocaleString()}đ</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/wallet'}
                  className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-xs font-bold text-indigo-400"
                >
                  Nạp tiền <ArrowRight className="w-3 h-3" />
                </button>
             </div>
          </div>
        </div>

        <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:flex items-center justify-center opacity-20">
           <ShoppingBag className="w-96 h-96 text-indigo-500 rotate-12" />
        </div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>`;

const newHero = `      {/* Clean Hero Layout */}
      <div className="relative bg-white dark:bg-zinc-950 p-8 sm:p-12 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="relative z-10 max-w-xl space-y-5">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest">
             <Sparkles className="w-3 h-3" /> Digital Store
           </div>
           <h1 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-[1.1]">
             Cửa hàng <span className="text-indigo-600 dark:text-indigo-400 italic">BMASS.</span>
           </h1>
           <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 leading-relaxed max-w-md">
             Sở hữu các công cụ AI cao cấp và kho tài liệu chuyên nghiệp. Mua nhanh chóng qua ví điện tử nội bộ.
           </p>

           <div className="pt-4 flex items-center gap-4">
             <div className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 flex items-center gap-4 border border-slate-100 dark:border-white/5 shadow-inner">
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                  <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Số dư ví của bạn</p>
                  <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{(userData?.balance || 0).toLocaleString()}đ</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/wallet'}
                  className="ml-2 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center text-slate-400 hover:text-indigo-600"
                  title="Nạp tiền"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
             </div>
           </div>
         </div>
         
         {/* Decorative Element */}
         <div className="hidden md:flex relative z-10 mr-8 lg:mr-16">
            <div className="w-48 h-48 bg-indigo-50 dark:bg-indigo-500/5 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-950 shadow-2xl relative">
              <ShoppingBag className="w-20 h-20 text-indigo-600 dark:text-indigo-400 translate-x-1" />
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Đã duyệt
              </div>
              <div className="absolute -bottom-2 -left-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 rounded-xl shadow-lg text-[9px] font-black uppercase tracking-widest">
                #Premium
              </div>
            </div>
         </div>
         
         {/* Background flares */}
         <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>`;

if (content.includes(oldHero)) {
  content = content.replace(oldHero, newHero);
} else {
  // Try CRLF
  content = content.replace(oldHero.replace(/\n/g, "\r\n"), newHero.replace(/\n/g, "\r\n"));
}

fs.writeFileSync("src/pages/StorePage.tsx", content, "utf8");
console.log("Replaced hero!");

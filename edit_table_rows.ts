import fs from "fs";

let content = fs.readFileSync("src/pages/WalletPage.tsx", "utf8");

const fromTable = `<table className="w-full text-left text-xs border-collapse">
                             <tbody>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px] w-28">ID đơn nạp</td>
                                 <td className="py-3 flex items-center justify-end gap-2 text-right">
                                   <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{activeInvoice.id}</span>
                                   <button onClick={() => copyToClipboard(activeInvoice.id)} type="button" className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Sao chép"><Copy size={16} /></button>
                                 </td>
                               </tr>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Chủ thụ hưởng</td>
                                 <td className="py-3 font-bold text-slate-800 dark:text-zinc-200 text-right">{bankingConfig.MB.ownerName}</td>
                               </tr>`;

let newRows = `<table className="w-full text-left text-xs border-collapse">
                             <tbody>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px] w-28">Chủ thụ hưởng</td>
                                 <td className="py-3 font-bold text-slate-800 dark:text-zinc-200 text-right">{bankingConfig.MB.ownerName}</td>
                               </tr>
                               <tr className="border-b border-slate-200/50 dark:border-white/10">
                                 <td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">#STT</td>
                                 <td className="py-3 flex items-center justify-end gap-2 text-right">
                                   <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{activeInvoice.id}</span>
                                   <button onClick={() => copyToClipboard(activeInvoice.id)} type="button" className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Sao chép"><Copy size={16} /></button>
                                 </td>
                               </tr>`;

if (content.includes(fromTable)) {
  content = content.replace(fromTable, newRows);
  fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
  console.log("Replaced successfully!");
} else {
  // Try CRLF
  if (content.includes(fromTable.replace(/\n/g, "\r\n"))) {
     content = content.replace(fromTable.replace(/\n/g, "\r\n"), newRows.replace(/\n/g, "\r\n"));
     fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
     console.log("Replaced successfully! (CRLF)");
  } else {
    // Regex
    content = content.replace(/<td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-\[10px\] w-28">ID đơn nạp<\/td>[\s\S]*?<td className="py-3 font-semibold text-slate-400 uppercase tracking-wider text-\[10px\]">Chủ thụ hưởng<\/td>[\s\S]*?<\/tr>/, newRows.replace('<table className="w-full text-left text-xs border-collapse">\n                             <tbody>\n                               ', ''));
    fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
    console.log("Replaced via regex!");
  }
}

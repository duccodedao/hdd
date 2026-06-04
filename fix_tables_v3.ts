import fs from "fs";

const filesToFix = [
  "admin/AdminForms.tsx",
  "admin/AdminIpBlocking.tsx",
  "admin/AdminApiKeys.tsx",
  "admin/AdminAiTools.tsx",
  "admin/AdminDocumentVault.tsx",
  "admin/AdminSecuritySessions.tsx",
  "admin/AdminDashboard.tsx",
  "admin/AdminUtilities.tsx",
  "admin/AdminDepositHistory.tsx",
  "admin/AdminUserPurchases.tsx",
  "admin/AdminPartners.tsx",
  "CalendarPage.tsx",
  "HrmPage.tsx",
  "utilities/DocumentVault.tsx",
  "utilities/PersonalFileManager.tsx",
];

const stickyClass = "sticky right-0 bg-white dark:bg-zinc-950 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5 z-10 box-border";
const thStickyClass = "sticky right-0 bg-slate-50 dark:bg-zinc-950/90 backdrop-blur shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 dark:border-white/10 z-20 box-border";

const processFile = (file: string) => {
   if (!fs.existsSync(file)) return;
   let content = fs.readFileSync(file, "utf8");
   let hasActionColumn = false;
   
   // 1. Replace <th>
   const thRegex = /<th([^>]*)>\s*(Thao tác|Quản trị)\s*<\/th>/g;
   content = content.replace(thRegex, (m, p1, label) => {
       hasActionColumn = true;
       if (p1.includes("sticky right-0")) return m;
       if (p1.includes('className="')) {
           return `<th${p1.replace('className="', `className="${thStickyClass} `)}>${label}</th>`;
       }
       return `<th className="${thStickyClass}"${p1}>${label}</th>`;
   });

   if (hasActionColumn) {
       // A safer AST: only process tables that have the Thao tác/Quản trị column.
       const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/g;
       content = content.replace(tableRegex, (tableStr) => {
           if (!tableStr.includes(thStickyClass) && !tableStr.includes("Thao tác") && !tableStr.includes("Quản trị")) {
               return tableStr;
           }
           
           // It's a table with an action column. Now find all <tr> inside <tbody>
           // Usually <tbody> starts, but we can just map all <tr> that don't have <th
           const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
           return tableStr.replace(trRegex, (trMatch) => {
               if (trMatch.includes("<th")) return trMatch;
               
               const tdCount = (trMatch.match(/<td/g) || []).length;
               if (tdCount === 0) return trMatch;
               
               const lastTdIndex = trMatch.lastIndexOf("<td");
               if (lastTdIndex === -1) return trMatch;
               
               const beforeLastTd = trMatch.substring(0, lastTdIndex);
               const afterLastTd = trMatch.substring(lastTdIndex);
               
               if (afterLastTd.includes("sticky right-0")) return trMatch;
               
               let newAfter = afterLastTd;
               const tdTagRegex = /<td([^>]*)>/;
               newAfter = newAfter.replace(tdTagRegex, (tdM, p1) => {
                   if (p1.includes('className="')) {
                       return `<td${p1.replace('className="', `className="${stickyClass} `)}>`;
                   }
                   return `<td className="${stickyClass}"${p1}>`;
               });
               
               if (!newAfter.includes("whitespace-nowrap")) {
                   newAfter = newAfter.replace('className="', 'className="whitespace-nowrap ');
               }
               
               // Cải thiện "cách hiển thị thao tác" (improve actions display) by ensuring flex items-center justify-end
               // We will look for <div className="..."> wrapping the buttons, but some don't have div wrappers.
               // It's safer to just let TailWind handle justify inside td if it exists, but typically td is flex or block.
               
               return beforeLastTd + newAfter;
           });
       });
   }

   // 3. Make Search Bars sticky globally
   // "cố định thanh tìm kiếm" -> find Search instances.
   // We look for div containing search input. Usually: `<div className="flex flex-col sm:flex-row ...">`
   // This often contains `<Search ... />`. 
   // However, not 100% of the time. 
   
   if (content !== fs.readFileSync(file, "utf8")) {
       fs.writeFileSync(file, content, "utf8");
       console.log("Fixed " + file);
   }
}

filesToFix.forEach(rel => {
   processFile(`src/pages/${rel}`);
});

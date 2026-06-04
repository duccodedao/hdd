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

const stickyClass = "sticky right-0 bg-white dark:bg-zinc-950 shadow-[-4px_0_15px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5 z-10 box-border";
const thStickyClass = "sticky right-0 bg-slate-50 dark:bg-zinc-950 shadow-[-4px_0_15px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100 dark:border-white/5 z-20 box-border";

const processFile = (file: string) => {
   if (!fs.existsSync(file)) return;
   let content = fs.readFileSync(file, "utf8");
   let modified = false;
   
   // 1. Replace <th>Thao tác</th>
   const thRegex = /<th([^>]*)>\s*Thao tác\s*<\/th>/g;
   content = content.replace(thRegex, (m, p1) => {
       modified = true;
       if (p1.includes("sticky right-0")) return m;
       if (p1.includes('className="')) {
           return `<th${p1.replace('className="', `className="${thStickyClass} `)}>Thao tác</th>`;
       }
       return `<th className="${thStickyClass}"${p1}>Thao tác</th>`;
   });

   // 2. We only want to target the EXACT `<td>` that contains the actions.
   // Notice that in <tbody>, the rows usually end with the actions <td>.
   // It's much safer to find the <tr> block, split by <td>, and modify the LAST <td> if we know Thao tác is the last column.
   // But not all tables have Thao tác. We only do this if `modified` is true.
   
   if (modified) {
       // A poor man's AST to safely parse <tr>...</tr> and inject our class to the last <td>
       // We can use a regex that matches `<tr` to `</tr>`
       const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
       content = content.replace(trRegex, (trMatch) => {
           // Skip if it's inside thead. (Usually thead tr contains <th>, we can skip if it has <th)
           if (trMatch.includes("<th")) return trMatch;
           
           // We need the last <td>
           const tdCount = (trMatch.match(/<td/g) || []).length;
           if (tdCount === 0) return trMatch;
           
           // Find the last <td...
           const lastTdIndex = trMatch.lastIndexOf("<td");
           if (lastTdIndex === -1) return trMatch;
           
           const beforeLastTd = trMatch.substring(0, lastTdIndex);
           const afterLastTd = trMatch.substring(lastTdIndex); // <td ...> ... </td></tr>
           
           if (afterLastTd.includes("sticky right-0")) return trMatch; // already modified
           
           // Let's also wrap the content of the `<td>` in a `flex flex-row justify-end items-center gap-2` if it's not already
           // Well, some actions have `flex items-center gap-2` etc., let's just inject the class to `<td>` first.
           let newAfter = afterLastTd;
           const tdTagRegex = /<td([^>]*)>/;
           newAfter = newAfter.replace(tdTagRegex, (tdM, p1) => {
               if (p1.includes('className="')) {
                   return `<td${p1.replace('className="', `className="${stickyClass} `)}>`;
               }
               return `<td className="${stickyClass}"${p1}>`;
           });
           
           // To improve "cách hiển thị các thao tác", we can ensure the container inside the td is flex row wrap or something, 
           // but `whitespace-nowrap` on the td is usually enough. Let's make sure `whitespace-nowrap` is there.
           if (!newAfter.includes("whitespace-nowrap")) {
               newAfter = newAfter.replace('className="', 'className="whitespace-nowrap ');
           }
           
           return beforeLastTd + newAfter;
       });
   }

   if (modified) {
       fs.writeFileSync(file, content, "utf8");
       console.log("Fixed " + file);
   }
}

filesToFix.forEach(rel => {
   processFile(`src/pages/${rel}`);
});

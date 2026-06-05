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

const stickyClass = "sticky right-0 bg-white dark:bg-zinc-900 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] !border-l-0 z-10 box-border";
const thStickyClass = "sticky right-0 bg-slate-50 dark:bg-zinc-950/80 backdrop-blur shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] !border-l-0 z-20 box-border";

const processFile = (file: string) => {
   if (!fs.existsSync(file)) return;
   let content = fs.readFileSync(file, "utf8");
   
   // Replace TH
   const thRegex = /<th([^>]*)>Thao tác<\/th>/g;
   let thMatch;
   let newContent = content;

   // We need to inject thStickyClass into the className
   newContent = newContent.replace(thRegex, (m, p1) => {
       if (m.includes("sticky right-0")) return m;
       if (p1.includes('className="')) {
           return m.replace('className="', 'className="' + thStickyClass + ' ');
       }
       return `<th className="${thStickyClass}"${p1}>Thao tác</th>`;
   });

   // For the TD, it's the last TD or a TD with text-right in the tables. 
   // Doing it with simple regex is risky. Let's do a more robust JS parsing or look for specific patterns.
   // Notice that actions usually contain `<div className="flex justify-end` or `<div className="flex items-center justify-end` or `flex gap-2 justify-end`.
   // A common pattern is `<td className="... text-right whitespace-nowrap">`
   const tdRegex = /<td([^>]*?text-right[^>]*?)>/g;
   newContent = newContent.replace(tdRegex, (m, p1) => {
       if (m.includes("sticky right-0")) return m;
       return m.replace('className="', 'className="' + stickyClass + ' ');
   });
   
   // Sometimes it doesn't have text-right but it's the actions TD. Let's check `px-6 py-4 whitespace-nowrap text-right`
   const tdRegex2 = /<td className="([^"]*?)">(\s*<div className="flex (?:items-center )?(?:justify-end )?gap-2(?: justify-end)?")/g;
   newContent = newContent.replace(tdRegex2, (m, p1, p2) => {
       if (p1.includes("sticky right-0")) return m;
       return `<td className="${p1} ${stickyClass}">${p2}`;
   });

    const tdRegex3 = /<td className="([^"]*?)">(\s*<div className="flex justify-end gap-2")/g;
    newContent = newContent.replace(tdRegex3, (m, p1, p2) => {
        if (p1.includes("sticky right-0")) return m;
        return `<td className="${p1} ${stickyClass}">${p2}`;
    });

    const tdRegex4 = /<td className="([^"]*?)">(\s*<div className="flex items-center gap-2")/g;
    newContent = newContent.replace(tdRegex4, (m, p1, p2) => {
        // if this is an action column, normally it's at the end. But some flex items-center gap-2 logic are for names/emails.
        // Let's only target if there's a button.
        if (p1.includes("sticky right-0")) return m;
        // Actually this is too generic.
        return m;
    });

   // Special for CalendarPage actions
   const tdCalendarRegex = /<td className="py-3 px-4 text-right whitespace-nowrap(.*?)"/g;
   newContent = newContent.replace(tdCalendarRegex, (m, p1) => {
       if (m.includes("sticky right-0")) return m;
       return `<td className="py-3 px-4 text-right whitespace-nowrap ${stickyClass}${p1}"`;
   });

   if (newContent !== content) {
       fs.writeFileSync(file, newContent, "utf8");
       console.log("Fixed " + file);
   }
}

filesToFix.forEach(rel => {
   processFile(`src/pages/${rel}`);
});
console.log("Done styles pass 1");


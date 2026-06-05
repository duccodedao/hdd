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

const stickyClass = "sticky right-0 bg-white dark:bg-zinc-900 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] !border-l-0 z-10 box-border ";
const thStickyClass = "sticky right-0 bg-slate-50 dark:bg-zinc-950/80 backdrop-blur shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] !border-l-0 z-20 box-border ";

const processFile = (file: string) => {
   if (!fs.existsSync(file)) return;
   let content = fs.readFileSync(file, "utf8");
   
   // Remove thStickyClass
   content = content.replaceAll(thStickyClass, "");
   // Remove stickyClass
   content = content.replaceAll(stickyClass, "");

   fs.writeFileSync(file, content, "utf8");
}

filesToFix.forEach(rel => {
   processFile(`src/pages/${rel}`);
});
console.log("Restored successfully!");

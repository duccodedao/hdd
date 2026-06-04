import fs from "fs";

let content = fs.readFileSync("src/pages/WalletPage.tsx", "utf8");

if (!content.includes("maintenanceTabs")) {
  content = content.replace(
    "const { user } = useAuthStore();",
    "const { user } = useAuthStore();\n  const { maintenanceTabs } = useAppStore();"
  );
}
if (!content.includes("import { useAppStore } from")) {
  content = content.replace(
    "import { useAuthStore }",
    "import { useAppStore } from '../store/appStore';\nimport { useAuthStore }"
  );
}

const maintenanceCheck = `  // feature maintenance check
  if (maintenanceTabs?.wallet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 h-[calc(100vh-80px)]">
         <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-white/10">
           <AlertCircle className="w-8 h-8 opacity-50" />
         </div>
         <h2 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-2">Đang bảo trì</h2>
         <p className="max-w-md mx-auto text-xs text-slate-500 dark:text-zinc-500 font-medium leading-relaxed">Ví điện tử hiện đang được hệ thống nâng cấp. Vui lòng quay lại sau ít phút hoặc theo dõi bảng tin kỹ thuật.</p>
      </div>
    );
  }
`;

if (!content.includes("if (maintenanceTabs?.wallet)")) {
  if (content.includes("return (")) {
     content = content.replace(
       "  return (\n    <div className=\"max-w-5xl mx-auto px-4 py-4 h-[calc(100vh-80px)] flex flex-col flex-1\">",
       maintenanceCheck + "\n  return (\n    <div className=\"max-w-5xl mx-auto px-4 py-4 h-[calc(100vh-80px)] flex flex-col flex-1\">"
     );
  }
}

content = content.replace(
  "import { \n  Wallet, ", 
  "import { \n  Wallet, \n  AlertCircle, "
);
content = content.replace(
  "import {\n  Wallet,",
  "import {\n  Wallet,\n  AlertCircle,"
);
// just in case
if (!content.includes("AlertCircle")) {
   content = content.replace("import ", "import { AlertCircle } from 'lucide-react';\nimport ");
}

fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
console.log("Wallet maintenance added!");

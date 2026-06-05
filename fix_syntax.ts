import fs from "fs";

let content = fs.readFileSync("src/pages/WalletPage.tsx", "utf8");

content = content.replace("import { AlertCircle } from 'lucide-react';\nimport {\n  Wallet,\n  AlertCircle,", "import {\n  Wallet,\n  AlertCircle,");
content = content.replace("import {\n  Wallet,\n  AlertCircle,\n  AlertCircle,", "import {\n  Wallet,\n  AlertCircle,");

// Add Search if not present in the lucide-react import
if (!content.includes("Search,")) {
  content = content.replace(
    "import {\n  Wallet,",
    "import {\n  Wallet,\n  Search,"
  );
}

fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
console.log("Fixed syntax");

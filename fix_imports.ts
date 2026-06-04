import fs from "fs";

let content = fs.readFileSync("src/pages/WalletPage.tsx", "utf8");

content = content.replace(
  "CreditCard, AlertCircle, CheckCircle2, Copy, Gift, ArrowDownLeft",
  "CreditCard, CheckCircle2, Copy, Gift, ArrowDownLeft, Search"
);

fs.writeFileSync("src/pages/WalletPage.tsx", content, "utf8");
console.log("Fixed syntax");

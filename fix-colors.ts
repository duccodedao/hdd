import fs from 'fs';
import path from 'path';

const files = [
  'src/pages/TermsPage.tsx',
  'src/pages/PrivacyPage.tsx',
  'src/pages/ContactPage.tsx',
  'src/pages/AuthActionPage.tsx',
  'src/pages/FindMyDeviceUtility.tsx'
];

files.forEach(file => {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/text-white/g, 'text-slate-900');
  content = content.replace(/hover:text-white/g, 'hover:text-slate-900');
  content = content.replace(/bg-white\/5/g, 'bg-white');
  content = content.replace(/border-white\/5/g, 'border-slate-200');
  content = content.replace(/dark:text-white/g, '');
  content = content.replace(/dark:bg-slate-900/g, '');
  content = content.replace(/dark:border-white\/10/g, '');
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fixed colors');

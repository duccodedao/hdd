const fs = require('fs');
const path = require('path');

function walk(dir, call) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, call);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
      call(fullPath);
    }
  }
}

walk(path.join(__dirname, 'src'), (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/bg-slate-50 dark:bg-slate-950/g, 'bg-[#050508]');
  content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white/5');
  content = content.replace(/bg-slate-100 dark:bg-slate-800/g, 'bg-white/5');
  content = content.replace(/bg-slate-50 dark:bg-slate-900\/50/g, 'bg-white/5');
  
  content = content.replace(/border-slate-200 dark:border-white\/10/g, 'border-white/10');
  content = content.replace(/border-slate-200 dark:border-slate-800/g, 'border-white/10');
  
  content = content.replace(/text-slate-900 dark:text-white/g, 'text-white');
  content = content.replace(/text-slate-600 dark:text-slate-400/g, 'text-slate-400');
  content = content.replace(/text-slate-600 dark:text-slate-300/g, 'text-slate-300');
  content = content.replace(/text-slate-500 hover:text-slate-700 dark:hover:text-slate-300/g, 'text-slate-400 hover:text-white');
  
  content = content.replace(/bg-primary-50 dark:bg-primary-900\/20/g, 'bg-blue-500/20');
  content = content.replace(/bg-primary-100 dark:bg-primary-900\/30/g, 'bg-blue-500/20');
  content = content.replace(/text-primary-600 dark:text-primary-400/g, 'text-blue-400');
  content = content.replace(/text-primary-700 dark:text-primary-300/g, 'text-blue-300');
  content = content.replace(/text-primary-600/g, 'text-blue-500');
  
  content = content.replace(/hover:bg-slate-50 dark:hover:bg-white\/5/g, 'hover:bg-white/10');
  content = content.replace(/hover:bg-slate-100 dark:hover:bg-slate-800/g, 'hover:bg-white/10');

  // Some leftovers
  content = content.replace(/bg-slate-50\/50 dark:bg-slate-900\/50/g, 'bg-white/5');
  content = content.replace(/bg-slate-50 dark:bg-slate-900\/80/g, 'bg-white/5');
  content = content.replace(/divide-slate-200 dark:divide-white\/5/g, 'divide-white/10');
  content = content.replace(/bg-primary-50 dark:bg-primary-900\/40/g, 'bg-blue-500/20');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});

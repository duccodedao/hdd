import fs from 'fs';

const files = [
  'src/pages/ProductsPage.tsx',
  'src/pages/BanksPage.tsx',
  'src/pages/ExchangesPage.tsx',
  'src/pages/AirdropPage.tsx',
  'src/pages/MoviesPage.tsx',
  'src/pages/UtilitiesPage.tsx',
  'src/pages/MovieDetailPage.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/text-white/g, 'text-slate-900');
    content = content.replace(/text-slate-400/g, 'text-slate-500');
    content = content.replace(/text-slate-700 group-hover:text-[a-z]+-400/g, 'text-slate-400 group-hover:text-indigo-600');
    content = content.replace(/group-hover:text-[a-z]+-400/g, 'group-hover:text-indigo-600');
    content = content.replace(/hover:bg-white\/\[0\.05\]/g, 'hover:bg-slate-50');
    content = content.replace(/bg-white\/5/g, 'bg-slate-100');
    content = content.replace(/border-white\/5/g, 'border-slate-100');
    content = content.replace(/border-white\/10/g, 'border-slate-200');
    content = content.replace(/bg-slate-900\/50/g, 'bg-white');
    content = content.replace(/bg-slate-900/g, 'bg-slate-100');
    content = content.replace(/text-slate-300/g, 'text-slate-600');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});

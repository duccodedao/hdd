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
    content = content.replace(/text-indigo-400/g, 'text-indigo-600');
    content = content.replace(/bg-indigo-400/g, 'bg-indigo-600');
    content = content.replace(/bg-white text-black/g, 'bg-indigo-600 text-white');
    content = content.replace(/hover:bg-slate-200/g, 'hover:bg-indigo-700');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});

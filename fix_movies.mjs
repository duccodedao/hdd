import fs from 'fs';

const files = [
  'src/pages/MoviesPage.tsx',
  'src/pages/MovieDetailPage.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/https:\/\/phimapi\.com/g, 'https://ophim1.com');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});

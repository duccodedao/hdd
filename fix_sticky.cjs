const fs = require('fs');
const { execSync } = require('child_process');

try {
  const fileLines = execSync('grep -rl "sticky right-0" src/', { encoding: 'utf8' }).trim().split('\n');
  fileLines.forEach(file => {
    if (!file) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/sticky right-0 bg-slate-50 dark:bg-zinc-950\/90 backdrop-blur shadow-\[-10px_0_15px_-5px_rgba\(0,0,0,0\.05\)\] border-l border-slate-200 dark:border-white\/10 z-20 box-border /g, '');
    content = content.replace(/sticky right-0 bg-white dark:bg-zinc-950 shadow-\[-10px_0_15px_-5px_rgba\(0,0,0,0\.05\)\] border-l border-slate-100 dark:border-white\/5 z-10 box-border /g, '');
    content = content.replace(/sticky right-0 /g, '');
    fs.writeFileSync(file, content);
  });
  console.log('Fixed sticky right-0');
} catch (e) {
  console.error(e);
}

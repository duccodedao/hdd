const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  });
  return results;
};

const files = walk('./src/pages').concat(walk('./src/components'));

// Pages and components that are strictly dark mode only and shouldn't be changed:
const excludeFiles = [
  'LandingPage.tsx',
  'Auth.tsx',
  'Onboarding.tsx',
  'MaintenancePage.tsx',
  'NotFoundPage.tsx',
  'ContactPage.tsx', // Actually wait, contact page maybe same
];

files.forEach((file) => {
  if (excludeFiles.some(ex => file.includes(ex))) return;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace text-white with dark:text-white and add a light mode equivalent if missing
  // Careful: sometimes it's text-white inside an already dark restricted block or inside active tags.
  // Actually, we can just replace text-white with text-slate-900 dark:text-white where missing text-slate-XYZ.
  // But doing it blindly is risky.
  
  // Let's specifically target hover:text-white -> hover:text-slate-900 dark:hover:text-white
  content = content.replace(/hover:text-white/g, 'hover:text-slate-900 dark:hover:text-white');
  
  // Let's replace text-white not preceded by dark: or group-hover: etc.
  // Also avoid bg-blue-600 text-white (where text-white is correct for the button)
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

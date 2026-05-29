const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // regex to match console.error("...", err) and replace it
      // this matches console.error( string_or_identifier , identifier_containing_err_or_error )
      content = content.replace(/console\.error\(([^,]+),\s*(err|error|e|dbErr|errMessage)\)/g, 'console.error($1, $2?.message || String($2))');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
console.log('Patching complete');

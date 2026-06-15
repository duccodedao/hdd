const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
  /function isAdmin\(\) \{\n\s*return isSuperAdmin\(\) \|\| \(isSignedIn\(\) && exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\) && get\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.get\('role',\s*'user'\) in \['admin', 'superadmin'\]\);\n\s*\}/g,
  `function isWriteAdmin() {
      return isSuperAdmin() || (isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', 'user') in ['admin', 'superadmin']);
    }
    function isAdmin() {
      return isWriteAdmin() || (isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', 'user') == 'review');
    }`
);

const lines = rules.split('\n');
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('function isAdmin') || lines[i].includes('function isWriteAdmin')) {
       continue;
   }
   if (lines[i].includes('allow write') || lines[i].includes('allow create') || lines[i].includes('allow update') || lines[i].includes('allow delete')) {
       if (!lines[i].includes('allow read') && !lines[i].includes('allow get') && !lines[i].includes('allow list')) {
           lines[i] = lines[i].replace(/isAdmin\(\)/g, 'isWriteAdmin()');
       }
   }
}

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('allow read, write: if isAdmin();')) {
        lines[i] = '      allow read: if isAdmin();\n      allow write: if isWriteAdmin();';
    }
    if (lines[i].includes('allow read, update, delete: if isAdmin();')) {
        lines[i] = '      allow read: if isAdmin();\n      allow update, delete: if isWriteAdmin();';
    }
}

fs.writeFileSync('firestore.rules', lines.join('\n'));

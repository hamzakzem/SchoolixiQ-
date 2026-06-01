import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(/function false \{/g, "function isParentOfClass(schoolId, classId) {");

fs.writeFileSync('firestore.rules', content);
console.log('Fixed function name');

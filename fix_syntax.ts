import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');
content = content.replace(/false\)\);/g, "false);");
content = content.replace(/== schoolId\)/g, "== schoolId"); // check if there are any other mismatch
fs.writeFileSync('firestore.rules', content);
console.log('Fixed syntax error in firestore.rules');

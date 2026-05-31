import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(/false\.get\('[^']+',\s*\[\]\)\)/g, "false");
content = content.replace(/false\) \)/g, "false)");
content = content.replace(/\n\s*false\)\n/g, "\n        false\n"); 
content = content.replace(/\]\)\) \|\|/g, "]) ||");
// just fixing line 193:
content = content.replace(/false\.get\('studentIds', \[\]\)\) \|\|/g, "false ||");
content = content.replace(/false\)/g, "false"); 

fs.writeFileSync('firestore.rules', content);
console.log('Fixed syntax again');

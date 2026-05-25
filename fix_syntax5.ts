import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

let lines = content.split('\n');
lines[306] = "        false"; // 307th line

fs.writeFileSync('firestore.rules', lines.join('\n'));
console.log('Fixed syntax again');

import * as fs from 'fs';
const content = fs.readFileSync('firestore.rules', 'utf8');

const regex = /false\.get/g;
let c = content.replace(/false\.get\('[^']+',\s*''\)/g, 'false');

c = c.replace(/isParentOfClass\([^)]+\)/g, 'false');
// Also remove isParentOf from allow list blocks!
let lines = c.split('\n');
let inList = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('allow list:')) inList = true;
  if (inList) {
    lines[i] = lines[i].replace(/isParentOf\([^)]+\)/g, 'false');
  }
  if (inList && lines[i].includes(';')) inList = false;
}

fs.writeFileSync('firestore.rules', lines.join('\n'));
console.log('Fixed false.get and isParentOf in lists');

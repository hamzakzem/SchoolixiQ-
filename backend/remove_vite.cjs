const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');
const lines = content.split('\n');
const startLine = lines.findIndex(l => l.includes('// Vite transformation'));
const endLine = lines.findIndex((l, i) => i > startLine + 5 && l.trim() === '}');
lines.splice(startLine, endLine - startLine + 1);
fs.writeFileSync('backend/server.ts', lines.join('\n'));
console.log('Done! Removed lines', startLine, 'to', endLine);
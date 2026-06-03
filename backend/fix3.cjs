const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');
const lines = content.split('\n');

// Find and remove orphaned Vite lines
const filtered = lines.filter((line, i) => {
  if (line.includes("app.get('*'") && line.includes('sendFile')) return false;
  if (line.includes('distPath') && line.includes('index.html')) return false;
  if (line.trim() === '}' && lines[i-1] && lines[i-1].includes('sendFile')) return false;
  if (line.includes('});') && lines[i-1] && lines[i-1].includes('index.html')) return false;
  return true;
});

fs.writeFileSync('backend/server.ts', filtered.join('\n'));
console.log('Done!');
const fs = require('fs');
let lines = fs.readFileSync('backend/server.ts', 'utf8').split('\n');

// Remove lines 1093-1100 (0-indexed: 1092-1099)
lines.splice(1092, 8);

fs.writeFileSync('backend/server.ts', lines.join('\n'));
console.log('Done! Total lines:', lines.length);
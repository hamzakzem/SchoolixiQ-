const fs = require('fs');
let lines = fs.readFileSync('backend/server.ts', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('app.listen(PORT'));
lines.splice(idx, 0, '  });', '');
fs.writeFileSync('backend/server.ts', lines.join('\n'));
console.log('Done! Added }); before line', idx);
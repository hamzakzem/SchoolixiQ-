const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
const old = 'startServer();';
const newCode = '  app.listen(PORT, () => {\n    console.log("Server running on port " + PORT);\n  });\n}\n\nstartServer();';
content = content.replace(old, newCode);
fs.writeFileSync('server.ts', content);
console.log('Done!');
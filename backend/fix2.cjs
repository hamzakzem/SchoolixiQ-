const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
c = c.trimEnd() + '\n  app.listen(PORT, () => {\n    console.log("Server running on port " + PORT);\n  });\n}\n\nstartServer();\n';
c = c.replace(/\nstartServer\(\);\s*$/, '');
c = c.replace('}\n\nstartServer', '  app.listen(PORT, () => {\n    console.log("Server running on port " + PORT);\n  });\n}\n\nstartServer');
fs.writeFileSync('server.ts', c);
console.log('Done!');
const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
const listen = \n  app.listen(PORT, () => {\n    console.log('Server running on port ' + PORT);\n  });\n}\n\nstartServer();;
content = content.replace('startServer();', listen);
fs.writeFileSync('server.ts', content);
console.log('Done!');
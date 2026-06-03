const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf8');
content = content.replace(
  "    });\n  app.listen",
  "    });\n  });\n\n  app.listen"
);
fs.writeFileSync('backend/server.ts', content);
console.log('Done!');
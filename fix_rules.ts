import * as fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(/request\.auth\.token\.get\('email',\s*''\)/g, "getUserEmail()");
content = content.replace(/request\.auth\.token\.get\('schoolId',\s*''\)/g, "getTokenSchoolId()");

fs.writeFileSync('firestore.rules', content);
console.log('Fixed firestore.rules');

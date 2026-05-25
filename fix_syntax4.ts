import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(/get\(permission, false == true/g, "get(permission, false) == true");
content = content.replace(/== getSchoolId\(\) \|\| false;/g, "== getSchoolId() || false);");
content = content.replace(/isTokenStaff\(resource\.data\.schoolId\) \|\| false;/g, "isTokenStaff(resource.data.schoolId) || false);");

fs.writeFileSync('firestore.rules', content);
console.log('Fixed syntax again');

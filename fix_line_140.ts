import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

// I removed the ")" from line 140 earlier when doing a replace. 
// "getUserData().get('schoolId', '') == schoolId)" became "getUserData().get('schoolId', '') == schoolId"
content = content.replace(/\(getUserData\(\) != null && getUserData\(\)\.get\('schoolId', ''\) == schoolId\n/g, "(getUserData() != null && getUserData().get('schoolId', '') == schoolId)\n");

fs.writeFileSync('firestore.rules', content);
console.log('Fixed line 140');

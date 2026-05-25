import * as fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

let lines = content.split('\n');
let inListBlock = false;
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('allow list: if')) {
        inListBlock = true;
    }
    
    if (inListBlock) {
        line = line.replace(/isStaffWithPerm\(([^,]+),\s*'[^']+'\)/g, "isTokenStaff($1)");
        line = line.replace(/isAdminWithPerm\(([^,]+),\s*'[^']+'\)/g, "isTokenStaff($1)");
        line = line.replace(/\(getUserData\(\)\s*!=\s*null[^)]*\)/g, "false");
        line = line.replace(/getUserData\(\)\s*!=\s*null\s*&&\s*resource\.data\.schoolId\s*==\s*getUserData\(\)\.get\('schoolId', ''\)/g, "false");
        lines[i] = line;
    }
    
    if (inListBlock && line.includes(';')) {
        inListBlock = false;
    }
}

fs.writeFileSync('firestore.rules', lines.join('\n'));
console.log('Fixed firestore.rules 2');

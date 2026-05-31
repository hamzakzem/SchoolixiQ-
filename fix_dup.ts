import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(/\n\s*\/\/ Helper for non-blocking staff check \(safe for list rules\)\n\s*function isSchoolStaff\(schoolId\) \{\n\s*return isSignedIn\(\) && \(\n\s*\(getTokenSchoolId\(\) == schoolId && getTokenRole\(\) in \['admin', 'assistant', 'teacher', 'staff', 'superadmin'\]\) \|\|\n\s*isMasterAdmin\(\)\n\s*\);\n\s*\}\n/, '');

content = content.replace(/\n\s*function isSchoolStaffWithPerm\(schoolId, perm\) \{\n\s*return isSchoolStaff\(schoolId\) && hasPackagePermission\(schoolId, perm\);\n\s*\}\n/, '');

fs.writeFileSync('firestore.rules', content);
console.log('Fixed duplicate function');

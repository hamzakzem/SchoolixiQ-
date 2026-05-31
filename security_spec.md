# Security Specification - Scoopy (سكوبي)

## 1. Data Invariants
- A student must belong to a school and have at least one parent ID (unless pending registration).
- Grades and Attendance must reference a valid student ID and school ID.
- Users must have a role assigned.
- School-specific data (Grades, Attendance, Behavior, Payroll, Inventory, Announcements) MUST be isolated by `schoolId`.
- Parents can ONLY access data for students where their UID is in the `parentIds` array.

## 2. The "Dirty Dozen" Payloads (Red Team Tests)

### T1: Elevation Attempt (Parent to School Admin)
Payload: `update /users/PARENT_UID { role: 'admin' }`
- Expected: PERMISSION_DENIED (User cannot change their own role).

### T2: Cross-Tenant Data Access
Payload: `get /grades/SCHOOL_A_GRADE` by `USER_IN_SCHOOL_B`
- Expected: PERMISSION_DENIED (schoolId mismatch).

### T3: Parent Access to Other Child
Payload: `get /students/OTHER_CHILD` by `PARENT_X` (not in parentIds)
- Expected: PERMISSION_DENIED.

### T4: Write Grade by Student/Parent
Payload: `create /grades/NEW_GRADE { studentId: 'ME', score: 100, schoolId: 'MY_SCHOOL' }` by `PARENT_ROLE`
- Expected: PERMISSION_DENIED (Only admin/teacher can write grades).

### T5: Modify Payroll by Employee
Payload: `update /payroll/MY_PAYROLL { amount: 10000 }` by `STAFF_ROLE`
- Expected: PERMISSION_DENIED (Only admin can write payroll).

### T6: Shadow Field Injection
Payload: `create /users/NEW_USER { name: 'X', role: 'teacher', isVerified: true, schoolId: 'Y' }`
- Expected: PERMISSION_DENIED (Strict schema validation for user creation).

### T7: ID Poisoning
Payload: `create /schools/very-long-id-that-is-over-128-chars... { ... }`
- Expected: PERMISSION_DENIED (isValidId check).

### T8: Orphaned Grade
Payload: `create /grades/G1 { studentId: 'NON_EXISTENT', schoolId: 'S1', ... }`
- Expected: PERMISSION_DENIED (exists() check for student).

### T9: Terminal State Bypass
Payload: `update /orders/O1 { total: 0 }` where status is 'paid'
- Expected: PERMISSION_DENIED (Terminal state lock).

### T10: Anonymous Access
Payload: `get /schools/S1` by `null` (unauthenticated)
- Expected: PERMISSION_DENIED.

### T11: Unverified Email Access
Payload: `create /students/S2` by `admin` with `email_verified: false`
- Expected: PERMISSION_DENIED (isVerified mandate).

### T12: Marketplace Price Manipulation
Payload: `update /market/ITEM1 { price: 0.1 }` by `Parent`
- Expected: PERMISSION_DENIED.

## 3. Test Runner (Draft)
A comprehensive `firestore.rules.test.ts` will be created to verify these invariants.

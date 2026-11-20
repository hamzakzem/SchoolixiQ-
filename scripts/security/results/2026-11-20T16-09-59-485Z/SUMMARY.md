# Security regression run 2026-11-20T16-09-59-485Z

Project: `demo-schoolixiq-security` (emulator only). Files: 8.

| Total | Passed | Failed (proven weakness / broken control) | Not testable | Skipped |
|---|---|---|---|---|
| 128 | 63 | 63 (63 / 0) | 2 | 0 |

## Results

| Status | Test |
|---|---|
| passed | [A1.1] new user cannot self-create role=superadmin while users/metadata exists |
| FAILED — weakness proven | [A1.2][H4] new user cannot self-create role=superadmin even when users/metadata is missing |
| passed | [A9.1] users/metadata blocks the legacy bootstrap path by existence alone (initialized=false still blocks) |
| FAILED — weakness proven | [A2.1][C1] new user cannot self-create role=admin for an existing school it does not own |
| FAILED — weakness proven | [A2.2][C1][D2] self-create role=admin for the school whose adminEmail matches is denied when the e-mail is NOT verified |
| FAILED — weakness proven | [A2.3][C1] new user cannot self-create role=teacher inside a school |
| FAILED — weakness proven | [A2.3][C1] new user cannot self-create role=staff inside a school |
| FAILED — weakness proven | [A2.3][C1] new user cannot self-create role=guard inside a school |
| FAILED — weakness proven | [A2.3][C1] new user cannot self-create role=assistant inside a school |
| passed | [A2.3][C1] new user cannot self-create role=school_assistant inside a school |
| passed | [A2.C1] CONTROL: new user can self-create a plain parent profile with no school |
| passed | [A2.C2] CONTROL: new school admin can self-create an admin draft without a school |
| passed | [A3.1] parent cannot change its own role to superadmin |
| passed | [A3.2] teacher cannot change its own role to superadmin |
| passed | [A4.1] linked parent cannot move its own profile to another school |
| FAILED — weakness proven | [A4.2][C4] parent without a school cannot attach its profile to an arbitrary school |
| FAILED — weakness proven | [A4.3][H1] school admin cannot move its own profile to another school |
| passed | [A5.1] parent cannot grant itself permissions |
| FAILED — weakness proven | [A5.2][C1] new user cannot self-create a profile that already carries permissions |
| FAILED — weakness proven | [A5.3][C2] school assistant cannot grant itself permissions |
| passed | [A5.4] staff member cannot grant itself extra permissions |
| FAILED — weakness proven | [A6.1][C2] school assistant cannot promote itself to school admin |
| FAILED — weakness proven | [A6.2][C2] school assistant cannot promote itself to superadmin |
| FAILED — weakness proven | [A6.3][H2] new user cannot self-create a legacy "assistant" with no school (treated as platform assistant) |
| FAILED — weakness proven | [A7.1][C2] school admin cannot promote itself to superadmin |
| FAILED — weakness proven | [A7.2][C2] school admin cannot promote a teacher of its school to superadmin |
| FAILED — weakness proven | [A7.3][C2] school admin cannot promote a teacher of its school to platform_assistant |
| FAILED — weakness proven | [A7.4][C7] school admin cannot pre-provision a users document with role=superadmin |
| FAILED — weakness proven | [A7.5][C1+C2] end-to-end: anonymous sign-up cannot reach super-admin-only data |
| passed | [A7.C1] CONTROL: school admin can change a teacher of its school to staff |
| passed | [A7.C2] CONTROL: school admin can pre-provision a teacher document for its school |
| passed | [A8.1] parent1 cannot delete users/metadata |
| passed | [A8.2] parent1 cannot overwrite users/metadata |
| passed | [A8.1] teacher1 cannot delete users/metadata |
| passed | [A8.2] teacher1 cannot overwrite users/metadata |
| passed | [A8.1] admin1 cannot delete users/metadata |
| passed | [A8.2] admin1 cannot overwrite users/metadata |
| passed | [A8.1] sassist1 cannot delete users/metadata |
| passed | [A8.2] sassist1 cannot overwrite users/metadata |
| FAILED — weakness proven | [A8.3][H4] a self-escalated account cannot delete users/metadata (re-opening the bootstrap path) |
| FAILED — weakness proven | [A8.4][H4] hardening: even a genuine superadmin cannot delete users/metadata |
| passed | [B1.1] a user cannot create a users document under a UID that is not its own |
| FAILED — weakness proven | [B1.2] a user cannot create a users document that claims another UID inside its own path |
| passed | [B2.1] parent cannot edit another parent profile |
| passed | [B2.2] parent cannot delete another parent profile |
| passed | [B2.3] school admin cannot edit the admin of another school |
| FAILED — weakness proven | [B2.4] school admin cannot delete a co-admin of its own school |
| FAILED — weakness proven | [B3.1][C3] a stored (self-written) e-mail must not allow deleting the super admin profile |
| FAILED — weakness proven | [B3.2][C3] a stored (self-written) e-mail must not allow reading the super admin profile |
| FAILED — weakness proven | [B3.3][C3] a stored (self-written) e-mail must not expose another person registration request |
| FAILED — weakness proven | [B3.4][C3] a stored (self-written) e-mail must not allow editing another person pending registration |
| FAILED — weakness proven | [B3.5][C3][D2] an UNVERIFIED token e-mail must not allow claiming (deleting) a pre-provisioned profile |
| FAILED — weakness proven | [B3.6][C1][D2] an UNVERIFIED token e-mail must not allow copying a pre-provisioned teacher role |
| passed | [B3.C1] CONTROL: the verified owner of a pre-provisioned e-mail can claim (delete) the provisioned document |
| passed | [B4.1] e-mail comparison: an upper-case variant of the super admin e-mail grants nothing |
| passed | [B4.2] e-mail comparison: a whitespace-padded variant of the super admin e-mail grants nothing |
| FAILED — weakness proven | [B4.3][FUNCTIONAL] school with a mixed-case adminEmail is still readable by its verified admin (rules lower-case only the token side) |
| FAILED — weakness proven | [C1.1][C4] unlinked parent cannot add itself to a student of another school |
| FAILED — weakness proven | [C1.2][C4] unlinked parent cannot add itself to a student whose parentEmail is someone else |
| FAILED — weakness proven | [C1.3][C4] parent of one child cannot add itself to another child of the same school |
| FAILED — weakness proven | [C2.1][C4][D1] matching verified e-mail is NOT enough: self-link without school approval is denied |
| FAILED — weakness proven | [C2.2][C4][D1] parent cannot attach studentIds + schoolId to its own profile without approval |
| FAILED — weakness proven | [C3.1][C4][D2] parent with an UNVERIFIED e-mail equal to parentEmail cannot self-link |
| FAILED — weakness proven | [C4.1][C3][C4] stored profile e-mail different from the authenticated e-mail cannot be used to link |
| passed | [C5.1] repeating an existing link does not create duplicate entries |
| FAILED — weakness proven | [C5.2][C4] parent cannot write a parentIds array containing duplicate / padded entries |
| not-testable | [C5.3][D1] duplicate approval request for the same parent/student is rejected — NOT TESTABLE: approval-request workflow not implemented yet |
| FAILED — weakness proven | [C6.1][C4] two concurrent unapproved self-links to the same student are both denied and existing links survive |
| FAILED — weakness proven | [C6.2][C4] concurrent full-array overwrites cannot evict the genuine parent |
| not-testable | [C6.3][D1] two concurrent approval requests for the same student are serialised — NOT TESTABLE: approval-request workflow not implemented yet |
| passed | [C7.1] a denied link attempt that also tampers with schoolId leaves the student untouched |
| FAILED — weakness proven | [C7.2][C4] a linked parent cannot remove a co-parent from the student |
| FAILED — weakness proven | [C8.1][C4] end-to-end: a stranger cannot obtain a child record + grades of another school |
| passed | [C.C1] CONTROL: school admin can link a parent to a student of its own school |
| passed | [C.C2] CONTROL: a linked parent can read its own child and grades |
| passed | [C.C3] CONTROL: admin of another school cannot link parents to S1 students |
| passed | [C.C4] CONTROL: parent cannot overwrite the whole student document |
| passed | [D1.1] admin of S1 cannot read school doc of S2 |
| passed | [D1.1] admin of S1 cannot read school settings of S2 |
| passed | [D1.1] admin of S1 cannot read student of S2 |
| passed | [D1.1] admin of S1 cannot read grade of S2 |
| passed | [D1.1] admin of S1 cannot read parent profile of S2 |
| passed | [D1.2] admin of S1 cannot list students of S2 |
| passed | [D2.1] teacher cannot read a student of an unassigned class in its own school |
| passed | [D2.2] teacher cannot read a student of another school |
| passed | [D2.3] teacher cannot read a class of another school |
| passed | [D2.C] CONTROL: teacher can read a student of its assigned class |
| passed | [D3.1] school assistant of S1 cannot read student / school of S2 |
| FAILED — weakness proven | [D3.2][H2] a legacy "assistant" profile without a school is not a platform assistant (cannot read other schools) |
| FAILED — weakness proven | [D3.3][H2][H7] a legacy schoolless "assistant" with self-written permissions cannot read registration requests |
| passed | [D4.1] parent cannot read an unlinked student of its own school |
| passed | [D4.2] parent cannot read a student / grade of another school |
| FAILED — weakness proven | [D4.3][H3] parent cannot look up a student of another school by guessing its registration number |
| passed | [D5.1] admin of S1 cannot create an attendance record for S2 |
| passed | [D5.2] admin of S1 cannot pull a student of S2 into S1 by rewriting schoolId |
| passed | [D5.3] admin of S1 cannot create a student inside S2 |
| FAILED — weakness proven | [D5.4][C1] a self-written schoolId on a self-created profile grants no access to that school |
| FAILED — weakness proven | [F1.1][H7] an anonymous registration request carrying customerInfo.password is rejected |
| FAILED — weakness proven | [F1.2][H7] a signed-in registration request carrying password / adminPassword is rejected |
| passed | [F1.3][H7] a school admin cannot store a parent password on a student document |
| FAILED — weakness proven | [F1.4][H7] a user cannot store a password field on its own profile |
| passed | [F1.C] CONTROL: a registration request without any password field is accepted |
| FAILED — weakness proven | [E1.1][C5] a Firestore-only role=superadmin (no claim) is rejected by the admin API |
| FAILED — weakness proven | [E1.2][C5] calling the admin API must not write role=superadmin into custom claims from Firestore data |
| FAILED — weakness proven | [E1.3][C5] a stale superadmin claim is rejected once the Firestore profile is demoted |
| passed | [E1.4][H2] a legacy schoolless "assistant" profile is not accepted as a platform assistant |
| FAILED — weakness proven | [E2.1][C6] create-user ignores additionalData.role / schoolId (no superadmin via payload) |
| FAILED — weakness proven | [E2.2][C6] create-user ignores client-supplied additionalData.permissions in custom claims |
| FAILED — weakness proven | [E2.3][C6] staff (allowed to create parents) cannot mint a superadmin profile through additionalData |
| passed | [E2.4] CONTROL: school admin cannot create users for another school via the schoolId field |
| passed | [E2.5] CONTROL: school admin can create a parent in its own school |
| passed | [E3.1] a registration request carrying role=superadmin grants nothing |
| FAILED — weakness proven | [E4.1][M1] school admin cannot reset the password of a co-admin via create-user |
| FAILED — weakness proven | [E4.2][M3] super admin "sync-claims" must not promote a tampered Firestore role into claims |
| passed | [E4.3] CONTROL: school admin cannot sync claims of a user outside its school |
| FAILED — weakness proven | [E5.1][C4][D1] a parent link that was never approved by the school must not allow a pickup request |
| passed | [E5.2] CONTROL: an unlinked parent cannot request a pickup |
| passed | [E5.3] CONTROL: the genuine parent can request a pickup and a guard of another school cannot verify it |
| passed | [F2.1][H7] passwords sent to create-user never appear in server logs, audit logs or profiles |
| FAILED — weakness proven | [F3.1][H7] the public registration form does not persist a password into Firestore (src/views/Login.tsx) |
| FAILED — weakness proven | [F3.2][H7] school activation does not reuse a stored plaintext password (src/lib/auth/schoolActivation.ts) |
| FAILED — weakness proven | [F3.3][H7] the super admin dashboard does not read stored registration passwords (src/views/SuperAdminDashboard.tsx) |
| passed | [F3.4] server logging statements never interpolate a raw password value (server.ts) |
| passed | [F3.5] audit logging of create-user never includes the password |
| passed | [F4.1] CONTROL: removes plaintext passwords from schools, students, users and non-pending registrations |
| FAILED — weakness proven | [F4.2][H7] no plaintext password remains in pending registration requests after the scrub |
| FAILED — weakness proven | [F4.3][H7] more than 400 pending requests must not shield an approved request from the scrub |
| passed | [F4.4] the scrub never logs password values |

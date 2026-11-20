# Security regression run 2026-11-20T16-09-31-113Z

Project: `demo-schoolixiq-security` (emulator only). Files: 1.

| Total | Passed | Failed (proven weakness / broken control) | Not testable | Skipped |
|---|---|---|---|---|
| 41 | 20 | 21 (21 / 0) | 0 | 0 |

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
| FAILED — weakness proven | [A6.3][H2] new user cannot self-create a legacy &quot;assistant&quot; with no school (treated as platform assistant) |
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

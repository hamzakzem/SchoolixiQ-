/**
 * Manual audit helper — run in browser devtools on a school admin session, or
 * adapt for a one-off Node script with Firebase Admin.
 *
 * Example (browser console after homework list is loaded):
 *   import { auditHomeworkSubjectRecords } from './lib/homeworkSubjects';
 *   auditHomeworkSubjectRecords(homeworkArray, teachersById);
 *
 * Flags homework where subject/subjectName looks like a stored credential.
 * Does NOT mutate Firestore.
 */
console.log(`
Homework subject audit helper

Use auditHomeworkSubjectRecords() from src/lib/homeworkSubjects.ts
on in-memory homework + teachersById maps.

Suspect records have subject/subjectName matching:
- password/* fields on the teacher user doc, or
- password-like heuristics (long alphanumeric secrets without Arabic text).

Display is redacted in the app; optional Firestore backfill is a separate ops task.
`);

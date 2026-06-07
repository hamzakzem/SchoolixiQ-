export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export type DailyStudentRecord = {
  studentId: string;
  name: string;
  className: string;
  photoUrl: string;
  status: AttendanceStatus;
  classId: string;
  attendanceDocId: string;
};

export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function parseDueDate(value: unknown): Date {
  if (!value) return new Date(0);
  const v = value as { toDate?: () => Date; seconds?: number };
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  return new Date(String(value));
}

export function buildDailyStudentRecords(
  attendanceDocs: Array<{ id: string; data: () => Record<string, unknown> }>,
  studentsById: Map<string, Record<string, unknown>>,
  classesById: Map<string, string>,
): DailyStudentRecord[] {
  const records: DailyStudentRecord[] = [];

  attendanceDocs.forEach((docSnap) => {
    const data = docSnap.data();
    const classId = String(data.classId || '');
    const className =
      String(data.className || '') ||
      classesById.get(classId) ||
      classId;
    const attRecords = (data.records || {}) as Record<string, AttendanceStatus>;

    Object.entries(attRecords).forEach(([studentId, status]) => {
      const student = studentsById.get(studentId);
      records.push({
        studentId,
        name: String(student?.name || 'طالب'),
        className: String(student?.class || student?.className || className),
        photoUrl: String(student?.photoUrl || ''),
        status,
        classId,
        attendanceDocId: docSnap.id,
      });
    });
  });

  return records.sort((a, b) => a.className.localeCompare(b.className, 'ar'));
}

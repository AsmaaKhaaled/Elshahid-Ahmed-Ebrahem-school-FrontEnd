// ---- Students' attendance, taken by the teacher for one class at a time ----
// Same flow as the teachers' attendance book in the admin panel (دفتر حضور وغياب المعلمين):
// a daily sheet per class, saved as you go, then approved (اعتماد) which locks it into the archive.

export type StudentAttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
// What an approved day keeps for a student nobody marked
export type StudentArchiveStatus = StudentAttendanceStatus | 'NOT_RECORDED';

export interface StudentStatusOption {
  value: StudentArchiveStatus;
  label: string;
  // Selected button in the daily sheet
  activeClass: string;
  // Badge in the archive
  badgeClass: string;
}

export const STUDENT_STATUS_OPTIONS: StudentStatusOption[] = [
  { value: 'PRESENT', label: 'حاضر', activeClass: 'bg-emerald-600', badgeClass: 'bg-emerald-50 text-emerald-800' },
  { value: 'LATE', label: 'متأخر', activeClass: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-800' },
  { value: 'ABSENT', label: 'غائب', activeClass: 'bg-rose-600', badgeClass: 'bg-rose-50 text-rose-800' },
  { value: 'EXCUSED', label: 'بعذر', activeClass: 'bg-blue-600', badgeClass: 'bg-blue-50 text-blue-800' }
];

export const STUDENT_NOT_RECORDED: StudentStatusOption = {
  value: 'NOT_RECORDED', label: 'لم يُسجل', activeClass: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-500'
};

export const ALL_STUDENT_STATUS_OPTIONS = [...STUDENT_STATUS_OPTIONS, STUDENT_NOT_RECORDED];

export function studentStatusOption(status: StudentArchiveStatus | null): StudentStatusOption | undefined {
  return ALL_STUDENT_STATUS_OPTIONS.find(option => option.value === status);
}

/** Late still counts as attending */
export function isAttending(status: StudentArchiveStatus | null): boolean {
  return status === 'PRESENT' || status === 'LATE';
}

/** One student's row in a day's sheet */
export interface ClassDayRecord {
  studentId: string;
  studentName: string;
  code: string;
  // null = not marked yet
  status: StudentArchiveStatus | null;
  note: string;
}

/** What's stored for one class on one day */
export interface ClassDaySheet {
  section: string;
  date: string;
  marks: Record<string, { status: StudentArchiveStatus; note: string }>;
  savedBy: string;
  closed: { closedAt: string; closedBy: string } | null;
}

export interface ClassArchiveRecord extends ClassDayRecord {
  id: string;
  date: string;
  section: string;
  status: StudentArchiveStatus;
}

export interface ClassArchiveFilters {
  from: string;
  to: string;
  studentId: string;
  status: StudentArchiveStatus | '';
}

/** Friday & Saturday */
export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 5 || day === 6;
}

export function sheetKey(section: string, date: string): string {
  return `${section}|${date}`;
}

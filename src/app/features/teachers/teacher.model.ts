export type TeacherStatus = 'على رأس العمل' | 'إجازة اعتيادية' | 'منتدب';

export const TEACHER_STATUSES: TeacherStatus[] = ['على رأس العمل', 'إجازة اعتيادية', 'منتدب'];

// اللقب الموحد لكل المعلمين - الاسم نفسه يُخزن بدون لقب
export const TEACHER_HONORIFIC = 'أ.';

export interface Teacher {
  id: string;
  name: string;
  nationalId: string;
  title: string;
  specialization: string;
  email: string;
  phone: string;
  subjects: string[];
  status: TeacherStatus;
}

export interface ScheduleSlot {
  subject: string;
  section: string;
}

// Keyed by slotKey(dayIndex, periodIndex)
export type WeeklySchedule = Record<string, ScheduleSlot>;

// termId -> teacherId -> weekly schedule
export type TermSchedules = Record<string, Record<string, WeeklySchedule>>;

// e.g. "أ. شريف فؤاد عبد الهادي"
export function teacherDisplayName(teacher: Teacher): string {
  return `${TEACHER_HONORIFIC} ${teacher.name}`;
}

export function slotKey(day: number, period: number): string {
  return `${day}-${period}`;
}

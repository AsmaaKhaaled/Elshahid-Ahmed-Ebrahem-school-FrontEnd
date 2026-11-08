export type TeacherStatus = 'على رأس العمل' | 'إجازة اعتيادية' | 'منتدب';

export const TEACHER_STATUSES: TeacherStatus[] = ['على رأس العمل', 'إجازة اعتيادية', 'منتدب'];

// اللقب الموحد لكل المعلمين - الاسم نفسه يُخزن بدون لقب
export const TEACHER_HONORIFIC = 'أ.';

// The classes one subject is taught to, e.g. { subject: 'اللغة العربية', classes: ['1/1', '2/3'] }
export interface TeachingAssignment {
  subject: string;
  classes: string[];
}

export interface Teacher {
  id: string;
  name: string;
  nationalId: string;
  title: string;
  specialization: string;
  email: string;
  phone: string;
  subjects: string[];
  // Classes the teacher teaches (any subject), e.g. ["3/2", "3/3"]
  classes: string[];
  // Which of those classes each subject goes to
  assignments: TeachingAssignment[];
  status: TeacherStatus;
  // false = stopped (left the school): can't sign in, no classes or periods, kept for the records
  active: boolean;
  // Teachers-portal sign-in (null for a teacher without an account)
  account?: { status: string; mustChangePassword: boolean } | null;
}

// ---- API (backend) shape ----

type EmploymentStatus = 'ON_DUTY' | 'ON_LEAVE' | 'SECONDED';

const STATUS_TO_API: Record<TeacherStatus, EmploymentStatus> = {
  'على رأس العمل': 'ON_DUTY',
  'إجازة اعتيادية': 'ON_LEAVE',
  'منتدب': 'SECONDED'
};

export interface TeacherDto {
  id: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  jobTitle?: string;
  specialization: string;
  subjects: string[];
  classes: string[];
  assignments?: TeachingAssignment[];
  status: EmploymentStatus;
  active?: boolean;
  account?: Teacher['account'];
}

export function teacherFromDto(dto: TeacherDto): Teacher {
  const status = (Object.keys(STATUS_TO_API) as TeacherStatus[]).find(s => STATUS_TO_API[s] === dto.status) ?? 'على رأس العمل';
  return {
    id: dto.id,
    name: dto.fullName,
    nationalId: dto.nationalId ?? '',
    title: dto.jobTitle ?? '',
    specialization: dto.specialization,
    email: dto.email ?? '',
    phone: dto.phone ?? '',
    subjects: dto.subjects,
    classes: dto.classes,
    // Older backends: every subject goes to all the teacher's classes
    assignments: dto.assignments ?? dto.subjects.map(subject => ({ subject, classes: [...dto.classes] })),
    status,
    active: dto.active ?? true,
    account: dto.account ?? null
  };
}

/** Teachers still at the school (the ones other pages list, count & schedule) */
export const activeTeachers = (teachers: Teacher[]): Teacher[] => teachers.filter(t => t.active);

/** Body of POST / PUT /teachers; `password` is the initial (or reset) sign-in password. */
export function teacherToBody(teacher: Teacher, password: string) {
  return {
    fullName: teacher.name.trim(),
    nationalId: teacher.nationalId.trim(),
    phone: teacher.phone.trim(),
    email: teacher.email.trim(),
    jobTitle: teacher.title.trim(),
    specialization: teacher.specialization,
    subjects: teacher.subjects,
    classes: teacher.classes,
    assignments: teacher.assignments,
    status: STATUS_TO_API[teacher.status],
    ...(password && { password })
  };
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

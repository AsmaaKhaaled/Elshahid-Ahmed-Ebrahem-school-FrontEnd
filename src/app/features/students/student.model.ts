import { GRADE_LEVELS, GradeLevel } from '../../core/constants/school.constants';

export type StudentStatus = 'منتظم' | 'موقوف' | 'منقول';

export const STUDENT_STATUSES: StudentStatus[] = ['منتظم', 'موقوف', 'منقول'];

export interface Student {
  id: string;
  code: string;
  // الرقم القومي للطالب (14 رقم)
  nationalId: string;
  name: string;
  gradeId: string;
  // e.g. "3/2"
  className: string;
  guardianName: string;
  guardianPhone: string;
  status: StudentStatus;
  // null until the student has graded results
  gpa: number | null;
}

export const NATIONAL_ID_PATTERN = /^\d{14}$/;
export const EGYPT_MOBILE_PATTERN = /^01[0125]\d{8}$/;

export function gradeOf(student: Pick<Student, 'gradeId'>): GradeLevel | undefined {
  return GRADE_LEVELS.find(grade => grade.id === student.gradeId);
}

// Next free code in the STD-<year>-NNN series, skipping codes already taken
export function nextStudentCode(taken: Set<string>, year = new Date().getFullYear()): string {
  let n = 1;
  let code: string;
  do {
    code = `STD-${year}-${String(n++).padStart(3, '0')}`;
  } while (taken.has(code));
  return code;
}

// Birth date encoded in an Egyptian national ID: C YYMMDD ... (C = 2 for 1900s, 3 for 2000s)
export function birthDateFromNationalId(nationalId: string): Date | null {
  if (!NATIONAL_ID_PATTERN.test(nationalId)) return null;
  const century = nationalId[0] === '2' ? 1900 : nationalId[0] === '3' ? 2000 : 0;
  if (!century) return null;
  const year = century + Number(nationalId.slice(1, 3));
  const month = Number(nationalId.slice(3, 5));
  const day = Number(nationalId.slice(5, 7));
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

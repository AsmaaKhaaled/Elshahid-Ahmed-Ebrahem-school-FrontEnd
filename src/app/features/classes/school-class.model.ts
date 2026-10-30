export const ADVISOR_CHANGE_REASONS = [
  'بداية عام دراسي جديد',
  'نقل المعلم من المدرسة',
  'إجازة طويلة للمعلم',
  'قرار إداري',
  'أخرى'
];

// One entry per advisor appointment; the latest entry of the current academic year is the active advisor
export interface AdvisorAssignment {
  teacherId: string;
  year: string;
  since: string;
  reason: string;
  note?: string;
}

export interface SchoolClass {
  id: string;
  section: string;
  gradeLevel: string;
  enrolledStudents: number;
  shift: 'صباحي' | 'مسائي';
  advisorHistory: AdvisorAssignment[];
}

export function currentAdvisor(schoolClass: SchoolClass, year: string): AdvisorAssignment | null {
  const entries = schoolClass.advisorHistory.filter(entry => entry.year === year);
  return entries.at(-1) ?? null;
}

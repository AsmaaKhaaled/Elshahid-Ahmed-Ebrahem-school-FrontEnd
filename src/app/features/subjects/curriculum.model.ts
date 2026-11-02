import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { TeachingFile } from '../teaching/teaching.model';

// ---- The ministry curriculum of one subject, kept by the teacher who teaches it ----

export type CurriculumFileKind = 'book' | 'guide' | 'plan' | 'exams' | 'other';

export const CURRICULUM_FILE_KINDS: { id: CurriculumFileKind; label: string; icon: string }[] = [
  { id: 'book', label: 'كتاب الوزارة', icon: '📘' },
  { id: 'plan', label: 'توزيع المنهج', icon: '🗓️' },
  { id: 'exams', label: 'نماذج امتحانات الوزارة', icon: '📝' },
  { id: 'guide', label: 'دليل المعلم', icon: '📗' },
  { id: 'other', label: 'ملفات أخرى', icon: '📎' }
];

export interface CurriculumFile {
  id: string;
  kind: CurriculumFileKind;
  title: string;
  file: TeachingFile;
  // false = the teacher's own reference (e.g. the teacher's guide), hidden from students
  forStudents: boolean;
  uploadedAt: string;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  // Week of the term in the curriculum plan (توزيع المنهج), if set
  week: number | null;
  // When the teacher marked it as taught; null = not yet
  doneAt: string | null;
}

export interface CurriculumUnit {
  id: string;
  title: string;
  lessons: CurriculumLesson[];
}

export interface Curriculum {
  id: string;
  teacherId: string;
  subject: string;
  // GRADE_LEVELS id, e.g. "G3"
  gradeId: string;
  // The teacher's classes in that grade that follow this curriculum
  sections: string[];
  description: string;
  units: CurriculumUnit[];
  files: CurriculumFile[];
  updatedAt: string;
}

export function gradeLabel(gradeId: string): string {
  return GRADE_LEVELS.find(grade => grade.id === gradeId)?.label ?? '';
}

/** The grade a class belongs to, e.g. "3/2" -> "G3". */
export function gradeOfSection(section: string): string {
  return GRADE_LEVELS.find(grade => grade.sections.includes(section))?.id ?? '';
}

export function curriculumProgress(curriculum: Curriculum): { done: number; total: number; percent: number } {
  const lessons = curriculum.units.flatMap(unit => unit.lessons);
  const done = lessons.filter(lesson => lesson.doneAt).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

/** The last lesson marked as taught (where the class has reached). */
export function lastTaughtLesson(curriculum: Curriculum): CurriculumLesson | null {
  return (
    curriculum.units
      .flatMap(unit => unit.lessons)
      .filter(lesson => lesson.doneAt)
      .sort((a, b) => b.doneAt!.localeCompare(a.doneAt!))[0] ?? null
  );
}

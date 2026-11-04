import { HttpErrorResponse } from '@angular/common/http';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { TeachingFile } from '../teaching/teaching.model';

// ---- The ministry curriculum of one subject, as the teacher who teaches it uploads it ----
// The teacher doesn't write the curriculum: it comes from the ministry (the textbook, the plan,
// sample exams...) and the teacher uploads those files, or links to them.

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
  // An uploaded file (kept on the server, downloaded through the API), or a link - one of the two
  file?: TeachingFile;
  link?: string;
  // false = the teacher's own reference (e.g. the teacher's guide), hidden from students
  forStudents: boolean;
  uploadedAt: string;
}

/**
 * One week of the teacher's curriculum plan (خطة المنهج): what's taught and its objectives.
 * Written by the teacher for themselves and the administration - students don't see the plan.
 */
export interface CurriculumPlanWeek {
  id: string;
  // Week of the term, 1, 2, 3...
  week: number;
  topic: string;
  objectives: string[];
}

/** A curriculum as listed (the cards): its files are counted, not loaded. */
export interface CurriculumSummary {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  // GRADE_LEVELS id, e.g. "G3"
  gradeId: string;
  // The teacher's classes in that grade that follow this curriculum
  sections: string[];
  description: string;
  updatedAt: string;
  fileCount: number;
  // The kinds it has files for, in the CURRICULUM_FILE_KINDS order
  kinds: CurriculumFileKind[];
  latestFile: { title: string; uploadedAt: string } | null;
}

/** One curriculum opened: its plan and how many files of each kind (the files themselves are paged). */
export interface Curriculum extends CurriculumSummary {
  fileCounts: Partial<Record<CurriculumFileKind, number>>;
  // The plan & objectives: written week by week, and/or the teacher's own plan document
  plan: CurriculumPlanWeek[];
  planFile: TeachingFile | null;
}

/** What the teacher fills in to start or edit a curriculum. */
export interface CurriculumDraft {
  subject: string;
  gradeId: string;
  sections: string[];
  description: string;
}

/** A file or link the teacher adds to a curriculum. */
export interface NewCurriculumFile {
  kind: CurriculumFileKind;
  title: string;
  forStudents: boolean;
  file?: File;
  link?: string;
}

export function gradeLabel(gradeId: string): string {
  return GRADE_LEVELS.find(grade => grade.id === gradeId)?.label ?? '';
}

/** The grade a class belongs to, e.g. "3/2" -> "G3". */
export function gradeOfSection(section: string): string {
  return GRADE_LEVELS.find(grade => grade.sections.includes(section))?.id ?? '';
}

/** The kinds a curriculum has files for (e.g. for the card's icons). */
export function curriculumKinds(curriculum: CurriculumSummary): typeof CURRICULUM_FILE_KINDS {
  return CURRICULUM_FILE_KINDS.filter(kind => curriculum.kinds.includes(kind.id));
}

/** The most recently uploaded file of a curriculum. */
export function latestCurriculumFile(curriculum: CurriculumSummary): CurriculumSummary['latestFile'] {
  return curriculum.latestFile;
}

/** The server's message when it sent one, otherwise the fallback. */
export function curriculumErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  const message = err.error?.message;
  // Field errors (422) are in English; the form already says what's missing
  return typeof message === 'string' && err.status !== 422 ? message : fallback;
}

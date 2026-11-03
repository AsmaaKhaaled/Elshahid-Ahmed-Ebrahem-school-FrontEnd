import { Injectable, computed, inject, signal } from '@angular/core';
import { AcademicCalendarStore, today } from '../../core/academic/academic-calendar.store';
import { ClassRoster } from '../students/class-roster.service';
import { BookWeeks, CriterionKey, GRADE_CRITERIA, GradeMonth, WeekMarks, bookKey, termMonths, weekStart } from './gradebook.model';

// Demo data: classes & subjects with marks already recorded for the weeks gone by
const DEMO_SECTIONS = ['3/2', '3/3', '3/4'];
const DEMO_SUBJECTS = ['الرياضيات', 'اللغة العربية', 'العلوم', 'اللغة الإنجليزية'];

function demoMark(seed: string, max: number): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  // Mostly good marks: between 60% and 100% of the max
  return Math.round(max * (0.6 + (Math.abs(hash) % 41) / 100));
}

/**
 * The classes' grade registers (سجل رصد الدرجات), one per term, class & subject.
 * Mock data until the backend stores them.
 */
@Injectable({ providedIn: 'root' })
export class GradebookStore {
  private readonly roster = inject(ClassRoster);
  private readonly calendar = inject(AcademicCalendarStore);

  readonly books = signal<Record<string, BookWeeks>>({});

  constructor() {
    this.books.set(this.seed());
  }

  /** The current term's months so far (a term not started yet counts from today). */
  readonly months = computed<GradeMonth[]>(() => {
    const term = this.calendar.currentTerm();
    return termMonths(term.startedAt ?? today(), today());
  });

  readonly termId = computed(() => this.calendar.currentTerm().id);

  weeksOf(section: string, subject: string): BookWeeks {
    return this.books()[bookKey(this.termId(), section, subject)] ?? {};
  }

  /** Saves a whole month of marks for a class & subject (the teacher's "حفظ"). */
  saveWeeks(section: string, subject: string, weeks: BookWeeks): void {
    const key = bookKey(this.termId(), section, subject);
    this.books.update(all => ({ ...all, [key]: { ...all[key], ...weeks } }));
  }

  /** The subjects that have a register for a class this term (a student's subjects). */
  subjectsOf(section: string): string[] {
    const prefix = `${this.termId()}|${section}|`;
    return Object.keys(this.books())
      .filter(key => key.startsWith(prefix))
      .map(key => key.slice(prefix.length));
  }

  private seed(): Record<string, BookWeeks> {
    const thisWeek = weekStart(today());
    const past = this.months().flatMap(m => m.weeks).filter(w => w < thisWeek);
    const books: Record<string, BookWeeks> = {};
    for (const section of DEMO_SECTIONS) {
      const students = this.roster.studentsOf(section);
      for (const subject of DEMO_SUBJECTS) {
        const weeks: BookWeeks = {};
        for (const week of past) {
          weeks[week] = {};
          for (const s of students) {
            const marks: WeekMarks = {};
            for (const c of GRADE_CRITERIA) marks[c.key as CriterionKey] = demoMark(`${s.id}${subject}${week}${c.key}`, c.max);
            weeks[week][s.id] = marks;
          }
        }
        books[bookKey(this.termId(), section, subject)] = weeks;
      }
    }
    return books;
  }
}

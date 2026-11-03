import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { today } from '../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { CardTableDirective } from '../../shared/directives/card-table.directive';
import { ClassRoster } from '../students/class-roster.service';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { exportGradebookExcel } from './gradebook-excel';
import {
  BookWeeks, CriterionKey, GRADE_CRITERIA, WEEK_TOTAL, WeekMarks, isValidMark, monthAverage, weekLabel, weekStart, weekTotal
} from './gradebook.model';
import { GradebookStore } from './gradebook.store';

const TITLE = 'سجل رصد درجات الصف';

/**
 * سجل رصد الدرجات - the class grade register, the same for every subject.
 * - Teacher: records each week's marks for their class & subject; the totals and the month's
 *   average are worked out. On phones one week at a time, on wide screens the month like the paper.
 * - Student (or parent): their own marks in every subject, view only.
 */
@Component({
  selector: 'app-grades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardTableDirective, MatFormFieldModule, MatSelectModule],
  templateUrl: './grades.component.html',
  styleUrl: './grades.component.css'
})
export class GradesComponent {
  readonly scope = inject(TeachingScope);
  private readonly store = inject(GradebookStore);
  private readonly roster = inject(ClassRoster);

  readonly school = SCHOOL_INFO;
  readonly title = TITLE;
  readonly criteria = GRADE_CRITERIA;
  readonly weekMax = WEEK_TOTAL;
  readonly weekLabel = weekLabel;
  readonly weekTotal = weekTotal;
  readonly thisWeek = weekStart(today());

  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.scope.ensureLoaded();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
    this.loadDraft();
  }

  // ---- Which register: class, subject, month ----

  readonly months = this.store.months;
  readonly selectedSection = signal(this.scope.sections()[0] ?? '');
  readonly selectedSubject = signal(this.scope.subjects()[0] ?? '');
  // The current month by default
  readonly selectedMonthIndex = signal(Math.max(0, this.store.months().length - 1));
  readonly month = computed(() => this.months()[this.selectedMonthIndex()] ?? null);
  // Phones show one week at a time; index 4 = the month's average
  readonly selectedWeekIndex = signal(this.currentWeekIndex());

  readonly students = computed(() => this.roster.studentsOf(this.selectedSection()));

  // ---- The month's marks being edited ----

  readonly draft = signal<BookWeeks>({});
  private readonly stored = computed(() => this.pickMonth(this.store.weeksOf(this.selectedSection(), this.selectedSubject())));
  readonly dirty = computed(() => JSON.stringify(this.draft()) !== JSON.stringify(this.stored()));
  readonly invalidCount = computed(() =>
    Object.values(this.draft()).reduce(
      (count, byStudent) =>
        count + Object.values(byStudent).reduce((n, marks) => n + GRADE_CRITERIA.filter(c => !isValidMark(c.key, marks[c.key])).length, 0),
      0
    )
  );
  readonly notice = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  marksOf(week: string, studentId: string): WeekMarks | undefined {
    return this.draft()[week]?.[studentId];
  }

  markOf(week: string, studentId: string, key: CriterionKey): number | undefined {
    return this.draft()[week]?.[studentId]?.[key];
  }

  isInvalid(week: string, studentId: string, key: CriterionKey): boolean {
    return !isValidMark(key, this.markOf(week, studentId, key));
  }

  averageOf(studentId: string) {
    return monthAverage((this.month()?.weeks ?? []).map(week => this.draft()[week]?.[studentId]));
  }

  /** A future week can't be graded yet. */
  isFutureWeek(week: string): boolean {
    return week > this.thisWeek;
  }

  setMark(week: string, studentId: string, key: CriterionKey, raw: string): void {
    if (this.isFutureWeek(week)) return;
    const value = raw.trim() === '' ? undefined : Number(raw);
    this.draft.update(all => {
      const marks: WeekMarks = { ...all[week]?.[studentId] };
      if (value === undefined) delete marks[key];
      else marks[key] = value;
      return { ...all, [week]: { ...all[week], [studentId]: marks } };
    });
    this.error.set(null);
  }

  selectSection(section: string): void {
    if (section === this.selectedSection() || !this.leaveUnsaved()) return;
    this.selectedSection.set(section);
    this.loadDraft();
  }

  selectSubject(subject: string): void {
    if (subject === this.selectedSubject() || !this.leaveUnsaved()) return;
    this.selectedSubject.set(subject);
    this.loadDraft();
  }

  selectMonth(index: number): void {
    if (index === this.selectedMonthIndex() || !this.leaveUnsaved()) return;
    this.selectedMonthIndex.set(index);
    this.selectedWeekIndex.set(this.currentWeekIndex());
    this.loadDraft();
  }

  discard(): void {
    this.loadDraft();
  }

  save(): void {
    if (this.invalidCount()) {
      this.error.set(`فيه ${this.invalidCount()} درجة أكبر من الدرجة النهائية أو أقل من صفر. صلّحها الأول.`);
      return;
    }
    this.store.saveWeeks(this.selectedSection(), this.selectedSubject(), this.draft());
    this.loadDraft();
    clearTimeout(this.noticeTimer);
    this.notice.set('تم حفظ الدرجات.');
    this.noticeTimer = setTimeout(() => this.notice.set(null), 4000);
  }

  async exportExcel(): Promise<void> {
    const month = this.month();
    if (!month || this.exporting()) return;
    this.exporting.set(true);
    try {
      await exportGradebookExcel(this.students(), this.draft(), month, this.selectedSection(), this.selectedSubject(), TITLE);
    } catch {
      this.error.set('تعذر تصدير السجل.');
    } finally {
      this.exporting.set(false);
    }
  }

  print(): void {
    window.print();
  }

  // ---- Student: their own marks, every subject ----

  readonly me = computed(() => (this.scope.isStudent() ? this.roster.me() : null));
  readonly mySubjects = computed(() => {
    const me = this.me();
    const month = this.month();
    if (!me || !month) return [];
    return this.store.subjectsOf(this.scope.studentSection()).map(subject => {
      const book = this.store.weeksOf(this.scope.studentSection(), subject);
      const weeks = month.weeks.map(week => ({ week, marks: book[week]?.[me.id] as WeekMarks | undefined }));
      return { subject, weeks, average: monthAverage(weeks.map(w => w.marks)) };
    });
  });

  selectMonthForStudent(index: number): void {
    this.selectedMonthIndex.set(index);
  }

  // ---- helpers ----

  private currentWeekIndex(): number {
    const weeks = this.store.months()[this.selectedMonthIndex()]?.weeks ?? [];
    const i = weeks.indexOf(this.thisWeek);
    return i >= 0 ? i : 0;
  }

  private pickMonth(book: BookWeeks): BookWeeks {
    const picked: BookWeeks = {};
    for (const week of this.month()?.weeks ?? []) {
      picked[week] = Object.fromEntries(Object.entries(book[week] ?? {}).map(([id, marks]) => [id, { ...marks }]));
    }
    return picked;
  }

  private loadDraft(): void {
    this.draft.set(this.pickMonth(this.store.weeksOf(this.selectedSection(), this.selectedSubject())));
    this.error.set(null);
  }

  private leaveUnsaved(): boolean {
    return !this.dirty() || confirm('فيه درجات لسه ما اتحفظتش. تحب تسيبها؟');
  }
}

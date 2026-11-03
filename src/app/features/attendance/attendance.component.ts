import { ChangeDetectionStrategy, Component, DestroyRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/auth/auth.service';
import { today } from '../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { DateFieldComponent } from '../../shared/components/date-field/date-field.component';
import { PAGE_SIZE_OPTIONS, loadPageSize, savePageSize } from '../../shared/components/pagination/page-size';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CardTableDirective } from '../../shared/directives/card-table.directive';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { ClassRoster } from '../students/class-roster.service';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { StudentSummary, exportClassAttendanceExcel, summarizeByStudent } from './class-attendance-excel';
import {
  ALL_STUDENT_STATUS_OPTIONS, ClassArchiveFilters, ClassArchiveRecord, ClassDayRecord, STUDENT_NOT_RECORDED,
  STUDENT_STATUS_OPTIONS, StudentArchiveStatus, StudentAttendanceStatus, isAttending, isWeekend, studentStatusOption
} from './class-attendance.model';
import { ClassAttendanceStore, shiftIsoDate } from './class-attendance.store';

const SHEET_SIZE_KEY = 'student-attendance-sheet';
const ARCHIVE_SIZE_KEY = 'student-attendance-archive';
const EMPTY_FILTERS: ClassArchiveFilters = { from: '', to: '', studentId: '', status: '' };

/**
 * دفتر الحضور والغياب
 * - Teacher: takes the attendance of one of their classes at a time, the same way the admin takes
 *   the teachers' (daily sheet → save → approve, then the archive with filters & exports).
 * - Student (or parent): their own record, view only.
 */
@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CardTableDirective, ArabicDatePipe, PaginationComponent, DateFieldComponent, MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent {
  readonly scope = inject(TeachingScope);
  private readonly store = inject(ClassAttendanceStore);
  private readonly roster = inject(ClassRoster);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  readonly school = SCHOOL_INFO;
  readonly statusOptions = STUDENT_STATUS_OPTIONS;
  readonly archiveStatusOptions = ALL_STUDENT_STATUS_OPTIONS;
  readonly notRecorded = STUDENT_NOT_RECORDED;
  readonly statusOption = studentStatusOption;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.scope.ensureLoaded();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
    this.loadDay();
  }

  // ================= Teacher: the daily sheet =================

  readonly today = today();
  readonly selectedSection = signal(this.scope.sections()[0] ?? '');
  readonly selectedDate = signal(this.today);

  readonly sheet = computed(() => this.store.sheet(this.selectedSection(), this.selectedDate()));
  readonly dayType = computed<'WEEKEND' | 'FUTURE' | 'SCHOOL_DAY'>(() =>
    isWeekend(this.selectedDate()) ? 'WEEKEND' : this.selectedDate() > this.today ? 'FUTURE' : 'SCHOOL_DAY'
  );
  readonly closed = computed(() => this.sheet()?.closed ?? null);
  readonly editable = computed(() => this.dayType() === 'SCHOOL_DAY' && !this.closed());

  // Working copy of the day's rows; compared with what's stored to know about unsaved changes
  readonly draft = signal<ClassDayRecord[]>([]);
  private readonly stored = computed(() => this.store.recordsOf(this.selectedSection(), this.selectedDate()));
  readonly dirty = computed(() => JSON.stringify(this.draft()) !== JSON.stringify(this.stored()));

  // Only the visible slice is paged; the whole draft() is still what gets saved
  readonly sheetPage = signal(1);
  readonly sheetPageSize = signal(loadPageSize(SHEET_SIZE_KEY));
  readonly sheetRows = computed(() => {
    const start = (this.sheetPage() - 1) * this.sheetPageSize();
    return this.draft().slice(start, start + this.sheetPageSize());
  });
  readonly unmarkedCount = computed(() => this.draft().filter(r => !r.status || r.status === 'NOT_RECORDED').length);
  readonly attendingCount = computed(() => this.draft().filter(r => isAttending(r.status)).length);
  readonly attendanceRate = computed(() => {
    const total = this.draft().length;
    return total ? Math.round((this.attendingCount() / total) * 100) : 0;
  });

  readonly confirmingClose = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  countOf(status: StudentArchiveStatus): number {
    return this.draft().filter(row => row.status === status).length;
  }

  changeSection(section: string): void {
    if (section === this.selectedSection() || !this.leaveUnsaved()) return;
    this.selectedSection.set(section);
    this.filters.set(EMPTY_FILTERS);
    this.archivePage.set(1);
    this.loadDay();
  }

  changeDate(date: string): void {
    if (!date || date === this.selectedDate() || !this.leaveUnsaved()) return;
    this.selectedDate.set(date);
    this.loadDay();
  }

  shiftDate(days: number): void {
    this.changeDate(shiftIsoDate(this.selectedDate(), days));
  }

  changeSheetPageSize(size: number): void {
    savePageSize(SHEET_SIZE_KEY, size);
    this.sheetPageSize.set(size);
    this.sheetPage.set(1);
  }

  goToday(): void {
    this.changeDate(this.today);
  }

  setStatus(studentId: string, status: StudentAttendanceStatus): void {
    if (!this.editable()) return;
    this.updateRow(studentId, row => ({ ...row, status }));
  }

  setNote(studentId: string, note: string): void {
    if (!this.editable()) return;
    this.updateRow(studentId, row => ({ ...row, note }));
  }

  // Only students without a status; an absence already marked is kept
  markUnmarkedPresent(): void {
    if (!this.editable()) return;
    this.draft.update(rows => rows.map(row => (row.status ? row : { ...row, status: 'PRESENT' })));
  }

  discardChanges(): void {
    this.loadDay(false);
  }

  save(): void {
    if (!this.editable()) return;
    if (!this.draft().some(r => r.status)) {
      this.actionError.set('اختر حالة طالب واحد على الأقل قبل الحفظ.');
      return;
    }
    this.store.save(this.selectedSection(), this.selectedDate(), this.draft(), this.teacherName());
    this.afterAction('تم حفظ دفتر اليوم.');
  }

  /** Saves what's typed and locks the day into the archive; unmarked students become "لم يُسجل". */
  closeDay(): void {
    if (!this.editable()) return;
    this.store.close(this.selectedSection(), this.selectedDate(), this.draft(), this.teacherName());
    this.afterAction(`تم اعتماد دفتر فصل ${this.selectedSection()} ونقله للأرشيف.`);
  }

  // ================= Teacher: the archive =================

  readonly filters = signal<ClassArchiveFilters>(EMPTY_FILTERS);
  readonly archivePage = signal(1);
  readonly archivePageSize = signal(loadPageSize(ARCHIVE_SIZE_KEY));
  readonly archiveRecords = computed(() => this.store.archive(this.selectedSection(), this.filters()));
  readonly archiveRows = computed(() => {
    const start = (this.archivePage() - 1) * this.archivePageSize();
    return this.archiveRecords().slice(start, start + this.archivePageSize());
  });
  readonly archiveSummary = computed(() => {
    const counts: Partial<Record<StudentArchiveStatus, number>> = {};
    for (const r of this.archiveRecords()) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  });
  readonly hasFilters = computed(() => JSON.stringify(this.filters()) !== JSON.stringify(EMPTY_FILTERS));
  readonly studentOptions = computed(() => this.roster.studentsOf(this.selectedSection()));
  readonly periodLabel = computed(() => {
    const { from, to } = this.filters();
    if (from && to) return `من ${from} إلى ${to}`;
    if (from) return `من ${from}`;
    if (to) return `حتى ${to}`;
    return 'كل الفترات';
  });

  readonly exporting = signal<'excel' | 'pdf' | null>(null);
  readonly archiveError = signal<string | null>(null);
  // Set while printing the PDF report
  readonly printRecords = signal<ClassArchiveRecord[] | null>(null);
  readonly printSummary = computed<StudentSummary[]>(() => summarizeByStudent(this.printRecords() ?? []));

  summaryCount(status: StudentArchiveStatus): number {
    return this.archiveSummary()[status] ?? 0;
  }

  setFilter(key: keyof ClassArchiveFilters, value: string): void {
    this.filters.update(filters => ({ ...filters, [key]: value }));
    this.archivePage.set(1);
  }

  clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
    this.archivePage.set(1);
  }

  changeArchivePageSize(size: number): void {
    savePageSize(ARCHIVE_SIZE_KEY, size);
    this.archivePageSize.set(size);
    this.archivePage.set(1);
  }

  async exportExcel(): Promise<void> {
    const records = this.archiveRecords();
    if (this.exporting() || !records.length) return;
    this.exporting.set('excel');
    this.archiveError.set(null);
    try {
      await exportClassAttendanceExcel(records, this.selectedSection(), this.periodLabel());
    } catch {
      this.archiveError.set('تعذر تصدير السجل.');
    } finally {
      this.exporting.set(null);
    }
  }

  exportPdf(): void {
    const records = this.archiveRecords();
    if (this.exporting() || !records.length) return;
    this.printRecords.set(records);
    // Print once the report is on the page; the browser's dialog offers "Save as PDF"
    afterNextRender(
      () => {
        window.print();
        this.printRecords.set(null);
      },
      { injector: this.injector }
    );
  }

  // ================= Student: their own record =================

  readonly me = computed(() => (this.scope.isStudent() ? this.roster.me() : null));
  readonly myDays = computed(() => {
    const me = this.me();
    return me ? this.store.historyOf(this.scope.studentSection(), me.id) : [];
  });
  readonly myCounts = computed(() => {
    const days = this.myDays();
    const count = (s: StudentArchiveStatus) => days.filter(d => d.status === s).length;
    return {
      total: days.length,
      present: count('PRESENT'),
      absent: count('ABSENT'),
      late: count('LATE'),
      excused: count('EXCUSED'),
      rate: days.length ? Math.round(((count('PRESENT') + count('LATE')) / days.length) * 100) : 0
    };
  });

  // ================= helpers =================

  private loadDay(resetPage = true): void {
    this.draft.set(this.stored().map(r => ({ ...r })));
    this.confirmingClose.set(false);
    this.actionError.set(null);
    if (resetPage) this.sheetPage.set(1);
  }

  private leaveUnsaved(): boolean {
    return !this.dirty() || confirm('فيه تعديلات في دفتر اليوم لسه ما اتحفظتش. تحب تسيبها؟');
  }

  private updateRow(studentId: string, change: (row: ClassDayRecord) => ClassDayRecord): void {
    this.draft.update(rows => rows.map(row => (row.studentId === studentId ? change(row) : row)));
  }

  private afterAction(message: string): void {
    this.loadDay(false);
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 4000);
  }

  private teacherName(): string {
    return this.auth.userName() || 'المعلم';
  }
}

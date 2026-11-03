import { ChangeDetectionStrategy, Component, DestroyRef, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, concatMap, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { today } from '../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { HolidayDialogComponent } from './holiday-dialog.component';
import { TeacherSummary, exportAttendanceExcel, summarizeByTeacher } from './teacher-attendance-excel';
import {
  ALL_STATUS_OPTIONS,
  ArchiveFilters,
  ArchivePage,
  ArchiveRecord,
  AttendanceDay,
  AttendanceStatus,
  DEFAULT_ARRIVAL,
  DEFAULT_DEPARTURE,
  DayRecord,
  Holiday,
  NOT_RECORDED_OPTION,
  STATUS_OPTIONS,
  SaveRecord,
  attendanceErrorMessage,
  isOnDuty,
  statusOption
} from './teacher-attendance.model';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { CardTableDirective } from '../../shared/directives/card-table.directive';

const SHEET_PAGE_SIZE = 10;
const ARCHIVE_PAGE_SIZE = 10;
const EMPTY_FILTERS: ArchiveFilters = { from: '', to: '', teacherId: '', status: '' };

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardTableDirective, ArabicDatePipe, PaginationComponent, HolidayDialogComponent],
  templateUrl: './teacher-attendance.component.html',
  styleUrl: './teacher-attendance.component.css'
})
export class TeacherAttendanceComponent implements OnInit {
  private readonly service = inject(TeacherAttendanceService);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  readonly school = SCHOOL_INFO;
  readonly statusOptions = STATUS_OPTIONS;
  readonly archiveStatusOptions = ALL_STATUS_OPTIONS;
  readonly notRecorded = NOT_RECORDED_OPTION;
  readonly statusOption = statusOption;
  readonly isOnDuty = isOnDuty;
  readonly sheetPageSize = SHEET_PAGE_SIZE;
  readonly archivePageSize = ARCHIVE_PAGE_SIZE;
  readonly isSuperAdmin = this.authService.isSuperAdmin;

  // ---- Daily sheet ----
  readonly selectedDate = signal(today());
  readonly day = signal<AttendanceDay | null>(null);
  // Working copy of the day's rows; compared with day().records to know about unsaved changes
  readonly draft = signal<DayRecord[]>([]);
  readonly loadingDay = signal(false);
  readonly dayError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal<'save' | 'close' | 'reopen' | null>(null);
  readonly confirmingClose = signal(false);
  readonly sheetPage = signal(1);

  readonly editable = computed(() => !!this.day()?.editable);
  readonly dirty = computed(() => JSON.stringify(this.draft()) !== JSON.stringify(this.day()?.records ?? []));
  readonly sheetRows = computed(() => {
    const start = (this.sheetPage() - 1) * SHEET_PAGE_SIZE;
    return this.draft().slice(start, start + SHEET_PAGE_SIZE);
  });
  readonly unmarkedCount = computed(() => this.draft().filter(r => !r.status || r.status === 'NOT_RECORDED').length);
  readonly onSiteCount = computed(() => this.draft().filter(r => isOnDuty(r.status)).length);
  readonly attendanceRate = computed(() => {
    const total = this.draft().length;
    return total ? Math.round((this.onSiteCount() / total) * 100) : 0;
  });

  // ---- Archive ----
  readonly filters = signal<ArchiveFilters>(EMPTY_FILTERS);
  readonly archivePage = signal(1);
  readonly archive = signal<ArchivePage | null>(null);
  readonly loadingArchive = signal(false);
  readonly archiveError = signal<string | null>(null);
  readonly exporting = signal<'excel' | 'pdf' | null>(null);
  // Set while printing the PDF report
  readonly printRecords = signal<ArchiveRecord[] | null>(null);
  readonly printSummary = computed<TeacherSummary[]>(() => summarizeByTeacher(this.printRecords() ?? []));
  readonly hasFilters = computed(() => JSON.stringify(this.filters()) !== JSON.stringify(EMPTY_FILTERS));
  // Teacher filter: the current staff, A→Z
  readonly teacherOptions = computed(() =>
    (this.day()?.records ?? []).filter((r): r is DayRecord & { teacherId: string } => !!r.teacherId)
  );
  readonly periodLabel = computed(() => {
    const { from, to } = this.filters();
    if (from && to) return `من ${from} إلى ${to}`;
    if (from) return `من ${from}`;
    if (to) return `حتى ${to}`;
    return 'كل الفترات';
  });

  // ---- Holidays ----
  readonly holidays = signal<Holiday[]>([]);
  readonly holidayDialogOpen = signal(false);
  readonly holidaySaving = signal(false);
  readonly holidayError = signal<string | null>(null);
  readonly confirmDeleteHolidayId = signal<string | null>(null);
  readonly holidaysError = signal<string | null>(null);

  private dayRequest?: Subscription;
  private archiveRequest?: Subscription;
  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.noticeTimer));
  }

  ngOnInit(): void {
    this.loadDay();
    this.loadArchive();
    this.loadHolidays();
  }

  // ---------- Daily sheet ----------

  countOf(status: AttendanceStatus): number {
    return this.draft().filter(row => row.status === status).length;
  }

  changeDate(date: string): void {
    if (!date || date === this.selectedDate()) return;
    if (this.dirty() && !confirm('فيه تعديلات في دفتر اليوم لسه ما اتحفظتش. تحب تسيبها وتفتح يوم تاني؟')) return;
    this.selectedDate.set(date);
    this.loadDay();
  }

  shiftDate(days: number): void {
    const date = new Date(`${this.selectedDate()}T00:00:00`);
    date.setDate(date.getDate() + days);
    this.changeDate(toIsoDate(date));
  }

  goToday(): void {
    this.changeDate(this.day()?.today ?? today());
  }

  loadDay(): void {
    this.dayRequest?.unsubscribe();
    this.loadingDay.set(true);
    this.dayError.set(null);
    this.actionError.set(null);
    this.confirmingClose.set(false);
    this.dayRequest = this.service.getDay(this.selectedDate()).subscribe({
      next: day => {
        this.applyDay(day);
        this.loadingDay.set(false);
      },
      error: err => {
        this.day.set(null);
        this.draft.set([]);
        this.dayError.set(attendanceErrorMessage(err, 'تعذر تحميل دفتر اليوم.'));
        this.loadingDay.set(false);
      }
    });
  }

  setStatus(teacherId: string | null, status: AttendanceStatus): void {
    if (!this.editable()) return;
    this.updateRow(teacherId, row =>
      isOnDuty(status)
        ? { ...row, status, arrivalTime: row.arrivalTime || DEFAULT_ARRIVAL, departureTime: row.departureTime || DEFAULT_DEPARTURE }
        : { ...row, status, arrivalTime: '', departureTime: '' }
    );
  }

  setField(teacherId: string | null, field: 'arrivalTime' | 'departureTime' | 'note', value: string): void {
    if (!this.editable()) return;
    this.updateRow(teacherId, row => ({ ...row, [field]: value }));
  }

  // Only teachers without a status; an absence already marked is kept
  markUnmarkedPresent(): void {
    if (!this.editable()) return;
    this.draft.update(rows =>
      rows.map(row =>
        row.status ? row : { ...row, status: 'PRESENT', arrivalTime: DEFAULT_ARRIVAL, departureTime: DEFAULT_DEPARTURE }
      )
    );
  }

  discardChanges(): void {
    this.draft.set(cloneRecords(this.day()?.records ?? []));
  }

  save(): void {
    if (this.busy() || !this.editable()) return;
    const records = this.recordsToSave();
    if (!records.length) {
      this.actionError.set('اختر حالة معلم واحد على الأقل قبل الحفظ.');
      return;
    }
    this.run('save', this.service.saveDay(this.selectedDate(), records), 'تم حفظ دفتر اليوم.');
  }

  closeDay(): void {
    if (this.busy() || !this.editable()) return;
    const date = this.selectedDate();
    const records = this.recordsToSave();
    // Unsaved changes are saved first, so nothing typed is lost when the day locks
    const save$: Observable<unknown> = this.dirty() && records.length ? this.service.saveDay(date, records) : of(null);
    this.run('close', save$.pipe(concatMap(() => this.service.closeDay(date))), 'تم اعتماد دفتر اليوم ونقله للأرشيف.', true);
  }

  reopenDay(): void {
    if (this.busy() || !this.day()?.closed) return;
    this.run('reopen', this.service.reopenDay(this.selectedDate()), 'تم فتح دفتر اليوم للتعديل.', true);
  }

  // ---------- Archive ----------

  setFilter(key: keyof ArchiveFilters, value: string): void {
    this.filters.update(filters => ({ ...filters, [key]: value }));
    this.archivePage.set(1);
    this.loadArchive();
  }

  clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
    this.archivePage.set(1);
    this.loadArchive();
  }

  goToArchivePage(page: number): void {
    this.archivePage.set(page);
    this.loadArchive();
  }

  loadArchive(): void {
    this.archiveRequest?.unsubscribe();
    this.loadingArchive.set(true);
    this.archiveError.set(null);
    this.archiveRequest = this.service.getArchive(this.filters(), this.archivePage(), ARCHIVE_PAGE_SIZE).subscribe({
      next: page => {
        this.archive.set(page);
        this.loadingArchive.set(false);
      },
      error: err => {
        this.archiveError.set(attendanceErrorMessage(err, 'تعذر تحميل أرشيف الحضور.'));
        this.loadingArchive.set(false);
      }
    });
  }

  summaryCount(status: string): number {
    return this.archive()?.summary[status as keyof ArchivePage['summary']] ?? 0;
  }

  exportExcel(): void {
    this.export('excel', records => exportAttendanceExcel(records, this.periodLabel()));
  }

  exportPdf(): void {
    this.export('pdf', async records => {
      this.printRecords.set(records);
      // Print once the report is on the page; the browser's dialog offers "Save as PDF"
      afterNextRender(
        () => {
          window.print();
          this.printRecords.set(null);
        },
        { injector: this.injector }
      );
    });
  }

  // ---------- Holidays ----------

  loadHolidays(): void {
    this.service.getHolidays().subscribe({
      next: holidays => {
        this.holidays.set(holidays);
        this.holidaysError.set(null);
      },
      error: err => this.holidaysError.set(attendanceErrorMessage(err, 'تعذر تحميل الإجازات.'))
    });
  }

  openHolidayDialog(): void {
    this.holidayError.set(null);
    this.holidayDialogOpen.set(true);
  }

  saveHoliday(holiday: Omit<Holiday, 'id'>): void {
    this.holidaySaving.set(true);
    this.holidayError.set(null);
    this.service.createHoliday(holiday).subscribe({
      next: () => {
        this.holidaySaving.set(false);
        this.holidayDialogOpen.set(false);
        this.showNotice('تم تسجيل الإجازة.');
        this.loadHolidays();
        // The open day may have just become a day off
        this.loadDay();
      },
      error: err => {
        this.holidaySaving.set(false);
        this.holidayError.set(attendanceErrorMessage(err, 'تعذر تسجيل الإجازة.'));
      }
    });
  }

  deleteHoliday(id: string): void {
    this.confirmDeleteHolidayId.set(null);
    this.service.deleteHoliday(id).subscribe({
      next: () => {
        this.holidays.update(list => list.filter(h => h.id !== id));
        this.showNotice('تم حذف الإجازة.');
        this.loadDay();
      },
      error: err => this.holidaysError.set(attendanceErrorMessage(err, 'تعذر حذف الإجازة.'))
    });
  }

  // ---------- helpers ----------

  private applyDay(day: AttendanceDay): void {
    const sameDay = this.day()?.date === day.date;
    this.day.set(day);
    this.draft.set(cloneRecords(day.records));
    // Stay on the same page after saving; start from page 1 on another day
    const lastPage = Math.max(1, Math.ceil(day.records.length / SHEET_PAGE_SIZE));
    this.sheetPage.set(sameDay ? Math.min(this.sheetPage(), lastPage) : 1);
  }

  private updateRow(teacherId: string | null, change: (row: DayRecord) => DayRecord): void {
    this.draft.update(rows => rows.map(row => (row.teacherId === teacherId ? change(row) : row)));
  }

  private recordsToSave(): SaveRecord[] {
    return this.draft()
      .filter((row): row is DayRecord & { teacherId: string; status: AttendanceStatus } =>
        !!row.teacherId && !!row.status && row.status !== 'NOT_RECORDED'
      )
      .map(row => ({
        teacherId: row.teacherId,
        status: row.status,
        arrivalTime: row.arrivalTime,
        departureTime: row.departureTime,
        note: row.note
      }));
  }

  private run(action: 'save' | 'close' | 'reopen', request$: Observable<AttendanceDay>, message: string, refreshArchive = false): void {
    this.busy.set(action);
    this.actionError.set(null);
    this.confirmingClose.set(false);
    request$.subscribe({
      next: day => {
        this.applyDay(day);
        this.busy.set(null);
        this.showNotice(message);
        if (refreshArchive) this.loadArchive();
      },
      error: err => {
        this.busy.set(null);
        this.actionError.set(attendanceErrorMessage(err, 'تعذر حفظ دفتر اليوم.'));
      }
    });
  }

  private export(kind: 'excel' | 'pdf', write: (records: ArchiveRecord[]) => Promise<void>): void {
    if (this.exporting()) return;
    this.exporting.set(kind);
    this.archiveError.set(null);
    this.service.exportArchive(this.filters()).subscribe({
      next: async records => {
        try {
          if (!records.length) {
            this.archiveError.set('مفيش سجلات في الفترة دي للتصدير.');
          } else {
            await write(records);
          }
        } finally {
          this.exporting.set(null);
        }
      },
      error: err => {
        this.exporting.set(null);
        this.archiveError.set(attendanceErrorMessage(err, 'تعذر تصدير السجل.'));
      }
    });
  }

  private showNotice(message: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 4000);
  }
}

function cloneRecords(records: DayRecord[]): DayRecord[] {
  return records.map(record => ({ ...record }));
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { AuthService } from '../../core/auth/auth.service';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { ExamEntryDialogComponent } from './exam-entry-dialog.component';
import { ExamScheduleDetails, ExamScheduleDialogComponent } from './exam-schedule-dialog.component';
import { EXAM_TYPES, ExamEntry, ExamSchedule, ExamType, ExamsStore, addMinutes, formatTime } from './exams.store';

const TYPE_STYLES: Record<ExamType, string> = {
  'تقييم شهري': 'bg-sky-50 text-sky-700',
  'امتحان نصف الترم': 'bg-amber-50 text-amber-700',
  'امتحان آخر العام': 'bg-rose-50 text-rose-700'
};

@Component({
  selector: 'app-exams',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe, MatFormFieldModule, MatSelectModule, ExamScheduleDialogComponent, ExamEntryDialogComponent],
  templateUrl: './exams.component.html',
  styleUrl: './exams.component.css'
})
export class ExamsComponent {
  readonly store = inject(ExamsStore);
  readonly calendar = inject(AcademicCalendarStore);
  private readonly authService = inject(AuthService);

  readonly types = EXAM_TYPES;
  readonly grades = GRADE_LEVELS;
  readonly typeStyles = TYPE_STYLES;
  readonly formatTime = formatTime;
  readonly addMinutes = addMinutes;

  readonly isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  // Follows the current term whenever the admin changes it
  readonly selectedTermId = linkedSignal(() => this.calendar.currentTermId());
  readonly selectedGradeId = signal('ALL');
  readonly selectedType = signal<'ALL' | ExamType>('ALL');
  readonly confirmingDeleteId = signal<string | null>(null);

  readonly scheduleDialog = signal<{ schedule: ExamSchedule | null } | null>(null);
  readonly entryDialog = signal<{ scheduleId: string; entry: ExamEntry | null } | null>(null);
  readonly entryDialogSchedule = computed(() => {
    const dialog = this.entryDialog();
    return dialog ? this.store.schedules().find(s => s.id === dialog.scheduleId) ?? null : null;
  });

  readonly selectedTermLabel = computed(() =>
    this.calendar.terms().find(term => term.id === this.selectedTermId())?.label ?? ''
  );

  // Teachers & students only see published timetables
  readonly visibleSchedules = computed(() =>
    this.store.schedules()
      .filter(s =>
        s.termId === this.selectedTermId() &&
        (this.selectedGradeId() === 'ALL' || s.gradeId === this.selectedGradeId()) &&
        (this.selectedType() === 'ALL' || s.type === this.selectedType()) &&
        (this.isAdmin() || s.published)
      )
      .sort((a, b) => (this.dateRange(a)?.from ?? '9999').localeCompare(this.dateRange(b)?.from ?? '9999'))
  );

  gradeLabel(gradeId: string): string {
    return GRADE_LEVELS.find(grade => grade.id === gradeId)?.label ?? '';
  }

  sortedEntries(schedule: ExamSchedule): ExamEntry[] {
    return [...schedule.entries].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }

  dateRange(schedule: ExamSchedule): { from: string; to: string } | null {
    const dates = schedule.entries.map(e => e.date).sort();
    return dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
  }

  saveSchedule(existing: ExamSchedule | null, details: ExamScheduleDetails): void {
    this.store.saveSchedule(
      existing
        ? { ...existing, ...details }
        : { id: crypto.randomUUID(), termId: this.selectedTermId(), published: false, entries: [], ...details }
    );
    this.scheduleDialog.set(null);
  }

  saveEntry(scheduleId: string, entry: ExamEntry): void {
    this.store.saveEntry(scheduleId, entry);
    this.entryDialog.set(null);
  }

  togglePublished(schedule: ExamSchedule): void {
    this.store.setPublished(schedule.id, !schedule.published);
  }

  deleteSchedule(scheduleId: string): void {
    this.store.deleteSchedule(scheduleId);
    this.confirmingDeleteId.set(null);
  }
}

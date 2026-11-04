import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, GRADE_LEVELS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { SchedulesService, ScheduleSlotInput, TimetableConflictDetail } from '../../core/services/schedules.service';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { ScheduleSlot, Teacher, TermSchedules, WeeklySchedule, slotKey, teacherDisplayName } from './teacher.model';

@Component({
  selector: 'app-teacher-schedule-dialog',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule, PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-schedule-dialog.component.html',
  styleUrl: './teacher-schedule-dialog.component.css'
})
export class TeacherScheduleDialogComponent implements OnInit {
  readonly teacher = input.required<Teacher>();
  readonly teachers = input.required<Teacher[]>();
  readonly schedules = input.required<TermSchedules>();
  readonly saved = output<{ termId: string; schedule: WeeklySchedule }>();
  readonly closed = output<void>();

  private readonly calendar = inject(AcademicCalendarStore);
  private readonly schedulesService = inject(SchedulesService);

  readonly terms = this.calendar.terms;
  readonly currentTermId = this.calendar.currentTermId;
  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly sections = GRADE_LEVELS.flatMap(grade => grade.sections);
  readonly slotKey = slotKey;
  readonly displayName = teacherDisplayName;

  readonly selectedTermId = signal(this.calendar.currentTermId());
  readonly editing = signal(false);
  readonly isSaving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly conflictDetail = signal<TimetableConflictDetail | null>(null);

  private readonly savedSchedule = computed<WeeklySchedule>(() =>
    this.schedules()[this.selectedTermId()]?.[this.teacher().id] ?? {}
  );
  // Working copy; resets to the saved schedule whenever the term (or saved data) changes
  readonly draft = linkedSignal<WeeklySchedule>(() => ({ ...this.savedSchedule() }));

  readonly weeklyLoad = computed(() => Object.keys(this.draft()).length);
  readonly sectionsCount = computed(() => new Set(Object.values(this.draft()).map(slot => slot.section)).size);

  readonly previousTermSchedule = computed<WeeklySchedule | null>(() => {
    const terms = this.terms();
    const index = terms.findIndex(term => term.id === this.selectedTermId());
    const previous = index > 0 ? this.schedules()[terms[index - 1].id]?.[this.teacher().id] : undefined;
    return previous && Object.keys(previous).length ? previous : null;
  });

  // slot key -> name of the other teacher already teaching the same section in that period (local check)
  readonly conflicts = computed<Record<string, string>>(() => {
    const termSchedules = this.schedules()[this.selectedTermId()] ?? {};
    const others = this.teachers().filter(t => t.id !== this.teacher().id);
    const result: Record<string, string> = {};

    for (const [key, slot] of Object.entries(this.draft())) {
      const other = others.find(t => termSchedules[t.id]?.[key]?.section === slot.section);
      if (other) {
        result[key] = teacherDisplayName(other);
      }
    }
    return result;
  });
  readonly hasConflicts = computed(() => Object.keys(this.conflicts()).length > 0);

  // Key of the slot that caused a server-side 409 conflict
  readonly serverConflictKey = computed<string | null>(() => {
    const c = this.conflictDetail();
    if (!c) return null;
    return slotKey(c.dayOfWeek, c.period - 1);
  });

  ngOnInit(): void {
    this.fetchTeacherSchedule();
  }

  fetchTeacherSchedule(): void {
    const teacherId = this.teacher().id;
    const termId = this.selectedTermId();
    if (!teacherId) return;

    this.schedulesService.getTeacherSchedule(teacherId, termId).subscribe({
      next: res => {
        const backendSchedule = res.data?.schedule || {};
        const parsed: WeeklySchedule = {};
        for (const [key, slot] of Object.entries(backendSchedule)) {
          if (slot.className) {
            parsed[key] = {
              subject: slot.subject,
              section: slot.className
            };
          }
        }
        if (Object.keys(parsed).length > 0) {
          this.draft.set(parsed);
        }
      },
      error: () => {
        // Fall back gracefully to current draft
      }
    });
  }

  setSlot(key: string, change: Partial<ScheduleSlot>): void {
    // Clear server conflict when user changes the conflicting cell
    if (this.serverConflictKey() === key) {
      this.conflictDetail.set(null);
      this.serverError.set(null);
    }

    this.draft.update(schedule => {
      const next = { ...schedule };
      const empty: ScheduleSlot = { subject: this.teacher().subjects[0] ?? '', section: '' };
      const slot: ScheduleSlot = { ...empty, ...schedule[key], ...change };
      if (slot.section) {
        next[key] = slot;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  copyPreviousTerm(): void {
    this.draft.set({ ...this.previousTermSchedule() });
  }

  cancelEdit(): void {
    this.draft.set({ ...this.savedSchedule() });
    this.serverError.set(null);
    this.conflictDetail.set(null);
    this.editing.set(false);
  }

  save(): void {
    if (this.hasConflicts()) {
      return;
    }
    this.serverError.set(null);
    this.conflictDetail.set(null);
    this.isSaving.set(true);

    const slots: ScheduleSlotInput[] = Object.entries(this.draft()).map(([key, slot]) => ({
      slotKey: key,
      className: slot.section,
      subject: slot.subject
    }));

    this.schedulesService.saveTeacherSchedule(this.teacher().id, {
      termId: this.selectedTermId(),
      slots
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit({ termId: this.selectedTermId(), schedule: this.draft() });
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving.set(false);
        if (err.status === 409) {
          const conflict = err.error?.conflict;
          const message = err.error?.message || 'تعارض في الجدول الدراسي: تم حجز الحصة مسبقاً.';
          this.serverError.set(message);
          this.conflictDetail.set(conflict ?? null);
        } else {
          this.serverError.set(err.error?.message || 'تعذر حفظ الجدول المدرسي. تحقق من الاتصال وحاول مرة أخرى.');
        }
      }
    });
  }
}

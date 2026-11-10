import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { DAILY_PERIODS, SCHOOL_DAYS, weeklyPeriodLimit } from '../../core/constants/school.constants';
import { ToastService } from '../../core/notifications/toast.service';
import { SchedulesService, ScheduleSlotInput, TimetableConflictDetail } from '../../core/services/schedules.service';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { apiErrorMessage } from '../../shared/utils/api-error';
import { ScheduleSlot, Teacher, TermSchedules, WeeklySchedule, slotKey, teacherDisplayName } from './teacher.model';

interface ExceededLimit extends ScheduleSlot {
  count: number;
  limit: number;
}

const limitKey = (slot: ScheduleSlot) => `${slot.section}|${slot.subject}`;

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
  private readonly toast = inject(ToastService);

  readonly terms = this.calendar.terms;
  readonly currentTermId = this.calendar.currentTermId;
  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  private readonly schoolSections = inject(SchoolStructureStore).allSections;
  // Only the classes assigned to this teacher (teachers page), in the school's order
  readonly sections = computed(() => {
    const taught = new Set(this.teacher().assignments.flatMap(a => a.classes));
    const ordered = this.schoolSections().filter(section => taught.has(section));
    return [...ordered, ...[...taught].filter(section => !ordered.includes(section)).sort()];
  });
  readonly slotKey = slotKey;
  readonly displayName = teacherDisplayName;

  readonly selectedTermId = signal(this.calendar.currentTermId());
  readonly editing = signal(false);
  readonly isSaving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly conflictDetail = signal<TimetableConflictDetail | null>(null);

  // termId -> the teacher's schedule as the backend has it (fetched when the dialog opens / a term is picked)
  private readonly fetched = signal<Record<string, WeeklySchedule>>({});
  readonly loadingSchedule = signal(false);

  // What's saved: the backend's copy once fetched, else the page's copy
  private readonly savedSchedule = computed<WeeklySchedule>(() =>
    this.fetched()[this.selectedTermId()] ?? this.schedules()[this.selectedTermId()]?.[this.teacher().id] ?? {}
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

  // Class & subject pairs past their weekly periods, counting the periods other teachers give that class
  readonly exceededLimits = computed<ExceededLimit[]>(() => {
    const termSchedules = this.schedules()[this.selectedTermId()] ?? {};
    const others = Object.entries(termSchedules)
      .filter(([teacherId]) => teacherId !== this.teacher().id)
      .flatMap(([, schedule]) => Object.values(schedule));
    const mine = Object.values(this.draft());
    const countOf = (slots: ScheduleSlot[], { section, subject }: ScheduleSlot) =>
      slots.filter(s => s.section === section && s.subject === subject).length;

    const seen = new Set<string>();
    const exceeded: ExceededLimit[] = [];
    for (const slot of mine) {
      const pair = limitKey(slot);
      if (seen.has(pair)) continue;
      seen.add(pair);
      const limit = weeklyPeriodLimit(slot.section, slot.subject);
      const count = countOf(mine, slot) + countOf(others, slot);
      if (limit !== undefined && count > limit) exceeded.push({ ...slot, count, limit });
    }
    return exceeded;
  });
  private readonly exceededKeys = computed(() => new Set(this.exceededLimits().map(limitKey)));

  isOverLimit(slot: ScheduleSlot | undefined): boolean {
    return !!slot && this.exceededKeys().has(limitKey(slot));
  }

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

    this.loadingSchedule.set(true);
    this.schedulesService.getTeacherSchedule(teacherId, termId).subscribe({
      next: res => {
        const parsed: WeeklySchedule = {};
        for (const [key, slot] of Object.entries(res.data?.schedule || {})) {
          if (slot.className) {
            parsed[key] = { subject: slot.subject, section: slot.className };
          }
        }
        // Becomes the saved schedule (the draft follows it unless it's being edited)
        this.fetched.update(all => ({ ...all, [termId]: parsed }));
        this.loadingSchedule.set(false);
      },
      error: () => {
        // Keep showing the page's copy
        this.loadingSchedule.set(false);
      }
    });
  }

  /** The teacher's subjects taught to a class (all their subjects while no class is picked) */
  subjectsFor(section: string): string[] {
    const subjects = this.teacher().assignments.filter(a => a.classes.includes(section)).map(a => a.subject);
    return subjects.length ? subjects : this.teacher().subjects;
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
      // A new class keeps the subject only if the teacher teaches it to that class
      if (change.section && !change.subject) {
        const subjects = this.subjectsFor(slot.section);
        if (!subjects.includes(slot.subject)) slot.subject = subjects[0] ?? slot.subject;
      }
      if (slot.section) {
        next[key] = slot;
      } else {
        delete next[key];
      }
      return next;
    });

    const over = this.exceededLimits().find(e => limitKey(e) === limitKey(this.draft()[key] ?? { subject: '', section: '' }));
    if (over) {
      this.toast.warning(`${over.subject} لفصل ${over.section}: ${over.count} حصة والمسموح ${over.limit} فقط في الأسبوع`, 'تجاوز عدد الحصص المقرر');
    }
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
    if (this.hasConflicts() || this.exceededLimits().length) {
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
        this.fetched.update(all => ({ ...all, [this.selectedTermId()]: this.draft() }));
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
          this.serverError.set(apiErrorMessage(err, 'تعذر حفظ الجدول المدرسي. تحقق من الاتصال وحاول مرة أخرى.'));
        }
      }
    });
  }
}

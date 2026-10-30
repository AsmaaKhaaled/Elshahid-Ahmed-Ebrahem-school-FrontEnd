import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, GRADE_LEVELS, SCHOOL_DAYS } from '../../core/constants/school.constants';
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
export class TeacherScheduleDialogComponent {
  readonly teacher = input.required<Teacher>();
  readonly teachers = input.required<Teacher[]>();
  readonly schedules = input.required<TermSchedules>();
  readonly saved = output<{ termId: string; schedule: WeeklySchedule }>();
  readonly closed = output<void>();

  private readonly calendar = inject(AcademicCalendarStore);
  readonly terms = this.calendar.terms;
  readonly currentTermId = this.calendar.currentTermId;
  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly sections = GRADE_LEVELS.flatMap(grade => grade.sections);
  readonly slotKey = slotKey;
  readonly displayName = teacherDisplayName;

  readonly selectedTermId = signal(this.calendar.currentTermId());
  readonly editing = signal(false);

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

  // slot key -> name of the other teacher already teaching the same section in that period
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

  setSlot(key: string, change: Partial<ScheduleSlot>): void {
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
    this.editing.set(false);
  }

  save(): void {
    if (this.hasConflicts()) {
      return;
    }
    this.saved.emit({ termId: this.selectedTermId(), schedule: this.draft() });
    this.editing.set(false);
  }
}

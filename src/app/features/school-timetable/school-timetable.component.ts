import { ChangeDetectionStrategy, Component, computed, inject, signal, effect, untracked } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { DAILY_PERIODS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { WeeklySchedule, activeTeachers, slotKey, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { exportSchoolTimetable } from './timetable-excel';
import { TimetableLesson, WEEKLY_SLOTS, buildSchoolTimetable, findConflicts, sectionCoverage } from './timetable';

type TimetableView = 'sections' | 'teachers';

/** The whole school's timetable, assembled from each teacher's weekly schedule via API and local store. */
@Component({
  selector: 'app-school-timetable',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './school-timetable.component.html',
  styleUrl: './school-timetable.component.css'
})
export class SchoolTimetableComponent {
  private readonly teachersStore = inject(TeachersStore);
  private readonly calendar = inject(AcademicCalendarStore);

  readonly terms = this.calendar.terms;
  readonly currentTermId = this.calendar.currentTermId;
  private readonly structure = inject(SchoolStructureStore);
  readonly grades = this.structure.grades;
  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly weeklySlots = WEEKLY_SLOTS;
  readonly slotKey = slotKey;
  readonly displayName = teacherDisplayName;

  readonly view = signal<TimetableView>('sections');
  readonly selectedTermId = signal(this.calendar.currentTermId());
  readonly selectedSection = signal(this.structure.allSections()[0] ?? '');
  readonly selectedDay = signal(0);
  readonly exporting = signal(false);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  // Stopped teachers (left the school) have no periods and aren't listed
  readonly teachers = computed(() => activeTeachers(this.teachersStore.teachers()));
  readonly termLabel = computed(() => this.terms().find(term => term.id === this.selectedTermId())?.label ?? '');
  
  // One source for the view, the conflicts check and the Excel export: the teachers' schedules
  // as saved in the backend (loaded into the teachers store for the selected term)
  readonly termSchedules = computed<Record<string, WeeklySchedule>>(() => this.teachersStore.schedules()[this.selectedTermId()] ?? {});
  readonly timetable = computed(() => buildSchoolTimetable(this.teachers(), this.termSchedules(), this.structure.allSections()));
  readonly localConflicts = computed(() => findConflicts(this.timetable()));
  
  // Unified conflicts
  readonly conflicts = computed(() => {
    return this.localConflicts();
  });

  readonly coverage = computed(() => new Map(sectionCoverage(this.timetable()).map(c => [c.section, c])));

  readonly sectionSlots = computed(() => this.timetable()[this.selectedSection()] ?? {});
  readonly incompleteSections = computed(() => [...this.coverage().values()].filter(c => c.free > 0).length);

  readonly teachersWithoutSchedule = computed(() =>
    this.teachers()
      .filter(teacher => !Object.keys(this.scheduleOf(teacher.id)).length)
      .map(teacherDisplayName)
  );

  readonly conflictKeys = computed(() => new Set(this.conflicts().map(c => `${c.section}|${slotKey(c.day, c.period)}`)));

  constructor() {
    this.teachersStore.ensureLoaded();
    // Loads the selected term's schedules (again whenever another term is picked)
    effect(() => {
      const termId = this.selectedTermId();
      untracked(() => this.fetchSchedule(termId));
    });
  }

  fetchSchedule(termId: string): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.teachersStore.loadSchoolSchedule(termId).subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('تعذر تحميل الجدول المدرسي من الخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.');
      }
    });
  }

  describeLessons(lessons: TimetableLesson[]): string {
    return lessons.map(lesson => `${lesson.teacherName} (${lesson.subject})`).join(' و ');
  }

  lessonsAt(day: number, period: number): TimetableLesson[] {
    return this.sectionSlots()[slotKey(day, period)] ?? [];
  }

  scheduleOf(teacherId: string): WeeklySchedule {
    return this.termSchedules()[teacherId] ?? {};
  }

  weeklyLoad(teacherId: string): number {
    return Object.keys(this.scheduleOf(teacherId)).length;
  }

  showConflict(section: string, day: number): void {
    this.view.set('sections');
    this.selectedSection.set(section);
    this.selectedDay.set(day);
  }

  print(): void {
    window.print();
  }

  async exportExcel(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      await exportSchoolTimetable(this.termLabel(), this.teachers(), this.termSchedules(), this.timetable());
    } finally {
      this.exporting.set(false);
    }
  }
}

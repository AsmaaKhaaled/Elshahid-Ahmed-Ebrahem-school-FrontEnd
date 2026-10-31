import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, GRADE_LEVELS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { WeeklySchedule, slotKey, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { exportSchoolTimetable } from './timetable-excel';
import { ALL_SECTIONS, TimetableLesson, WEEKLY_SLOTS, buildSchoolTimetable, findConflicts, sectionCoverage } from './timetable';

type TimetableView = 'sections' | 'teachers';

/** The whole school's timetable, assembled from each teacher's weekly schedule (read-only). */
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

  constructor() {
    this.teachersStore.ensureLoaded();
  }

  readonly terms = this.calendar.terms;
  readonly currentTermId = this.calendar.currentTermId;
  readonly grades = GRADE_LEVELS;
  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly weeklySlots = WEEKLY_SLOTS;
  readonly slotKey = slotKey;
  readonly displayName = teacherDisplayName;

  readonly view = signal<TimetableView>('sections');
  readonly selectedTermId = signal(this.calendar.currentTermId());
  readonly selectedSection = signal(ALL_SECTIONS[0]);
  readonly selectedDay = signal(0);
  readonly exporting = signal(false);

  readonly teachers = this.teachersStore.teachers;
  readonly termLabel = computed(() => this.terms().find(term => term.id === this.selectedTermId())?.label ?? '');
  readonly termSchedules = computed<Record<string, WeeklySchedule>>(() => this.teachersStore.schedules()[this.selectedTermId()] ?? {});
  readonly timetable = computed(() => buildSchoolTimetable(this.teachers(), this.termSchedules()));
  readonly conflicts = computed(() => findConflicts(this.timetable()));
  readonly coverage = computed(() => new Map(sectionCoverage(this.timetable()).map(c => [c.section, c])));
  readonly sectionSlots = computed(() => this.timetable()[this.selectedSection()] ?? {});
  readonly incompleteSections = computed(() => [...this.coverage().values()].filter(c => c.free > 0).length);
  readonly teachersWithoutSchedule = computed(() =>
    this.teachers()
      .filter(teacher => !Object.keys(this.termSchedules()[teacher.id] ?? {}).length)
      .map(teacherDisplayName)
  );

  // "section|slotKey" of every conflicting slot, so the teachers view can highlight them too
  readonly conflictKeys = computed(() => new Set(this.conflicts().map(c => `${c.section}|${slotKey(c.day, c.period)}`)));

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

import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, GRADE_LEVELS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { SchedulesService, SchoolScheduleResponse } from '../../core/services/schedules.service';
import { WeeklySchedule, slotKey, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { exportSchoolTimetable } from './timetable-excel';
import { ALL_SECTIONS, TimetableLesson, WEEKLY_SLOTS, buildSchoolTimetable, findConflicts, sectionCoverage } from './timetable';

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
export class SchoolTimetableComponent implements OnInit {
  private readonly teachersStore = inject(TeachersStore);
  private readonly schedulesService = inject(SchedulesService);
  private readonly calendar = inject(AcademicCalendarStore);

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
  readonly isLoading = signal(false);
  readonly backendData = signal<SchoolScheduleResponse['data'] | null>(null);

  readonly teachers = this.teachersStore.teachers;
  readonly termLabel = computed(() => this.terms().find(term => term.id === this.selectedTermId())?.label ?? '');
  
  // Local store timetable (used as base or fallback)
  readonly termSchedules = computed<Record<string, WeeklySchedule>>(() => this.teachersStore.schedules()[this.selectedTermId()] ?? {});
  readonly timetable = computed(() => buildSchoolTimetable(this.teachers(), this.termSchedules()));
  readonly localConflicts = computed(() => findConflicts(this.timetable()));
  
  // Unified conflicts
  readonly conflicts = computed(() => {
    return this.localConflicts();
  });

  // Section coverage computed from backend if available, or local timetable
  readonly coverage = computed(() => {
    const backend = this.backendData();
    if (backend?.byClass) {
      return new Map(ALL_SECTIONS.map(section => {
        const slots = backend.byClass[section] || {};
        const filled = Object.keys(slots).length;
        return [section, { section, filled, free: WEEKLY_SLOTS - filled }];
      }));
    }
    return new Map(sectionCoverage(this.timetable()).map(c => [c.section, c]));
  });

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
    effect(() => {
      const termId = this.selectedTermId();
      this.fetchSchedule(termId);
    });
  }

  ngOnInit(): void {
    this.fetchSchedule(this.selectedTermId());
  }

  fetchSchedule(termId: string): void {
    this.isLoading.set(true);
    this.schedulesService.getSchoolSchedule(termId).subscribe({
      next: res => {
        this.backendData.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  describeLessons(lessons: TimetableLesson[]): string {
    return lessons.map(lesson => `${lesson.teacherName} (${lesson.subject})`).join(' و ');
  }

  lessonsAt(day: number, period: number): TimetableLesson[] {
    const key = slotKey(day, period);
    const backend = this.backendData();
    if (backend?.byClass) {
      const classSlots = backend.byClass[this.selectedSection()];
      const slot = classSlots?.[key];
      if (slot) {
        return [{
          teacherId: slot.teacherId,
          teacherName: slot.teacherName,
          subject: slot.subject
        }];
      }
      return [];
    }
    return this.sectionSlots()[key] ?? [];
  }

  scheduleOf(teacherId: string): WeeklySchedule {
    const backend = this.backendData();
    if (backend?.byTeacher?.[teacherId]) {
      const slots = backend.byTeacher[teacherId];
      const parsed: WeeklySchedule = {};
      for (const [key, slot] of Object.entries(slots)) {
        parsed[key] = {
          subject: slot.subject,
          section: slot.className
        };
      }
      return parsed;
    }
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

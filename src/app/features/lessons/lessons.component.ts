import { ChangeDetectionStrategy, Component, signal, computed, inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { SchedulesService, StudentLessonItem } from '../../core/services/schedules.service';
import { ScheduleSlot, WeeklySchedule, slotKey } from '../teachers/teacher.model';
import { TeachingScope } from '../teaching/teaching-scope.service';

/** One period of the teacher's day: a class to teach, or free (null) */
interface TeacherPeriod {
  period: number;
  slot: ScheduleSlot | null;
}

/** One period of the student's day: a lesson, or free (null) */
interface StudentPeriod {
  period: number;
  lesson: StudentLessonItem | null;
}

type LoadState = 'loading' | 'ready' | 'error' | 'no-class';

/** Today's index in SCHOOL_DAYS (Sunday-Thursday); the weekend shows Sunday. */
function todayIndex(): number {
  const day = new Date().getDay();
  return day < SCHOOL_DAYS.length ? day : 0;
}

/**
 * الدروس والجدول المدرسي — always the schedule the admin saved (nothing made up):
 * - Teacher: their own weekly schedule (GET /api/v1/schedules/my-schedule).
 * - Student: their class's weekly schedule (GET /api/v1/schedules/my-class).
 */
@Component({
  selector: 'app-lessons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lessons.component.html',
  styleUrl: './lessons.component.css'
})
export class LessonsComponent implements OnInit {
  readonly scope = inject(TeachingScope);
  private readonly calendar = inject(AcademicCalendarStore);
  private readonly schedulesService = inject(SchedulesService);

  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly todayIndex = todayIndex();
  readonly currentTerm = this.calendar.currentTerm;
  readonly selectedDayIndex = signal(this.todayIndex);
  readonly state = signal<LoadState>('loading');

  // ---- Teacher: own schedule ----

  readonly mySchedule = signal<WeeklySchedule>({});
  readonly hasSchedule = computed(() => Object.keys(this.mySchedule()).length > 0);

  readonly dayPeriods = computed<TeacherPeriod[]>(() => {
    const day = this.selectedDayIndex();
    const schedule = this.mySchedule();
    return this.periods.map(period => ({ period: period + 1, slot: schedule[slotKey(day, period)] ?? null }));
  });

  readonly weekStats = computed(() => {
    const schedule = this.mySchedule();
    const slots = Object.values(schedule);
    const today = this.periods.filter(p => schedule[slotKey(this.todayIndex, p)]).length;
    return { weekly: slots.length, classes: new Set(slots.map(s => s.section)).size, today };
  });

  // ---- Student: class schedule ----

  readonly classLessons = signal<StudentLessonItem[]>([]);
  readonly className = signal<string | null>(null);
  readonly hasLessons = computed(() => this.classLessons().length > 0);

  readonly studentDay = computed<StudentPeriod[]>(() => {
    const day = this.selectedDayIndex();
    const lessons = this.classLessons();
    return this.periods.map(period => ({
      period: period + 1,
      lesson: lessons.find(l => l.dayOfWeek === day && l.period === period + 1) ?? null
    }));
  });

  // e.g. 'الرياضيات' for the week grid
  lessonAt(day: number, period: number): StudentLessonItem | null {
    return this.classLessons().find(l => l.dayOfWeek === day && l.period === period + 1) ?? null;
  }

  lessonsOn(day: number): number {
    return this.classLessons().filter(l => l.dayOfWeek === day).length;
  }

  constructor() {
    this.scope.ensureLoaded();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    if (this.scope.isTeacher()) {
      this.fetchTeacherSchedule();
    } else {
      this.fetchStudentSchedule();
    }
  }

  fetchTeacherSchedule(): void {
    this.schedulesService.getMySchedule(this.calendar.currentTermId()).subscribe({
      next: res => {
        const parsed: WeeklySchedule = {};
        for (const [key, slot] of Object.entries(res.data?.schedule ?? {})) {
          if (slot.className) parsed[key] = { subject: slot.subject, section: slot.className };
        }
        this.mySchedule.set(parsed);
        this.state.set('ready');
      },
      error: () => this.state.set('error')
    });
  }

  fetchStudentSchedule(): void {
    this.schedulesService.getMyClassSchedule(this.calendar.currentTermId()).subscribe({
      next: res => {
        this.classLessons.set(res.data?.schedule ?? []);
        this.className.set(res.data?.className || null);
        this.state.set('ready');
      },
      // 404 = the student isn't enrolled in a class yet
      error: (err: unknown) => this.state.set(err instanceof HttpErrorResponse && err.status === 404 ? 'no-class' : 'error')
    });
  }

  periodsOn(day: number): number {
    return this.periods.filter(p => this.mySchedule()[slotKey(day, p)]).length;
  }

  slotAt(day: number, period: number): ScheduleSlot | null {
    return this.mySchedule()[slotKey(day, period)] ?? null;
  }
}

import { ChangeDetectionStrategy, Component, signal, computed, inject, OnInit } from '@angular/core';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { SchedulesService, StudentLessonItem } from '../../core/services/schedules.service';
import { ScheduleSlot, WeeklySchedule, slotKey } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { TeachingScope } from '../teaching/teaching-scope.service';

interface Lesson {
  id: string;
  day: string;
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  topic: string;
}

/** One period of the teacher's day: a class to teach, or free (null) */
interface TeacherPeriod {
  period: number;
  slot: ScheduleSlot | null;
}

/**
 * A demo week for teachers the admin hasn't scheduled yet, so the page isn't empty
 * before the schedules come from the backend: their own classes & subject, a few free periods a day.
 */
function demoSchedule(sections: string[], subject: string): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  if (!sections.length) return schedule;
  for (let day = 0; day < SCHOOL_DAYS.length; day++) {
    for (let period = 0; period < DAILY_PERIODS; period++) {
      if ((day + period) % 3 === 0) continue;
      schedule[slotKey(day, period)] = { subject, section: sections[(day + period) % sections.length] };
    }
  }
  return schedule;
}

/** Today's index in SCHOOL_DAYS (Sunday-Thursday); the weekend shows Sunday. */
function todayIndex(): number {
  const day = new Date().getDay();
  return day < SCHOOL_DAYS.length ? day : 0;
}

/**
 * الدروس والجدول المدرسي
 * - Teacher: their own weekly schedule, as set by admin (loaded via GET /api/v1/schedules/my-schedule).
 * - Student: their class's weekly schedule (loaded via GET /api/v1/schedules/my-class).
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
  private readonly teachersStore = inject(TeachersStore);
  private readonly calendar = inject(AcademicCalendarStore);
  private readonly schedulesService = inject(SchedulesService);

  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly todayIndex = todayIndex();
  readonly currentTerm = this.calendar.currentTerm;

  // ---- Teacher: own schedule ----

  readonly serverTeacherSchedule = signal<WeeklySchedule | null>(null);
  readonly serverStats = signal<{ today: number; weekly: number; classes: number } | null>(null);

  private readonly assigned = computed<WeeklySchedule>(
    () => this.serverTeacherSchedule() ?? this.teachersStore.schedules()[this.calendar.currentTermId()]?.[this.scope.teacherId()] ?? {}
  );

  /** True while the admin hasn't set this teacher's schedule (the demo week is shown). */
  readonly isDemoSchedule = computed(() => !Object.keys(this.assigned()).length);

  readonly mySchedule = computed<WeeklySchedule>(() =>
    this.isDemoSchedule() ? demoSchedule(this.scope.sections(), this.scope.subjects()[0] ?? '') : this.assigned()
  );

  readonly selectedDayIndex = signal(this.todayIndex);

  readonly dayPeriods = computed<TeacherPeriod[]>(() => {
    const day = this.selectedDayIndex();
    const schedule = this.mySchedule();
    return this.periods.map(period => ({ period: period + 1, slot: schedule[slotKey(day, period)] ?? null }));
  });

  readonly weekStats = computed(() => {
    if (this.serverStats()) {
      return this.serverStats()!;
    }
    const slots = Object.values(this.mySchedule());
    const today = this.periods.filter(p => this.mySchedule()[slotKey(this.todayIndex, p)]).length;
    return { weekly: slots.length, classes: new Set(slots.map(s => s.section)).size, today };
  });

  // ---- Student: class schedule from backend ----

  readonly serverStudentLessons = signal<StudentLessonItem[] | null>(null);
  readonly serverStudentClass = signal<string | null>(null);
  readonly selectedDay = signal<string>('الأحد');

  readonly lessons = signal<Lesson[]>([
    {
      id: 'l1',
      day: 'الأحد',
      period: 1,
      time: '08:00 - 08:45 AM',
      subject: 'Advanced English',
      teacher: 'أ/ نادية كمال الشربيني',
      room: 'A-101',
      topic: 'Unit 3: Technological Advancements & AI Ethics'
    },
    {
      id: 'l2',
      day: 'الأحد',
      period: 2,
      time: '08:50 - 09:35 AM',
      subject: 'Pure Mathematics',
      teacher: 'أ. د. محمود الشناوي',
      room: 'A-101',
      topic: 'Trigonometry & Polar Coordinates'
    },
    {
      id: 'l3',
      day: 'الأحد',
      period: 3,
      time: '09:40 - 10:25 AM',
      subject: 'Chemistry (لغات)',
      teacher: 'د/ شريف فؤاد',
      room: 'معمل الكيمياء الرئيسي',
      topic: 'Chemical Equilibrium & Reaction Rates'
    },
    {
      id: 'l4',
      day: 'الأحد',
      period: 4,
      time: '10:50 - 11:35 AM',
      subject: 'اللغة العربية',
      teacher: 'الشيخ عبد الرحمن طه',
      room: 'A-101',
      topic: 'النحو: المشتقات وإعمال اسم الفاعل'
    },
    {
      id: 'l5',
      day: 'الأحد',
      period: 5,
      time: '11:40 - 12:25 PM',
      subject: 'French Language',
      teacher: 'مدام جيهان سليم',
      room: 'A-101',
      topic: 'Le subjonctif présent et expression de l\'opinion'
    }
  ]);

  readonly dailyLessons = computed<Lesson[]>(() => {
    const serverLessons = this.serverStudentLessons();
    if (serverLessons && serverLessons.length > 0) {
      const selectedDayName = this.selectedDay();
      const filtered = serverLessons.filter(l => l.dayName === selectedDayName);
      if (filtered.length > 0) {
        return filtered.map(l => ({
          id: l.id || `lesson-${l.dayOfWeek}-${l.period}`,
          day: l.dayName,
          period: l.period,
          time: l.time || '08:00 - 08:45 AM',
          subject: l.subject,
          teacher: l.teacherName,
          room: l.room || 'قاعة الفصل',
          topic: l.topic || `مادة ${l.subject}`
        }));
      }
    }
    return this.lessons().filter(l => l.day === this.selectedDay());
  });

  constructor() {
    this.scope.ensureLoaded();
  }

  ngOnInit(): void {
    if (this.scope.isTeacher()) {
      this.fetchTeacherSchedule();
    } else {
      this.fetchStudentSchedule();
    }
  }

  fetchTeacherSchedule(): void {
    this.schedulesService.getMySchedule(this.calendar.currentTermId()).subscribe({
      next: res => {
        const schedule = res.data?.schedule || {};
        if (Object.keys(schedule).length > 0) {
          const parsed: WeeklySchedule = {};
          for (const [key, slot] of Object.entries(schedule)) {
            parsed[key] = {
              subject: slot.subject,
              section: slot.className
            };
          }
          this.serverTeacherSchedule.set(parsed);
          this.serverStats.set({
            today: res.data.todayPeriodsCount ?? 0,
            weekly: res.data.weeklyLoad ?? Object.keys(parsed).length,
            classes: res.data.classesCount ?? new Set(Object.values(parsed).map(s => s.section)).size
          });
        }
      },
      error: () => { }
    });
  }

  fetchStudentSchedule(): void {
    this.schedulesService.getMyClassSchedule(this.calendar.currentTermId()).subscribe({
      next: res => {
        if (res.data?.schedule?.length) {
          this.serverStudentLessons.set(res.data.schedule);
          this.serverStudentClass.set(res.data.className || null);
        }
      },
      error: () => { }
    });
  }

  periodsOn(day: number): number {
    return this.periods.filter(p => this.mySchedule()[slotKey(day, p)]).length;
  }

  slotAt(day: number, period: number): ScheduleSlot | null {
    return this.mySchedule()[slotKey(day, period)] ?? null;
  }
}

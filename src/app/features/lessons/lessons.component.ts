import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { DAILY_PERIODS, SCHOOL_DAYS } from '../../core/constants/school.constants';
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
 * - Teacher: their own weekly schedule, as the admin set it in هيئة التدريس (same data as the school timetable).
 * - Student: their class's lessons of the day.
 */
@Component({
  selector: 'app-lessons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lessons.component.html',
  styleUrl: './lessons.component.css'
})
export class LessonsComponent {
  readonly scope = inject(TeachingScope);
  private readonly teachersStore = inject(TeachersStore);
  private readonly calendar = inject(AcademicCalendarStore);

  constructor() {
    this.scope.ensureLoaded();
  }

  readonly days = SCHOOL_DAYS;
  readonly periods = Array.from({ length: DAILY_PERIODS }, (_, i) => i);
  readonly todayIndex = todayIndex();
  readonly currentTerm = this.calendar.currentTerm;

  // ---- Teacher: own schedule ----

  private readonly assigned = computed<WeeklySchedule>(
    () => this.teachersStore.schedules()[this.calendar.currentTermId()]?.[this.scope.teacherId()] ?? {}
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
    const slots = Object.values(this.mySchedule());
    const today = this.periods.filter(p => this.mySchedule()[slotKey(this.todayIndex, p)]).length;
    return { weekly: slots.length, classes: new Set(slots.map(s => s.section)).size, today };
  });

  periodsOn(day: number): number {
    return this.periods.filter(p => this.mySchedule()[slotKey(day, p)]).length;
  }

  slotAt(day: number, period: number): ScheduleSlot | null {
    return this.mySchedule()[slotKey(day, period)] ?? null;
  }

  // ---- Student: the class's lessons (mock until the class timetable comes from the backend) ----

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

  readonly dailyLessons = computed(() => {
    return this.lessons().filter(l => l.day === this.selectedDay());
  });
}

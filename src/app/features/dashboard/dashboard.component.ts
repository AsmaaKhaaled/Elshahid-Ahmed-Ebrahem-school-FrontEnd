import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore, today } from '../../core/academic/academic-calendar.store';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { AdminRouteAccess } from '../../core/admin/admin-permissions';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { GRADE_LEVELS, SCHOOL_INFO, SCHOOL_SUBJECTS } from '../../core/constants/school.constants';
import { TermEndAlertComponent } from '../../shared/components/term-end-alert/term-end-alert.component';
import { BarListChartComponent, BarListItem } from '../../shared/components/charts/bar-list-chart.component';
import { DonutChartComponent, DonutItem } from '../../shared/components/charts/donut-chart.component';
import { AnnouncementsStore } from '../announcements/announcements.store';
import { MyClass } from '../classes/my-class.model';
import { MyClassesService } from '../classes/my-classes.service';
import { ClassesStore } from '../classes/classes.store';
import { currentAdvisor } from '../classes/school-class.model';
import { ExamsStore, formatTime } from '../exams/exams.store';
import { WEEKLY_SLOTS, buildSchoolTimetable, findConflicts, sectionCoverage } from '../school-timetable/timetable';
import { StudentsStore } from '../students/students.store';
import { gradeLabel, gradeOfSection } from '../subjects/curriculum.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TEACHER_STATUSES, WeeklySchedule, activeTeachers, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { StudentDashboardComponent } from './student-dashboard.component';

interface StatTile {
  title: string;
  value: string | number;
  note: string;
  // 'warn' when the note asks for action
  tone: 'ok' | 'warn' | 'neutral';
  iconBg: string;
  iconColor: string;
  // SVG path data, drawn in the template (no [innerHTML], so Angular keeps it)
  iconPaths: string[];
  link: string;
  access: AdminRouteAccess;
}

interface FollowUp {
  text: string;
  link: string;
  access: AdminRouteAccess;
}

// One of the teacher's subjects with the classes they teach it to
interface TeachingGroup {
  subject: string;
  classes: { name: string; gradeLabel: string; roomNumber: string; studentCount: number | null }[];
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'EXAM' | 'ATTENDANCE' | 'ASSIGNMENT' | 'ANNOUNCEMENT';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ArabicDatePipe, TermEndAlertComponent, BarListChartComponent, DonutChartComponent, StudentDashboardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  readonly school = SCHOOL_INFO;
  readonly today = new Date();

  readonly isTeacher = computed(() => this.authService.userRole() === 'TEACHER');
  readonly isStudent = computed(() => ['STUDENT', 'PARENT'].includes(this.authService.userRole() ?? ''));
  readonly isSuperAdmin = computed(() => this.authService.isSuperAdmin());
  readonly isAdmin = computed(() => this.authService.isAdmin());
  readonly teacherProfile = computed(() => this.authService.teacherProfile());

  // ---- The teacher: their classes, subject by subject (as the admin assigned them) ----
  private readonly scope = inject(TeachingScope);
  private readonly myClassesService = inject(MyClassesService);
  // Room & students of each class, from the backend
  private readonly myClasses = signal<MyClass[]>([]);

  readonly teachingGroups = computed<TeachingGroup[]>(() => {
    const details = new Map(this.myClasses().map(cls => [cls.name, cls]));
    return this.scope
      .subjectAssignments()
      .filter(a => a.classes.length)
      .map(a => ({
        subject: a.subject,
        classes: a.classes.map(name => ({
          name,
          gradeLabel: gradeLabel(gradeOfSection(name)),
          roomNumber: details.get(name)?.roomNumber ?? '',
          studentCount: details.get(name)?.studentCount ?? null
        }))
      }));
  });

  // A class taking two of the teacher's subjects counts once
  readonly taughtClassCount = computed(() => new Set(this.teachingGroups().flatMap(g => g.classes.map(c => c.name))).size);

  // e.g. "اللغة العربية والتربية الدينية" (the department until subjects are assigned)
  readonly teacherSubjectsLabel = computed(() => {
    const subjects = this.teachingGroups().map(g => g.subject);
    return subjects.length ? subjects.join(' و') : this.teacherProfile()?.specialization ?? '';
  });

  // ---- Admin overview: everything below is computed from the data entered in the system ----
  private readonly studentsStore = inject(StudentsStore);
  private readonly teachersStore = inject(TeachersStore);
  private readonly classesStore = inject(ClassesStore);
  private readonly examsStore = inject(ExamsStore);
  private readonly announcementsStore = inject(AnnouncementsStore);
  private readonly calendar = inject(AcademicCalendarStore);
  private readonly structure = inject(SchoolStructureStore);

  constructor() {
    this.teachersStore.ensureLoaded();
    if (this.isTeacher()) {
      this.myClassesService.getClasses().subscribe({ next: classes => this.myClasses.set(classes), error: () => {} });
    }
  }

  readonly formatTime = formatTime;
  readonly currentTerm = this.calendar.currentTerm;
  readonly latestAnnouncements = this.announcementsStore.latest;

  // Teachers still at the school (stopped ones left it: not counted, scheduled or advisors)
  private readonly currentTeachers = computed(() => activeTeachers(this.teachersStore.teachers()));

  private readonly termSchedules = computed<Record<string, WeeklySchedule>>(
    () => this.teachersStore.schedules()[this.calendar.currentTermId()] ?? {}
  );
  private readonly timetable = computed(() => buildSchoolTimetable(this.currentTeachers(), this.termSchedules(), this.structure.allSections()));
  private readonly coverage = computed(() => sectionCoverage(this.timetable()));
  private readonly conflicts = computed(() => findConflicts(this.timetable()));

  private readonly teacherCounts = computed(() => {
    const teachers = this.currentTeachers();
    return Object.fromEntries(TEACHER_STATUSES.map(status => [status, teachers.filter(t => t.status === status).length]));
  });

  private readonly advisorGaps = computed(() => {
    const year = this.calendar.currentYear();
    const teachersById = new Map(this.currentTeachers().map(t => [t.id, t]));
    const missing: string[] = [];
    const onLeave: string[] = [];
    for (const cls of this.classesStore.classes()) {
      const teacher = teachersById.get(currentAdvisor(cls, year)?.teacherId ?? '');
      if (!teacher) missing.push(cls.section);
      else if (teacher.status !== 'على رأس العمل') onLeave.push(cls.section);
    }
    return { missing, onLeave };
  });

  private readonly timetableCompletion = computed(() => {
    const coverage = this.coverage();
    const filled = coverage.reduce((sum, c) => sum + c.filled, 0);
    const total = coverage.length * WEEKLY_SLOTS;
    return { percent: total ? Math.round((filled / total) * 100) : 0, free: total - filled };
  });

  readonly adminStats = computed<StatTile[]>(() => {
    const students = this.studentsStore.metrics();
    const teachers = this.currentTeachers().length;
    const counts = this.teacherCounts();
    const away = teachers - counts['على رأس العمل'];
    const gaps = this.advisorGaps();
    const completion = this.timetableCompletion();
    return [
      {
        title: 'الطلاب المقيدين',
        value: students.total,
        note: students.inactive ? `${students.regular} منتظم • ${students.inactive} غير منتظم` : 'كلهم منتظمين',
        tone: 'neutral',
        iconBg: 'bg-blue-50',
        iconColor: 'text-primary-700',
        iconPaths: ['M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'],
        link: '/students',
        access: 'students'
      },
      {
        title: 'هيئة التدريس',
        value: teachers,
        note: away ? `${counts['على رأس العمل']} على رأس العمل • ${away} إجازة / انتداب` : 'الكل على رأس العمل',
        tone: away ? 'warn' : 'ok',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-700',
        iconPaths: ['M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2'],
        link: '/teachers',
        access: 'teachers'
      },
      {
        title: 'الفصول الدراسية',
        value: this.classesStore.classes().length,
        note: gaps.missing.length ? `${gaps.missing.length} فصل بدون رائد` : 'كل الفصول لها رائد',
        tone: gaps.missing.length ? 'warn' : 'ok',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-700',
        iconPaths: ['M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'],
        link: '/classes',
        access: 'classes'
      },
      {
        title: 'اكتمال الجدول المدرسي',
        value: `${completion.percent}%`,
        note: completion.free ? `${completion.free} حصة فارغة في الفصول` : 'كل الحصص مُسندة',
        tone: completion.free ? 'warn' : 'ok',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-700',
        iconPaths: ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
        link: '/school-timetable',
        access: 'teachers'
      }
    ];
  });

  // Weekly periods per teacher, heaviest first
  readonly teacherLoad = computed<BarListItem[]>(() => {
    const schedules = this.termSchedules();
    return this.currentTeachers()
      .map(teacher => ({
        label: teacherDisplayName(teacher),
        value: Object.keys(schedules[teacher.id] ?? {}).length,
        hint: teacher.status === 'على رأس العمل' ? teacher.specialization : `${teacher.specialization} • ${teacher.status}`
      }))
      .sort((a, b) => b.value - a.value);
  });

  // Fixed subject order, so each subject keeps its color
  readonly subjectPeriods = computed<DonutItem[]>(() => {
    const counts = new Map<string, number>(SCHOOL_SUBJECTS.map(subject => [subject, 0]));
    for (const schedule of Object.values(this.termSchedules())) {
      for (const slot of Object.values(schedule)) {
        counts.set(slot.subject, (counts.get(slot.subject) ?? 0) + 1);
      }
    }
    return [...counts].map(([label, value]) => ({ label, value }));
  });

  readonly studentsByGrade = computed<BarListItem[]>(() => {
    const students = this.studentsStore.students();
    return GRADE_LEVELS.map(grade => ({
      label: grade.shortLabel,
      value: students.filter(s => s.gradeId === grade.id).length
    }));
  });

  readonly teacherStatuses = computed(() => {
    const counts = this.teacherCounts();
    return TEACHER_STATUSES.map(status => ({ status, count: counts[status] }));
  });

  readonly upcomingExams = computed(() => {
    const from = today();
    const termId = this.calendar.currentTermId();
    return this.examsStore
      .schedules()
      .filter(schedule => schedule.termId === termId)
      .flatMap(schedule =>
        schedule.entries
          .filter(entry => entry.date >= from)
          .map(entry => ({
            ...entry,
            grade: GRADE_LEVELS.find(g => g.id === schedule.gradeId)?.shortLabel ?? '',
            title: schedule.title,
            published: schedule.published
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 4);
  });

  readonly followUps = computed<FollowUp[]>(() => {
    const items: FollowUp[] = [];
    const conflicts = this.conflicts().length;
    if (conflicts) {
      items.push({ text: `${conflicts} تعارض في الجدول المدرسي (معلمين في نفس الفصل ونفس الحصة)`, link: '/school-timetable', access: 'teachers' });
    }
    const incomplete = this.coverage().filter(c => c.free > 0);
    if (incomplete.length) {
      items.push({ text: `${incomplete.length} فصل جدوله ناقص حصص`, link: '/school-timetable', access: 'teachers' });
    }
    const { missing, onLeave } = this.advisorGaps();
    if (missing.length) {
      items.push({ text: `فصول بدون رائد: ${missing.join('، ')}`, link: '/classes', access: 'classes' });
    }
    if (onLeave.length) {
      items.push({ text: `رائد الفصل في إجازة أو منتدب: ${onLeave.join('، ')}`, link: '/classes', access: 'classes' });
    }
    const noSchedule = this.teacherLoad().filter(t => t.value === 0).length;
    if (noSchedule) {
      items.push({ text: `${noSchedule} معلم بدون جدول حصص`, link: '/teachers', access: 'teachers' });
    }
    return items;
  });

  canOpen(access: AdminRouteAccess): boolean {
    return this.authService.canAccessAdminSection(access);
  }

  // ---- Teacher dashboard (demo data until the teacher's own schedule comes from the backend) ----
  readonly todaySchedule = signal([
    {
      id: '1',
      periodNumber: '1',
      subject: 'اللغة الإنجليزية',
      teacher: 'مستر أحمد عبد السلام',
      className: 'فصل 1/1',
      time: '08:00 - 08:45 AM',
      status: 'جارية الآن',
      statusBadgeClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: '2',
      periodNumber: '2',
      subject: 'الرياضيات',
      teacher: 'أ/ سامي نبيل',
      className: 'فصل 2/2',
      time: '08:50 - 09:35 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      id: '3',
      periodNumber: '3',
      subject: 'العلوم',
      teacher: 'د/ شريف فؤاد',
      className: 'فصل 3/1',
      time: '09:40 - 10:25 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      id: '4',
      periodNumber: '4',
      subject: 'اللغة العربية والتربية الإسلامية',
      teacher: 'الشيخ عبد الرحمن طه',
      className: 'فصل 1/2',
      time: '10:50 - 11:35 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    }
  ]);

  readonly activities = signal<ActivityItem[]>([
    {
      id: 'a1',
      title: 'إعلان جدول امتحانات نصف العام 2026/2027',
      description: 'تم اعتماد جدول امتحانات الفصل الدراسي الأول من قِبل إدارة المدرسة والكنترول.',
      time: 'منذ 15 دقيقة',
      type: 'ANNOUNCEMENT'
    },
    {
      id: 'a2',
      title: 'اكتمال حصر غياب الطابور الصباحي',
      description: 'تم توثيق حضور 96.8% من الطلاب في كافة المراحل التعليمية بنجاح.',
      time: 'منذ ساعة',
      type: 'ATTENDANCE'
    },
    {
      id: 'a3',
      title: 'طرح واجب العلوم',
      description: 'أضاف قسم العلوم واجباً لطلاب الصف الثاني الإعدادي.',
      time: 'منذ ساعتين',
      type: 'ASSIGNMENT'
    }
  ]);
}


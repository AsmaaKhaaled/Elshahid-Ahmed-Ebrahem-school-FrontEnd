import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { GRADE_LEVELS, MAX_CLASS_CAPACITY } from '../../core/constants/school.constants';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { Teacher, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { ClassAdvisorDialogComponent } from './class-advisor-dialog.component';
import { AdvisorAssignment, SchoolClass, currentAdvisor } from './school-class.model';

type AdvisorState =
  | { kind: 'active'; teacher: Teacher; since: string }
  | { kind: 'on-leave'; teacher: Teacher; since: string }
  | { kind: 'removed' }
  | { kind: 'unassigned'; previous: Teacher | null };

@Component({
  selector: 'app-classes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe, ClassAdvisorDialogComponent],
  templateUrl: './classes.component.html',
  styleUrl: './classes.component.css'
})
export class ClassesComponent {
  private readonly teachersStore = inject(TeachersStore);
  private readonly authService = inject(AuthService);

  readonly year = inject(AcademicCalendarStore).currentYear;
  readonly capacity = MAX_CLASS_CAPACITY;
  readonly displayName = teacherDisplayName;
  readonly teachers = this.teachersStore.teachers;

  readonly selectedTab = signal<string>('ALL');
  readonly advisorClass = signal<SchoolClass | null>(null);

  readonly canManage = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  readonly gradeTabs = [
    { id: 'ALL', label: 'كافة الصفوف' },
    ...GRADE_LEVELS.map(g => ({ id: g.label, label: g.shortLabel }))
  ];

  readonly classes = signal<SchoolClass[]>([
    seedClass('c1', '1/1', 0, 42, ['5', '5']),
    seedClass('c2', '1/2', 0, 41, ['4', '4']),
    seedClass('c3', '1/3', 0, 40, ['3', '3']),
    seedClass('c4', '1/4', 0, 39, ['7', '6']),
    seedClass('c5', '2/1', 1, 43, ['1', '1']),
    seedClass('c6', '2/2', 1, 42, ['7', '7']),
    seedClass('c7', '2/3', 1, 40, ['8', '8']),
    seedClass('c8', '2/4', 1, 47, ['9', '9']),
    seedClass('c9', '3/1', 2, 44, ['2', '2']),
    seedClass('c10', '3/2', 2, 43, ['10', '10']),
    seedClass('c11', '3/3', 2, 41, ['11', '11']),
    // No advisor yet for the current year (e.g. right after the new year starts)
    seedClass('c12', '3/4', 2, 42, ['12'])
  ]);

  readonly filteredClasses = computed(() => {
    const tab = this.selectedTab();
    if (tab === 'ALL') return this.classes();
    return this.classes().filter(c => c.gradeLevel === tab);
  });

  readonly advisorStates = computed(() => {
    const teachersById = new Map(this.teachers().map(t => [t.id, t]));
    const states: Record<string, AdvisorState> = {};

    for (const cls of this.classes()) {
      const active = currentAdvisor(cls, this.year());
      if (!active) {
        const previousId = cls.advisorHistory.at(-1)?.teacherId;
        states[cls.id] = { kind: 'unassigned', previous: (previousId && teachersById.get(previousId)) || null };
        continue;
      }
      const teacher = teachersById.get(active.teacherId);
      if (!teacher) {
        states[cls.id] = { kind: 'removed' };
      } else {
        const kind = teacher.status === 'على رأس العمل' ? 'active' : 'on-leave';
        states[cls.id] = { kind, teacher, since: active.since };
      }
    }
    return states;
  });

  advisorsElsewhere(classId: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const cls of this.classes()) {
      const active = currentAdvisor(cls, this.year());
      if (cls.id !== classId && active) {
        result[active.teacherId] = cls.section;
      }
    }
    return result;
  }

  assignAdvisor(classId: string, assignment: AdvisorAssignment): void {
    this.classes.update(list =>
      list.map(cls => (cls.id === classId ? { ...cls, advisorHistory: [...cls.advisorHistory, assignment] } : cls))
    );
    this.advisorClass.set(null);
  }
}

// Demo data - advisors: [2025/2026 advisor, 2026/2027 advisor?]
function seedClass(id: string, section: string, gradeIndex: number, enrolledStudents: number, advisors: string[]): SchoolClass {
  const [previousYearTeacher, currentYearTeacher] = advisors;
  const history: AdvisorAssignment[] = [
    { teacherId: previousYearTeacher, year: '2025/2026', since: '2025-09-20', reason: 'بداية عام دراسي جديد' }
  ];
  if (currentYearTeacher) {
    history.push({ teacherId: currentYearTeacher, year: '2026/2027', since: '2026-09-19', reason: 'بداية عام دراسي جديد' });
  }
  return {
    id,
    section,
    gradeLevel: GRADE_LEVELS[gradeIndex].label,
    enrolledStudents,
    shift: 'صباحي',
    advisorHistory: history
  };
}

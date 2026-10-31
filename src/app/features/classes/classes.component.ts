import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { GRADE_LEVELS, MAX_CLASS_CAPACITY } from '../../core/constants/school.constants';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { Teacher, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { ClassAdvisorDialogComponent } from './class-advisor-dialog.component';
import { ClassesStore } from './classes.store';
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
  private readonly classesStore = inject(ClassesStore);

  constructor() {
    this.teachersStore.ensureLoaded();
  }

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

  readonly classes = this.classesStore.classes;

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
    this.classesStore.assignAdvisor(classId, assignment);
    this.advisorClass.set(null);
  }
}

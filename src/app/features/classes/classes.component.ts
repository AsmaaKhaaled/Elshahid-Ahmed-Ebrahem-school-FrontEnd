import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { GradeSetup, SchoolStructureStore } from '../../core/academic/school-structure.store';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { Teacher, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { ClassAdvisorDialogComponent } from './class-advisor-dialog.component';
import { ClassStructureDialogComponent } from './class-structure-dialog.component';
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
  imports: [ArabicDatePipe, ClassAdvisorDialogComponent, ClassStructureDialogComponent],
  templateUrl: './classes.component.html',
  styleUrl: './classes.component.css'
})
export class ClassesComponent {
  private readonly teachersStore = inject(TeachersStore);
  private readonly authService = inject(AuthService);
  private readonly classesStore = inject(ClassesStore);
  private readonly structure = inject(SchoolStructureStore);

  constructor() {
    this.teachersStore.ensureLoaded();
    this.classesStore.loadEnrollment();
  }

  readonly year = inject(AcademicCalendarStore).currentYear;
  readonly displayName = teacherDisplayName;

  // ---- This year's setup: classes per grade & capacity ----

  readonly setup = this.structure.setup;
  readonly setupOpen = signal(false);
  readonly savingSetup = signal(false);
  readonly setupError = signal<string | null>(null);

  readonly gradeSummaries = computed(() =>
    this.setup().map(g => ({ ...g, label: GRADE_LEVELS[g.grade - 1]?.shortLabel ?? `الصف ${g.grade}` }))
  );

  openSetup(): void {
    this.setupError.set(null);
    this.setupOpen.set(true);
  }

  saveSetup(setup: GradeSetup[]): void {
    this.savingSetup.set(true);
    this.setupError.set(null);
    this.structure.save(setup).subscribe({
      next: () => {
        this.savingSetup.set(false);
        this.setupOpen.set(false);
        this.classesStore.loadEnrollment();
      },
      error: (err: unknown) => {
        this.savingSetup.set(false);
        const message = err instanceof HttpErrorResponse && typeof err.error?.message === 'string' ? err.error.message : null;
        this.setupError.set(
          err instanceof HttpErrorResponse && err.status === 0
            ? 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.'
            : message ?? 'تعذر حفظ إعدادات الفصول. حاول مرة أخرى.'
        );
      }
    });
  }
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

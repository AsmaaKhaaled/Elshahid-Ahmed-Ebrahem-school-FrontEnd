import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { sectionsLabel } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { CurriculumFileDialogComponent } from './curriculum-file-dialog.component';
import { CurriculumFormDialogComponent } from './curriculum-form-dialog.component';
import { CurriculumPlan, CurriculumPlanDialogComponent } from './curriculum-plan-dialog.component';
import { CURRICULUM_FILE_KINDS, Curriculum, CurriculumFile, curriculumKinds, gradeLabel } from './curriculum.model';
import { CurriculumStore } from './curriculum.store';

type PendingDelete = { type: 'curriculum' | 'file'; id: string } | null;

/**
 * المناهج والمواد الدراسية: each teacher uploads the ministry curriculum of their own subjects
 * (the textbook, the plan, sample exams... as files or links); a student gets their class's.
 */
@Component({
  selector: 'app-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimeAgoPipe, TeachingFilesComponent, CurriculumFormDialogComponent, CurriculumFileDialogComponent, CurriculumPlanDialogComponent],
  templateUrl: './curriculum.component.html'
})
export class CurriculumComponent {
  private readonly store = inject(CurriculumStore);
  private readonly teachersStore = inject(TeachersStore);
  readonly scope = inject(TeachingScope);

  constructor() {
    this.scope.ensureLoaded();
  }

  readonly gradeLabel = gradeLabel;
  readonly sectionsLabel = sectionsLabel;
  readonly kindsOf = curriculumKinds;
  readonly fileKinds = CURRICULUM_FILE_KINDS;

  readonly curricula = this.store.visible;
  readonly selectedId = signal<string | null>(null);
  readonly selected = computed(() => this.curricula().find(c => c.id === this.selectedId()) ?? null);

  // Dialogs
  readonly formOpen = signal(false);
  readonly editingCurriculum = signal<Curriculum | null>(null);
  readonly presetSubject = signal('');
  readonly fileDialogOpen = signal(false);
  readonly planDialogOpen = signal(false);
  readonly pendingDelete = signal<PendingDelete>(null);

  /** The plan & objectives are for the teacher and the administration, not the students. */
  readonly showPlan = computed(() => !this.scope.isStudent());

  private readonly teacherNames = computed(() => new Map(this.teachersStore.teachers().map(t => [t.id, teacherDisplayName(t)])));

  /** Who keeps a curriculum (shown to the administration, which sees every teacher's). */
  teacherName(id: string): string {
    return this.teacherNames().get(id) ?? '';
  }

  /** The teacher's subjects that have no curriculum yet. */
  readonly subjectsWithoutCurriculum = computed(() => {
    if (!this.scope.isTeacher()) return [];
    const started = new Set(this.curricula().map(c => c.subject));
    return this.scope.subjects().filter(s => !started.has(s));
  });

  /** The selected curriculum's files, grouped by kind. */
  readonly fileGroups = computed(() => {
    const files = this.selected()?.files ?? [];
    return this.fileKinds.map(kind => ({ kind, files: files.filter(f => f.kind === kind.id) })).filter(g => g.files.length);
  });

  open(id: string): void {
    this.selectedId.set(id);
    this.pendingDelete.set(null);
  }

  back(): void {
    this.selectedId.set(null);
    this.pendingDelete.set(null);
  }

  // ---- Teacher actions ----

  openForm(curriculum: Curriculum | null, subject = ''): void {
    this.editingCurriculum.set(curriculum);
    this.presetSubject.set(subject);
    this.formOpen.set(true);
  }

  saveCurriculum(curriculum: Curriculum): void {
    this.store.save(curriculum);
    this.formOpen.set(false);
    this.selectedId.set(curriculum.id);
  }

  addFile(file: CurriculumFile): void {
    const curriculum = this.selected();
    if (curriculum) this.store.addFile(curriculum.id, file);
    this.fileDialogOpen.set(false);
  }

  savePlan({ plan, planFile }: CurriculumPlan): void {
    const curriculum = this.selected();
    if (curriculum) this.store.savePlan(curriculum.id, plan, planFile);
    this.planDialogOpen.set(false);
  }

  isPendingDelete(type: 'curriculum' | 'file', id: string): boolean {
    const pending = this.pendingDelete();
    return pending?.type === type && pending.id === id;
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    const curriculum = this.selected();
    if (!pending || !curriculum) return;
    if (pending.type === 'curriculum') {
      this.store.delete(curriculum.id);
      this.selectedId.set(null);
    } else {
      this.store.deleteFile(curriculum.id, pending.id);
    }
    this.pendingDelete.set(null);
  }
}

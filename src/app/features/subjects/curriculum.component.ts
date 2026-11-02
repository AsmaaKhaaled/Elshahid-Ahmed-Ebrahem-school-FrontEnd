import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { Material, sectionsLabel } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TeachingStore } from '../teaching/teaching.store';
import { CurriculumFileDialogComponent } from './curriculum-file-dialog.component';
import { CurriculumFormDialogComponent } from './curriculum-form-dialog.component';
import { CurriculumUnitDialogComponent } from './curriculum-unit-dialog.component';
import {
  CURRICULUM_FILE_KINDS, Curriculum, CurriculumFile, CurriculumUnit, curriculumProgress, gradeLabel, lastTaughtLesson
} from './curriculum.model';
import { CurriculumStore } from './curriculum.store';

type PendingDelete = { type: 'curriculum' | 'unit' | 'file'; id: string } | null;

/**
 * المناهج والمواد الدراسية: each teacher keeps the ministry curriculum of their own subjects
 * (units, lessons taught so far, official files); a student follows their class's curricula.
 */
@Component({
  selector: 'app-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimeAgoPipe, TeachingFilesComponent, CurriculumFormDialogComponent, CurriculumUnitDialogComponent, CurriculumFileDialogComponent],
  templateUrl: './curriculum.component.html'
})
export class CurriculumComponent {
  private readonly store = inject(CurriculumStore);
  private readonly teachingStore = inject(TeachingStore);
  readonly scope = inject(TeachingScope);

  constructor() {
    this.scope.ensureLoaded();
  }

  readonly gradeLabel = gradeLabel;
  readonly sectionsLabel = sectionsLabel;
  readonly progressOf = curriculumProgress;
  readonly lastTaught = lastTaughtLesson;
  readonly fileKinds = CURRICULUM_FILE_KINDS;

  readonly curricula = this.store.visible;
  readonly selectedId = signal<string | null>(null);
  readonly selected = computed(() => this.curricula().find(c => c.id === this.selectedId()) ?? null);

  // Dialogs
  readonly formOpen = signal(false);
  readonly editingCurriculum = signal<Curriculum | null>(null);
  readonly presetSubject = signal('');
  readonly unitDialogOpen = signal(false);
  readonly editingUnit = signal<CurriculumUnit | null>(null);
  readonly fileDialogOpen = signal(false);
  readonly pendingDelete = signal<PendingDelete>(null);

  /** The teacher's subjects that have no curriculum yet. */
  readonly subjectsWithoutCurriculum = computed(() => {
    if (!this.scope.isTeacher()) return [];
    const started = new Set(this.curricula().map(c => c.subject));
    return this.scope.subjects().filter(s => !started.has(s));
  });

  /** Materials (from المواد التعليمية) linked to each lesson. */
  readonly materialsByLesson = computed(() => {
    const map = new Map<string, Material[]>();
    for (const m of this.teachingStore.visibleMaterials()) {
      if (m.lessonId) map.set(m.lessonId, [...(map.get(m.lessonId) ?? []), m]);
    }
    return map;
  });

  /** The selected curriculum's files, grouped by kind. */
  readonly fileGroups = computed(() => {
    const files = this.selected()?.files ?? [];
    return this.fileKinds.map(kind => ({ kind, files: files.filter(f => f.kind === kind.id) })).filter(g => g.files.length);
  });

  unitDone(unit: CurriculumUnit): number {
    return unit.lessons.filter(l => l.doneAt).length;
  }

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

  openUnit(unit: CurriculumUnit | null): void {
    this.editingUnit.set(unit);
    this.unitDialogOpen.set(true);
  }

  saveUnit(unit: CurriculumUnit): void {
    const curriculum = this.selected();
    if (curriculum) this.store.saveUnit(curriculum.id, unit);
    this.unitDialogOpen.set(false);
  }

  toggleLesson(lessonId: string): void {
    const curriculum = this.selected();
    if (curriculum && this.scope.isTeacher()) this.store.toggleLesson(curriculum.id, lessonId);
  }

  addFile(file: CurriculumFile): void {
    const curriculum = this.selected();
    if (curriculum) this.store.addFile(curriculum.id, file);
    this.fileDialogOpen.set(false);
  }

  isPendingDelete(type: 'curriculum' | 'unit' | 'file', id: string): boolean {
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
    } else if (pending.type === 'unit') {
      this.store.deleteUnit(curriculum.id, pending.id);
    } else {
      this.store.deleteFile(curriculum.id, pending.id);
    }
    this.pendingDelete.set(null);
  }
}

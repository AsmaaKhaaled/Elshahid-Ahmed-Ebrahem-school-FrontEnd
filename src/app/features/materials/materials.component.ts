import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { Material, sectionsLabel } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TeachingStore } from '../teaching/teaching.store';
import { CurriculumStore } from '../subjects/curriculum.store';
import { MaterialFormDialogComponent } from './material-form-dialog.component';

const ALL_SUBJECTS = 'الكل';

/** Lesson materials: a teacher uploads to their classes, a student downloads their class's. */
@Component({
  selector: 'app-materials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TimeAgoPipe, TeachingFilesComponent, MaterialFormDialogComponent],
  templateUrl: './materials.component.html'
})
export class MaterialsComponent {
  private readonly store = inject(TeachingStore);
  private readonly curriculumStore = inject(CurriculumStore);
  readonly scope = inject(TeachingScope);

  constructor() {
    this.scope.ensureLoaded();
  }

  // lessonId -> lesson title, for the "درس من المنهج" line
  readonly lessonTitles = computed(
    () => new Map(this.curriculumStore.curricula().flatMap(c => c.units.flatMap(u => u.lessons.map(l => [l.id, l.title] as const))))
  );

  readonly sectionsLabel = sectionsLabel;
  readonly allSubjects = ALL_SUBJECTS;

  readonly searchQuery = signal('');
  readonly selectedSubject = signal(ALL_SUBJECTS);
  readonly formOpen = signal(false);
  readonly editing = signal<Material | null>(null);
  readonly confirmingDeleteId = signal<string | null>(null);

  readonly subjectTabs = computed(() => {
    const materials = this.store.visibleMaterials();
    const subjects = [...new Set(materials.map(m => m.subject))];
    return [
      { id: ALL_SUBJECTS, count: materials.length },
      ...subjects.map(subject => ({ id: subject, count: materials.filter(m => m.subject === subject).length }))
    ];
  });

  readonly filteredMaterials = computed(() => {
    const subject = this.selectedSubject();
    const q = this.searchQuery().trim();
    return this.store.visibleMaterials().filter(
      m => (subject === ALL_SUBJECTS || m.subject === subject) && (!q || m.title.includes(q) || m.description.includes(q))
    );
  });

  openForm(material: Material | null): void {
    this.editing.set(material);
    this.formOpen.set(true);
  }

  saveMaterial(material: Material): void {
    this.store.saveMaterial(material);
    this.formOpen.set(false);
  }

  deleteMaterial(id: string): void {
    this.store.deleteMaterial(id);
    this.confirmingDeleteId.set(null);
  }
}

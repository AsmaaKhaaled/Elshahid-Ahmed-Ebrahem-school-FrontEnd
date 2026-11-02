import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, MAX_FILE_MB, Material, VIDEO_UPLOAD_SOON, readPickedFiles } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { CurriculumStore } from '../subjects/curriculum.store';

@Component({
  selector: 'app-material-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './material-form-dialog.component.html'
})
export class MaterialFormDialogComponent implements OnInit {
  readonly scope = inject(TeachingScope);
  private readonly curriculumStore = inject(CurriculumStore);

  // null = new material
  readonly material = input<Material | null>(null);
  readonly saved = output<Material>();
  readonly closed = output<void>();

  readonly accept = FILE_ACCEPT;
  readonly maxMb = MAX_FILE_MB;
  readonly videoSoon = VIDEO_UPLOAD_SOON;
  readonly fileError = signal('');
  readonly contentError = signal(false);
  readonly lock = submitLock();

  draft: Material = {
    id: '',
    title: '',
    description: '',
    subject: '',
    teacherId: '',
    sections: [],
    files: [],
    link: '',
    lessonId: '',
    publishedAt: ''
  };

  /** Curriculum lessons of the chosen subject, to link the material to one. */
  lessonOptions(): { id: string; title: string; unit: string }[] {
    return this.draft.subject ? this.curriculumStore.lessonsFor(this.draft.subject) : [];
  }

  ngOnInit(): void {
    const material = this.material();
    if (material) {
      this.draft = { ...material, sections: [...material.sections], files: [...material.files], link: material.link ?? '', lessonId: material.lessonId ?? '' };
    } else {
      // A teacher of one subject doesn't have to pick it
      const subjects = this.scope.subjects();
      this.draft.subject = subjects.length === 1 ? subjects[0] : '';
    }
  }

  onFilesSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    this.draft.files = [...this.draft.files, ...files];
    this.contentError.set(false);
  }

  removeFile(index: number): void {
    this.draft.files = this.draft.files.filter((_, i) => i !== index);
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    // A material needs something to open: a file or a link
    const link = this.draft.link?.trim() ?? '';
    this.contentError.set(!this.draft.files.length && !link);
    if (form.invalid || this.contentError()) {
      form.control.markAllAsTouched();
      return;
    }
    // Drop a lesson left over from another subject
    const lessonId = this.lessonOptions().some(l => l.id === this.draft.lessonId) ? this.draft.lessonId : undefined;
    this.lock.run(() =>
      this.saved.emit({
        ...this.draft,
        title: this.draft.title.trim(),
        description: this.draft.description.trim(),
        link: link || undefined,
        lessonId,
        id: this.draft.id || crypto.randomUUID(),
        teacherId: this.draft.teacherId || this.scope.teacherId(),
        publishedAt: this.draft.publishedAt || new Date().toISOString()
      })
    );
  }
}

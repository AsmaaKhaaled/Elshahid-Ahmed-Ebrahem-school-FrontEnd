import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, MAX_FILE_MB, TeachingFile, readPickedFiles } from '../teaching/teaching.model';
import { CURRICULUM_FILE_KINDS, CurriculumFileKind, NewCurriculumFile } from './curriculum.model';

/** Adds one piece of the ministry curriculum: an uploaded file (textbook, plan, sample exams...) or a link to it. */
@Component({
  selector: 'app-curriculum-file-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curriculum-file-dialog.component.html'
})
export class CurriculumFileDialogComponent {
  // While the file uploads, and the server's answer if it fails
  readonly saving = input(false);
  readonly serverError = input<string | null>(null);
  readonly saved = output<NewCurriculumFile>();
  readonly closed = output<void>();

  readonly kinds = CURRICULUM_FILE_KINDS;
  readonly accept = FILE_ACCEPT;
  readonly maxMb = MAX_FILE_MB;
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });
  readonly fileError = signal('');

  kind: CurriculumFileKind = 'book';
  title = '';
  forStudents = true;
  source: 'file' | 'link' = 'file';
  file: TeachingFile | null = null;
  link = '';

  // The teacher's guide is for the teacher; everything else is shared by default
  selectKind(kind: CurriculumFileKind): void {
    this.kind = kind;
    this.forStudents = kind !== 'guide';
  }

  onFileSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    if (!files.length) return;
    this.file = files[0];
    // Default title: the file name without its extension
    if (!this.title.trim()) this.title = files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    const byLink = this.source === 'link';
    const missingFile = !byLink && !this.file?.blob;
    if (missingFile) this.fileError.set('اختار الملف اللي هترفعه');
    if (form.invalid || missingFile) {
      form.control.markAllAsTouched();
      return;
    }
    const content = byLink ? { link: this.link.trim() } : { file: this.file!.blob };
    this.lock.run(() => this.saved.emit({ kind: this.kind, title: this.title.trim(), forStudents: this.forStudents, ...content }));
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, TeachingFile, readPickedFiles } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { Assignment, AssignmentSubmission, AssignmentsStore, assignmentStatus } from './assignments.store';

/** Student side: open an assignment and hand in the answer (files and / or a note). */
@Component({
  selector: 'app-assignment-submit-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, PortalToBodyDirective, SubmitLockDirective, ArabicDatePipe, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-submit-dialog.component.html'
})
export class AssignmentSubmitDialogComponent implements OnInit {
  private readonly store = inject(AssignmentsStore);
  private readonly scope = inject(TeachingScope);

  readonly assignment = input.required<Assignment>();
  readonly submitted = output<AssignmentSubmission>();
  readonly closed = output<void>();

  readonly accept = FILE_ACCEPT;
  readonly fileError = signal('');
  readonly emptyError = signal(false);
  readonly lock = submitLock();

  readonly previous = computed(() => this.store.mySubmission(this.assignment().id));
  // Re-submitting is allowed until the due date, as long as the teacher hasn't graded it
  readonly canSubmit = computed(
    () => assignmentStatus(this.assignment()) === 'نشط ومتاح' && this.previous()?.score == null
  );

  files: TeachingFile[] = [];
  note = '';

  ngOnInit(): void {
    const previous = this.previous();
    if (previous) {
      this.files = [...previous.files];
      this.note = previous.note;
    }
  }

  onFilesSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    this.files = [...this.files, ...files];
    this.emptyError.set(false);
  }

  removeFile(index: number): void {
    this.files = this.files.filter((_, i) => i !== index);
  }

  submit(): void {
    if (this.lock.busy()) return;
    const note = this.note.trim();
    this.emptyError.set(!this.files.length && !note);
    if (this.emptyError()) return;
    this.lock.run(() =>
      this.submitted.emit({
        id: this.previous()?.id ?? crypto.randomUUID(),
        assignmentId: this.assignment().id,
        studentId: this.scope.studentId(),
        studentName: this.scope.studentName(),
        files: this.files,
        note,
        submittedAt: new Date().toISOString(),
        score: null,
        feedback: ''
      })
    );
  }
}

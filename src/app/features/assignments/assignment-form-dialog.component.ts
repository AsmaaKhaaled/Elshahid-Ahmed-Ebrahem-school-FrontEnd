import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, TeachingFile, readPickedFiles } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { Assignment, AssignmentFormResult } from './assignments.store';

/** <input type="datetime-local"> value in local time, e.g. "2026-11-05T20:00" */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

@Component({
  selector: 'app-assignment-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-form-dialog.component.html'
})
export class AssignmentFormDialogComponent implements OnInit {
  readonly scope = inject(TeachingScope);

  // null = new assignment (may go to several classes at once)
  readonly assignment = input<Assignment | null>(null);
  readonly saving = input(false);
  readonly saved = output<AssignmentFormResult>();
  readonly closed = output<void>();

  readonly accept = FILE_ACCEPT;
  readonly minDue = toLocalInput(new Date().toISOString());
  readonly fileError = signal('');
  readonly lock = submitLock({ saving: this.saving });

  title = '';
  description = '';
  subject = '';
  sections: string[] = [];
  // Tomorrow 8 PM by default
  dueDate = toLocalInput(new Date(new Date().setHours(44, 0, 0, 0)).toISOString());
  maxScore = 10;
  requiresSubmission = true;
  attachments: TeachingFile[] = [];

  ngOnInit(): void {
    const assignment = this.assignment();
    if (assignment) {
      this.title = assignment.title;
      this.description = assignment.description;
      this.subject = assignment.subject;
      this.sections = [assignment.section];
      this.dueDate = toLocalInput(assignment.dueDate);
      this.maxScore = assignment.maxScore;
      this.requiresSubmission = assignment.requiresSubmission;
      this.attachments = [...assignment.attachments];
    } else {
      const subjects = this.scope.subjects();
      this.subject = subjects.length === 1 ? subjects[0] : '';
    }
  }

  onFilesSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    this.attachments = [...this.attachments, ...files];
  }

  removeFile(index: number): void {
    this.attachments = this.attachments.filter((_, i) => i !== index);
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() =>
      this.saved.emit({
        draft: {
          title: this.title.trim(),
          description: this.description.trim(),
          subject: this.subject,
          dueDate: new Date(this.dueDate).toISOString(),
          maxScore: this.maxScore,
          requiresSubmission: this.requiresSubmission
        },
        sections: this.sections,
        attachments: this.attachments
      })
    );
  }
}

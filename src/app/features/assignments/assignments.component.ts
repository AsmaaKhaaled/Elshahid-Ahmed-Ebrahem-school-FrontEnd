import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { AssignmentFormDialogComponent } from './assignment-form-dialog.component';
import { AssignmentSubmissionsDialogComponent } from './assignment-submissions-dialog.component';
import { AssignmentSubmitDialogComponent } from './assignment-submit-dialog.component';
import { Assignment, AssignmentAnswer, AssignmentFormResult, AssignmentSubmission, AssignmentsStore, assignmentStatus, submissionRate } from './assignments.store';

// Below this submission rate an assignment is flagged for follow-up
const LOW_SUBMISSION_RATE = 0.6;

/**
 * Assignments page of the teacher & student portals (not part of the admin panel).
 * A teacher publishes to their classes and grades the submissions; a student hands in their answer.
 */
@Component({
  selector: 'app-assignments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe, TimeAgoPipe, AssignmentFormDialogComponent, AssignmentSubmitDialogComponent, AssignmentSubmissionsDialogComponent],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css'
})
export class AssignmentsComponent {
  private readonly assignmentsStore = inject(AssignmentsStore);
  readonly scope = inject(TeachingScope);

  constructor() {
    this.scope.ensureLoaded();
    this.assignmentsStore.load();
  }

  readonly statusOf = assignmentStatus;
  readonly rateOf = submissionRate;
  readonly lowRate = LOW_SUBMISSION_RATE;

  readonly filteredAssignments = this.assignmentsStore.visible;

  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Assignment | null>(null);
  readonly reviewing = signal<Assignment | null>(null);
  readonly opened = signal<Assignment | null>(null);
  readonly confirmingDeleteId = signal<string | null>(null);

  // Student: what's still to hand in on the platform
  readonly pendingCount = computed(
    () => this.filteredAssignments().filter(a => a.requiresSubmission && this.statusOf(a) === 'نشط ومتاح' && !this.mySubmission(a)).length
  );

  mySubmission(assignment: Assignment): AssignmentSubmission | undefined {
    return this.assignmentsStore.mySubmission(assignment.id);
  }

  openForm(assignment: Assignment | null): void {
    this.editing.set(assignment);
    this.formOpen.set(true);
  }

  /** Errors are announced by the notify interceptor; the dialog stays open to try again. */
  publish(result: AssignmentFormResult): void {
    const existing = this.editing();
    this.saving.set(true);
    (existing ? this.assignmentsStore.update(existing, result) : this.assignmentsStore.create(result)).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  deleteAssignment(id: string): void {
    this.assignmentsStore.remove(id).subscribe({
      next: () => this.confirmingDeleteId.set(null),
      error: () => this.confirmingDeleteId.set(null)
    });
  }

  submit(assignment: Assignment, answer: AssignmentAnswer): void {
    this.saving.set(true);
    this.assignmentsStore.submit(assignment.id, answer).subscribe({
      next: () => {
        this.saving.set(false);
        this.opened.set(null);
      },
      error: () => this.saving.set(false)
    });
  }
}

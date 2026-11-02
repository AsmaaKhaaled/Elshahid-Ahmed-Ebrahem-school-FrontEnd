import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { AssignmentFormDialogComponent } from './assignment-form-dialog.component';
import { AssignmentSubmissionsDialogComponent } from './assignment-submissions-dialog.component';
import { AssignmentSubmitDialogComponent } from './assignment-submit-dialog.component';
import { Assignment, AssignmentSubmission, AssignmentsStore, assignmentStatus, submissionRate } from './assignments.store';

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
  }

  readonly statusOf = assignmentStatus;
  readonly rateOf = submissionRate;
  readonly lowRate = LOW_SUBMISSION_RATE;

  readonly filteredAssignments = this.assignmentsStore.visible;

  readonly formOpen = signal(false);
  readonly editing = signal<Assignment | null>(null);
  readonly reviewing = signal<Assignment | null>(null);
  readonly opened = signal<Assignment | null>(null);
  readonly confirmingDeleteId = signal<string | null>(null);

  // Student: what's still to hand in
  readonly pendingCount = computed(
    () => this.filteredAssignments().filter(a => this.statusOf(a) === 'نشط ومتاح' && !this.mySubmission(a)).length
  );

  mySubmission(assignment: Assignment): AssignmentSubmission | undefined {
    return this.assignmentsStore.mySubmission(assignment.id);
  }

  ungradedCount(assignment: Assignment): number {
    return this.assignmentsStore.submissionsOf(assignment.id).filter(s => s.score == null).length;
  }

  openForm(assignment: Assignment | null): void {
    this.editing.set(assignment);
    this.formOpen.set(true);
  }

  publish(assignments: Assignment[]): void {
    this.assignmentsStore.publish(assignments);
    this.formOpen.set(false);
  }

  deleteAssignment(id: string): void {
    this.assignmentsStore.delete(id);
    this.confirmingDeleteId.set(null);
  }

  submit(submission: AssignmentSubmission): void {
    this.assignmentsStore.submit(submission);
    this.opened.set(null);
  }
}

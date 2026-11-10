import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { Assignment, AssignmentSubmission, AssignmentsStore } from './assignments.store';

/** Teacher side: the submissions of one assignment, graded one by one. */
@Component({
  selector: 'app-assignment-submissions-dialog',
  standalone: true,
  imports: [FormsModule, PortalToBodyDirective, TimeAgoPipe, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-submissions-dialog.component.html'
})
export class AssignmentSubmissionsDialogComponent implements OnInit {
  private readonly store = inject(AssignmentsStore);

  readonly assignment = input.required<Assignment>();
  readonly closed = output<void>();

  readonly loading = this.store.loadingSubmissions;
  readonly submissions = computed(() => this.store.submissionsOf(this.assignment().id));
  readonly ungraded = computed(() => this.submissions().filter(s => s.score == null).length);

  // submissionId -> the score / feedback being typed
  readonly drafts = signal<Record<string, { score: number | null; feedback: string }>>({});
  readonly savedId = signal<string | null>(null);
  readonly savingId = signal<string | null>(null);

  ngOnInit(): void {
    this.store.loadSubmissions(this.assignment().id);
  }

  draftOf(submission: AssignmentSubmission): { score: number | null; feedback: string } {
    return this.drafts()[submission.id] ?? { score: submission.score, feedback: submission.feedback };
  }

  setDraft(submission: AssignmentSubmission, change: Partial<{ score: number | null; feedback: string }>): void {
    this.drafts.update(all => ({ ...all, [submission.id]: { ...this.draftOf(submission), ...change } }));
    this.savedId.set(null);
  }

  isValidScore(score: number | null): boolean {
    return score != null && score >= 0 && score <= this.assignment().maxScore;
  }

  saveGrade(submission: AssignmentSubmission): void {
    const draft = this.draftOf(submission);
    if (!this.isValidScore(draft.score) || this.savingId()) return;
    this.savingId.set(submission.id);
    this.store.grade(submission, draft.score!, draft.feedback.trim()).subscribe({
      next: () => {
        this.savingId.set(null);
        this.savedId.set(submission.id);
      },
      error: () => this.savingId.set(null)
    });
  }
}

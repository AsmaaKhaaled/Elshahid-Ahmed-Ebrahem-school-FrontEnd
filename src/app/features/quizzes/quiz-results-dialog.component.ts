import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { Quiz, QuizAttempt } from '../teaching/teaching.model';
import { TeachingStore } from '../teaching/teaching.store';

/** Teacher side: who solved a quiz and their scores; file quizzes are graded here. */
@Component({
  selector: 'app-quiz-results-dialog',
  standalone: true,
  imports: [FormsModule, PortalToBodyDirective, TimeAgoPipe, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-results-dialog.component.html'
})
export class QuizResultsDialogComponent {
  private readonly store = inject(TeachingStore);

  readonly quiz = input.required<Quiz>();
  readonly closed = output<void>();

  readonly sectionFilter = signal('');

  readonly attempts = computed(() =>
    this.store
      .attemptsOf(this.quiz().id)
      .filter(a => !this.sectionFilter() || a.section === this.sectionFilter())
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  );

  readonly stats = computed(() => {
    const graded = this.attempts().filter(a => a.score != null);
    const total = this.quiz().totalMarks;
    const average = graded.length ? graded.reduce((sum, a) => sum + a.score!, 0) / graded.length : 0;
    return {
      count: this.attempts().length,
      ungraded: this.attempts().length - graded.length,
      average: Math.round(average * 10) / 10,
      passed: graded.filter(a => a.score! >= total / 2).length
    };
  });

  // attemptId -> score being typed (file quizzes)
  readonly drafts = signal<Record<string, number | null>>({});

  draftOf(attempt: QuizAttempt): number | null {
    return attempt.id in this.drafts() ? this.drafts()[attempt.id] : attempt.score;
  }

  setDraft(attempt: QuizAttempt, score: number | null): void {
    this.drafts.update(all => ({ ...all, [attempt.id]: score }));
  }

  isValidScore(score: number | null): boolean {
    return score != null && score >= 0 && score <= this.quiz().totalMarks;
  }

  saveGrade(attempt: QuizAttempt): void {
    const score = this.draftOf(attempt);
    if (!this.isValidScore(score)) return;
    this.store.gradeAttempt(attempt.id, score!);
    this.drafts.update(({ [attempt.id]: _saved, ...rest }) => rest);
  }
}

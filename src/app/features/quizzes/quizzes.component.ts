import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { AssessmentKind, Quiz, QuizAttempt, isClosed, sectionsLabel } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TeachingStore } from '../teaching/teaching.store';
import { QuizFormDialogComponent } from './quiz-form-dialog.component';
import { QuizResultsDialogComponent } from './quiz-results-dialog.component';
import { QuizTakeDialogComponent } from './quiz-take-dialog.component';

type KindFilter = 'الكل' | AssessmentKind;

/**
 * Quizzes & short exams set by the teacher - solved online (auto-graded) or as an uploaded paper.
 * The official term exams stay in "الاختبارات والتقييم" (scheduled by the administration).
 */
@Component({
  selector: 'app-quizzes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe, TimeAgoPipe, QuizFormDialogComponent, QuizTakeDialogComponent, QuizResultsDialogComponent],
  templateUrl: './quizzes.component.html'
})
export class QuizzesComponent {
  private readonly store = inject(TeachingStore);
  readonly scope = inject(TeachingScope);

  constructor() {
    this.scope.ensureLoaded();
  }

  readonly isClosed = isClosed;
  readonly sectionsLabel = sectionsLabel;
  readonly kindFilters: KindFilter[] = ['الكل', 'كويز', 'اختبار'];

  readonly selectedKind = signal<KindFilter>('الكل');
  readonly formOpen = signal(false);
  readonly editing = signal<Quiz | null>(null);
  readonly viewingResults = signal<Quiz | null>(null);
  readonly taking = signal<Quiz | null>(null);
  readonly confirmingDeleteId = signal<string | null>(null);

  readonly filteredQuizzes = computed(() => {
    const kind = this.selectedKind();
    return this.store.visibleQuizzes().filter(q => kind === 'الكل' || q.kind === kind);
  });

  // Student: open quizzes not solved yet
  readonly pendingCount = computed(
    () => this.store.visibleQuizzes().filter(q => !isClosed(q) && !this.store.myAttempt(q.id)).length
  );

  attemptsCount(quiz: Quiz): number {
    return this.store.attemptsOf(quiz.id).length;
  }

  ungradedCount(quiz: Quiz): number {
    return this.store.attemptsOf(quiz.id).filter(a => a.score == null).length;
  }

  myAttempt(quiz: Quiz): QuizAttempt | undefined {
    return this.store.myAttempt(quiz.id);
  }

  openForm(quiz: Quiz | null): void {
    this.editing.set(quiz);
    this.formOpen.set(true);
  }

  saveQuiz(quiz: Quiz): void {
    this.store.saveQuiz(quiz);
    this.formOpen.set(false);
  }

  deleteQuiz(id: string): void {
    this.store.deleteQuiz(id);
    this.confirmingDeleteId.set(null);
  }

  submitAttempt(attempt: QuizAttempt): void {
    this.store.submitAttempt(attempt);
  }
}

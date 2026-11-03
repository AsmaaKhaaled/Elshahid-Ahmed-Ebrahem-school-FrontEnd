import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, Quiz, QuizAttempt, TRUE_FALSE, TeachingFile, gradeAnswers, isClosed, readPickedFiles } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TeachingStore } from '../teaching/teaching.store';

/** Arabic option letters for the multiple-choice answers */
const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

/**
 * Student side: solve an online quiz (timed, auto-graded) or upload the answer sheet of a file quiz.
 * Once an online quiz starts it switches to a full-screen exam view: one question at a time,
 * a question map with flags for review, and a summary to confirm before handing in.
 */
@Component({
  selector: 'app-quiz-take-dialog',
  standalone: true,
  imports: [PortalToBodyDirective, ArabicDatePipe, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-take-dialog.component.html'
})
export class QuizTakeDialogComponent implements OnInit {
  private readonly store = inject(TeachingStore);
  private readonly scope = inject(TeachingScope);
  private readonly destroyRef = inject(DestroyRef);

  readonly quiz = input.required<Quiz>();
  readonly submitted = output<QuizAttempt>();
  readonly closed = output<void>();

  readonly trueFalse = TRUE_FALSE;
  readonly letters = OPTION_LETTERS;
  readonly accept = FILE_ACCEPT;
  readonly fileError = signal('');
  readonly formError = signal('');

  readonly attempt = computed(() => this.store.myAttempt(this.quiz().id));
  readonly closedForAnswers = computed(() => isClosed(this.quiz()));
  // The correct answers are shown once the quiz is closed, so they don't leak to classmates
  readonly showAnswers = computed(() => !!this.attempt() && this.closedForAnswers());

  // Online quiz: started -> answering; the timer runs from the start
  readonly started = signal(false);
  readonly secondsLeft = signal<number | null>(null);
  readonly timeLabel = computed(() => {
    const s = this.secondsLeft();
    return s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  /** The full-screen exam view: an online quiz that's started and not handed in yet */
  readonly examMode = computed(() => this.quiz().mode === 'online' && this.started() && !this.attempt());

  readonly answers = signal<Record<string, string>>({});
  readonly flagged = signal<ReadonlySet<string>>(new Set());
  readonly current = signal(0);
  readonly confirming = signal(false);

  readonly question = computed(() => this.quiz().questions[this.current()]);
  readonly answeredCount = computed(() => this.quiz().questions.filter(q => this.isAnswered(q.id)).length);
  readonly unansweredCount = computed(() => this.quiz().questions.length - this.answeredCount());
  readonly progress = computed(() => {
    const total = this.quiz().questions.length;
    return total ? Math.round((this.answeredCount() / total) * 100) : 0;
  });

  answerFile: TeachingFile | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => clearInterval(this.timer));
  }

  start(): void {
    this.started.set(true);
    const minutes = this.quiz().durationMinutes;
    if (!minutes) return;
    this.secondsLeft.set(minutes * 60);
    this.timer = setInterval(() => {
      const left = (this.secondsLeft() ?? 0) - 1;
      this.secondsLeft.set(Math.max(0, left));
      // Time's up: whatever was answered is handed in
      if (left <= 0) {
        clearInterval(this.timer);
        this.submit(true);
      }
    }, 1000);
  }

  isAnswered(questionId: string): boolean {
    return !!this.answers()[questionId]?.trim();
  }

  answer(questionId: string, value: string): void {
    this.answers.update(all => ({ ...all, [questionId]: value }));
  }

  toggleFlag(questionId: string): void {
    this.flagged.update(set => {
      const next = new Set(set);
      if (!next.delete(questionId)) next.add(questionId);
      return next;
    });
  }

  goTo(index: number): void {
    const count = this.quiz().questions.length;
    this.current.set(Math.min(Math.max(index, 0), count - 1));
  }

  isCorrect(questionId: string, attempt: QuizAttempt): boolean {
    const question = this.quiz().questions.find(q => q.id === questionId);
    return !!question && gradeAnswers({ ...this.quiz(), questions: [question] }, attempt.answers) === question.points;
  }

  onFileSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    if (files.length) {
      this.answerFile = files[0];
      this.formError.set('');
    }
  }

  /**
   * Hands the attempt in. An online quiz goes through the summary first (confirming), where the
   * student sees what's unanswered or flagged; unanswered questions score zero.
   */
  submit(timeUp = false): void {
    if (this.attempt()) return;
    const quiz = this.quiz();
    if (quiz.mode === 'file' && !this.answerFile) {
      this.formError.set('ارفع ورقة الحل الأول');
      return;
    }
    clearInterval(this.timer);
    this.confirming.set(false);
    this.formError.set('');
    const answers = quiz.mode === 'online' ? { ...this.answers() } : {};
    // The dialog stays open on the result: once stored, attempt() is set and the exam view closes
    this.submitted.emit({
      id: crypto.randomUUID(),
      quizId: quiz.id,
      studentId: this.scope.studentId(),
      studentName: this.scope.studentName(),
      section: this.scope.studentSection(),
      submittedAt: new Date().toISOString(),
      answers,
      file: this.answerFile,
      score: quiz.mode === 'online' ? gradeAnswers(quiz, answers) : null
    });
    if (timeUp) this.formError.set('خلص الوقت واتسلّم اللي جاوبته');
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, Quiz, QuizAttempt, TRUE_FALSE, TeachingFile, gradeAnswers, isClosed, readPickedFiles } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TeachingStore } from '../teaching/teaching.store';

/** Student side: solve an online quiz (timed, auto-graded) or upload the answer sheet of a file quiz. */
@Component({
  selector: 'app-quiz-take-dialog',
  standalone: true,
  imports: [FormsModule, PortalToBodyDirective, ArabicDatePipe, TeachingFilesComponent],
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

  answers: Record<string, string> = {};
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

  answeredCount(): number {
    return Object.values(this.answers).filter(a => a?.trim()).length;
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

  submit(timeUp = false): void {
    if (this.attempt()) return;
    const quiz = this.quiz();
    if (quiz.mode === 'file' && !this.answerFile) {
      this.formError.set('ارفع ورقة الحل الأول');
      return;
    }
    if (quiz.mode === 'online' && !timeUp && this.answeredCount() < quiz.questions.length) {
      this.formError.set(`فاضل ${quiz.questions.length - this.answeredCount()} سؤال من غير إجابة`);
      return;
    }
    clearInterval(this.timer);
    this.formError.set('');
    // The dialog stays open on the result: once stored, attempt() is set and the form is gone
    this.submitted.emit({
      id: crypto.randomUUID(),
      quizId: quiz.id,
      studentId: this.scope.studentId(),
      studentName: this.scope.studentName(),
      section: this.scope.studentSection(),
      submittedAt: new Date().toISOString(),
      answers: quiz.mode === 'online' ? { ...this.answers } : {},
      file: this.answerFile,
      score: quiz.mode === 'online' ? gradeAnswers(quiz, this.answers) : null
    });
  }
}

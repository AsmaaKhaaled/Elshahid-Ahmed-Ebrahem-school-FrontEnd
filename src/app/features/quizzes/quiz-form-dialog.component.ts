import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { toLocalInput } from '../assignments/assignment-form-dialog.component';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import {
  ASSESSMENT_KINDS,
  AssessmentKind,
  AssessmentMode,
  FILE_ACCEPT,
  QUESTION_TYPES,
  QuestionType,
  Quiz,
  QuizQuestion,
  TRUE_FALSE,
  TeachingFile,
  questionsTotal,
  readPickedFiles
} from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';

function newQuestion(type: QuestionType): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    text: '',
    options: type === 'mcq' ? ['', '', '', ''] : [],
    answer: type === 'truefalse' ? TRUE_FALSE[0] : '',
    points: 1
  };
}

/** Teacher side: build an online quiz (auto-graded) or upload a quiz / exam paper. */
@Component({
  selector: 'app-quiz-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-form-dialog.component.html'
})
export class QuizFormDialogComponent implements OnInit {
  readonly scope = inject(TeachingScope);

  // null = new quiz
  readonly quiz = input<Quiz | null>(null);
  // Answers already submitted: the questions can't change anymore (it would break the grading)
  readonly locked = input(false);
  readonly saved = output<Quiz>();
  readonly closed = output<void>();

  readonly kinds = ASSESSMENT_KINDS;
  readonly questionTypes = QUESTION_TYPES;
  readonly trueFalse = TRUE_FALSE;
  readonly accept = FILE_ACCEPT;
  readonly total = questionsTotal;
  readonly fileError = signal('');
  readonly contentError = signal('');
  readonly lock = submitLock();

  kind: AssessmentKind = 'كويز';
  mode: AssessmentMode = 'online';
  title = '';
  instructions = '';
  subject = '';
  sections: string[] = [];
  closesAt = toLocalInput(new Date(Date.now() + 3 * 24 * 3600000).toISOString());
  durationMinutes: number | null = 15;
  questions: QuizQuestion[] = [newQuestion('mcq')];
  file: TeachingFile | undefined;
  fileMarks = 10;

  readonly minClose = toLocalInput(new Date().toISOString());

  ngOnInit(): void {
    const quiz = this.quiz();
    if (quiz) {
      this.kind = quiz.kind;
      this.mode = quiz.mode;
      this.title = quiz.title;
      this.instructions = quiz.instructions;
      this.subject = quiz.subject;
      this.sections = [...quiz.sections];
      this.closesAt = toLocalInput(quiz.closesAt);
      this.durationMinutes = quiz.durationMinutes;
      this.questions = quiz.questions.map(q => ({ ...q, options: [...q.options] }));
      this.file = quiz.file;
      this.fileMarks = quiz.mode === 'file' ? quiz.totalMarks : 10;
      if (!this.questions.length) this.questions = [newQuestion('mcq')];
    } else {
      const subjects = this.scope.subjects();
      this.subject = subjects.length === 1 ? subjects[0] : '';
    }
  }

  setMode(mode: AssessmentMode): void {
    if (this.locked()) return;
    this.mode = mode;
    this.contentError.set('');
  }

  addQuestion(type: QuestionType): void {
    this.questions = [...this.questions, newQuestion(type)];
    this.contentError.set('');
  }

  removeQuestion(id: string): void {
    this.questions = this.questions.filter(q => q.id !== id);
  }

  addOption(question: QuizQuestion): void {
    question.options = [...question.options, ''];
  }

  removeOption(question: QuizQuestion, index: number): void {
    if (question.answer === question.options[index]) question.answer = '';
    question.options = question.options.filter((_, i) => i !== index);
  }

  // Keeps the correct answer pointing at the same option while its text is edited
  setOption(question: QuizQuestion, index: number, text: string): void {
    if (question.answer && question.answer === question.options[index]) question.answer = text;
    question.options = question.options.map((option, i) => (i === index ? text : option));
  }

  onFileSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    if (files.length) {
      this.file = files[0];
      this.contentError.set('');
    }
  }

  private validateContent(): string {
    if (this.mode === 'file') return this.file ? '' : 'ارفع ورقة الأسئلة';
    if (!this.questions.length) return 'ضيف سؤال واحد على الأقل';
    for (const [i, q] of this.questions.entries()) {
      const n = i + 1;
      if (!q.text.trim()) return `اكتب نص السؤال رقم ${n}`;
      if (!(q.points > 0)) return `حدد درجة السؤال رقم ${n}`;
      if (q.type === 'mcq') {
        const options = q.options.map(o => o.trim()).filter(Boolean);
        if (options.length < 2) return `السؤال رقم ${n} محتاج اختيارين على الأقل`;
        if (new Set(options).size !== options.length) return `في اختيارات مكررة في السؤال رقم ${n}`;
        if (!q.answer.trim() || !options.includes(q.answer.trim())) return `اختار الإجابة الصح للسؤال رقم ${n}`;
      }
      if (!q.answer.trim()) return `اكتب الإجابة الصح للسؤال رقم ${n}`;
    }
    return '';
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    this.contentError.set(this.validateContent());
    if (form.invalid || this.contentError()) {
      form.control.markAllAsTouched();
      return;
    }
    const existing = this.quiz();
    const online = this.mode === 'online';
    const questions = online
      ? this.questions.map(q => ({
          ...q,
          text: q.text.trim(),
          answer: q.answer.trim(),
          options: q.type === 'mcq' ? q.options.map(o => o.trim()).filter(Boolean) : []
        }))
      : [];
    this.lock.run(() =>
      this.saved.emit({
        id: existing?.id ?? crypto.randomUUID(),
        kind: this.kind,
        mode: this.mode,
        title: this.title.trim(),
        instructions: this.instructions.trim(),
        subject: this.subject,
        teacherId: existing?.teacherId ?? this.scope.teacherId(),
        sections: this.sections,
        publishedAt: existing?.publishedAt ?? new Date().toISOString(),
        closesAt: new Date(this.closesAt).toISOString(),
        durationMinutes: online ? this.durationMinutes || null : null,
        questions,
        file: online ? undefined : this.file,
        totalMarks: online ? questionsTotal(questions) : this.fileMarks
      })
    );
  }
}

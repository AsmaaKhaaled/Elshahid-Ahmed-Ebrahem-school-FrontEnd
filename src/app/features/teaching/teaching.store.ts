import { Injectable, computed, inject, signal } from '@angular/core';
import { Material, Quiz, QuizAttempt } from './teaching.model';
import { TeachingScope } from './teaching-scope.service';

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MB = 1024 * 1024;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

/**
 * Lesson materials, quizzes & exams published by teachers, and the students' attempts.
 * A teacher publishes straight to their classes (no approval); the admin panel follows it all
 * from "نشاط المستخدمين على المنصة". Mock data until the backend stores them.
 */
@Injectable({ providedIn: 'root' })
export class TeachingStore {
  private readonly scope = inject(TeachingScope);

  readonly materials = signal<Material[]>([
    {
      id: 'm-1', title: 'ملخص درس الكسور العشرية', description: 'ملخص الدرس مع أمثلة محلولة وتمارين للمراجعة.',
      subject: 'الرياضيات', teacherId: '4', sections: ['1/3'],
      files: [{ name: 'ملخص-الكسور-العشرية.pdf', size: 1.4 * MB, url: '' }], publishedAt: ago(1 * MIN)
    },
    {
      id: 'm-2', title: 'ملخص الوحدة الأولى: المعادلات', description: 'كل قوانين الوحدة في ورقتين، اطبعوها قبل الحصة الجاية.',
      subject: 'الرياضيات', teacherId: '1', sections: ['3/2', '3/3'],
      files: [{ name: 'ملخص-المعادلات.pdf', size: 2.1 * MB, url: '' }, { name: 'تمارين-إضافية.docx', size: 0.3 * MB, url: '' }],
      publishedAt: ago(3 * HOUR)
    },
    {
      id: 'm-3', title: 'Unit 3 Vocabulary', description: 'Vocabulary list with examples.',
      subject: 'اللغة الإنجليزية', teacherId: '2', sections: ['2/1'],
      files: [{ name: 'Unit3-Vocabulary.pdf', size: 0.8 * MB, url: '' }], publishedAt: ago(6 * HOUR)
    },
    {
      id: 'm-4', title: 'تجربة عملية: الخلية تحت المجهر', description: 'فيديو التجربة اللي اتعملت في المعمل.',
      subject: 'العلوم', teacherId: '3', sections: ['1/1'],
      files: [], link: 'https://www.youtube.com/', publishedAt: ago(1 * DAY)
    },
    {
      id: 'm-5', title: 'فيديو شرح حل المعادلات', description: 'شرح مبسط لخطوات حل المعادلة من الدرجة الأولى.',
      subject: 'الرياضيات', teacherId: '1', sections: ['3/2'],
      files: [], link: 'https://www.youtube.com/', publishedAt: ago(2 * DAY)
    }
  ]);

  readonly quizzes = signal<Quiz[]>([
    {
      id: 'q-1', kind: 'كويز', mode: 'online', title: 'كويز سريع: المعادلات من الدرجة الأولى',
      instructions: 'اقرأ كل سؤال كويس قبل ما تجاوب. معاك 15 دقيقة.',
      subject: 'الرياضيات', teacherId: '1', sections: ['3/2', '3/3'],
      publishedAt: ago(2 * HOUR), closesAt: ahead(2 * DAY), durationMinutes: 15, totalMarks: 5,
      questions: [
        { id: 'q-1-1', type: 'mcq', text: 'حل المعادلة: س + 5 = 12', options: ['5', '7', '12', '17'], answer: '7', points: 2 },
        { id: 'q-1-2', type: 'truefalse', text: 'المعادلة 2س = 10 حلها س = 5', options: [], answer: 'صح', points: 1 },
        { id: 'q-1-3', type: 'short', text: 'لو 3س = 21 يبقى س = ؟', options: [], answer: '7', points: 2 }
      ]
    },
    {
      id: 'q-2', kind: 'اختبار', mode: 'file', title: 'اختبار الشهر: الخلية ومكوناتها',
      instructions: 'حمّل ورقة الأسئلة، حل في كراستك، وارفع صورة واضحة للحل.',
      subject: 'العلوم', teacherId: '3', sections: ['1/1'],
      publishedAt: ago(5 * HOUR), closesAt: ahead(1 * DAY), durationMinutes: null, totalMarks: 20, questions: [],
      file: { name: 'اختبار-الخلية.pdf', size: 0.6 * MB, url: '' }
    },
    {
      id: 'q-3', kind: 'كويز', mode: 'online', title: 'Unit 2 Quiz',
      instructions: 'Choose the correct answer.',
      subject: 'اللغة الإنجليزية', teacherId: '2', sections: ['2/1'],
      publishedAt: ago(4 * DAY), closesAt: ago(1 * DAY), durationMinutes: 10, totalMarks: 2,
      questions: [
        { id: 'q-3-1', type: 'mcq', text: 'She ___ to school every day.', options: ['go', 'goes', 'going'], answer: 'goes', points: 1 },
        { id: 'q-3-2', type: 'truefalse', text: '"Children" is the plural of "child".', options: [], answer: 'صح', points: 1 }
      ]
    },
    {
      id: 'q-4', kind: 'اختبار', mode: 'file', title: 'اختبار قصير: المثلثات',
      instructions: 'الحل في ورقة منفصلة وارفعه PDF أو صورة.',
      subject: 'الرياضيات', teacherId: '1', sections: ['3/2'],
      publishedAt: ago(1 * DAY), closesAt: ahead(3 * DAY), durationMinutes: null, totalMarks: 10, questions: [],
      file: { name: 'اختبار-المثلثات.pdf', size: 0.4 * MB, url: '' }
    }
  ]);

  readonly attempts = signal<QuizAttempt[]>([
    {
      id: 'at-1', quizId: 'q-1', studentId: 's4', studentName: 'نور الدين حسام حسن رضوان', section: '3/2',
      submittedAt: ago(1 * HOUR), answers: { 'q-1-1': '7', 'q-1-2': 'صح', 'q-1-3': '7' }, score: 5
    },
    {
      id: 'at-2', quizId: 'q-2', studentId: 's2', studentName: 'مازن شريف عبد المنعم', section: '1/1',
      submittedAt: ago(30 * MIN), answers: {}, file: { name: 'حل-اختبار-الخلية.jpg', size: 1.1 * MB, url: '' }, score: null
    },
    {
      id: 'at-3', quizId: 'q-3', studentId: 's3', studentName: 'كريم خالد مصطفى السعيد', section: '2/1',
      submittedAt: ago(2 * DAY), answers: { 'q-3-1': 'goes', 'q-3-2': 'خطأ' }, score: 1
    }
  ]);

  // ---- What the signed-in user sees: a teacher their own content, a student their class's ----

  readonly visibleMaterials = computed(() => this.visible(this.materials()));
  readonly visibleQuizzes = computed(() => this.visible(this.quizzes()));

  private visible<T extends { teacherId: string; sections: string[]; publishedAt: string }>(items: T[]): T[] {
    const list = this.scope.isTeacher()
      ? items.filter(item => item.teacherId === this.scope.teacherId())
      : this.scope.isStudent()
        ? items.filter(item => item.sections.includes(this.scope.studentSection()))
        : items;
    return [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  attemptsOf(quizId: string): QuizAttempt[] {
    return this.attempts().filter(a => a.quizId === quizId);
  }

  /** The signed-in student's attempt at a quiz, if any. */
  myAttempt(quizId: string): QuizAttempt | undefined {
    const studentId = this.scope.studentId();
    return this.attempts().find(a => a.quizId === quizId && a.studentId === studentId);
  }

  saveMaterial(material: Material): void {
    this.materials.update(list => [material, ...list.filter(m => m.id !== material.id)]);
  }

  deleteMaterial(id: string): void {
    this.materials.update(list => list.filter(m => m.id !== id));
  }

  saveQuiz(quiz: Quiz): void {
    this.quizzes.update(list => [quiz, ...list.filter(q => q.id !== quiz.id)]);
  }

  deleteQuiz(id: string): void {
    this.quizzes.update(list => list.filter(q => q.id !== id));
    this.attempts.update(list => list.filter(a => a.quizId !== id));
  }

  submitAttempt(attempt: QuizAttempt): void {
    this.attempts.update(list => [attempt, ...list]);
  }

  gradeAttempt(attemptId: string, score: number): void {
    this.attempts.update(list => list.map(a => (a.id === attemptId ? { ...a, score } : a)));
  }
}

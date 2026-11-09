import { Injectable, computed, inject, signal } from '@angular/core';
import { TeachingFile } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  section: string;
  publishedAt: string;
  dueDate: string;
  attachments: TeachingFile[];
  maxScore: number;
  totalSubmissions: number;
  totalStudents: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  files: TeachingFile[];
  note: string;
  submittedAt: string;
  // null until the teacher grades it
  score: number | null;
  feedback: string;
}

export type AssignmentStatus = 'نشط ومتاح' | 'انتهى الموعد';

export function assignmentStatus(assignment: Assignment): AssignmentStatus {
  return new Date(assignment.dueDate).getTime() < Date.now() ? 'انتهى الموعد' : 'نشط ومتاح';
}

export function submissionRate(assignment: Assignment): number {
  return assignment.totalStudents ? assignment.totalSubmissions / assignment.totalStudents : 0;
}

// Class size for newly published assignments until the class rosters come from the backend
export const DEFAULT_CLASS_SIZE = 40;

const HOUR = 3600000;
const DAY = 24 * HOUR;
const MB = 1024 * 1024;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();
const file = (name: string, size: number): TeachingFile => ({ name, size: size * MB, url: '' });

/** Assignments published by teachers to their classes, and the students' submissions. */
@Injectable({ providedIn: 'root' })
export class AssignmentsStore {
  private readonly scope = inject(TeachingScope);

  readonly assignments = signal<Assignment[]>([
    {
      id: 'as-1', title: 'تمارين على المعادلات من الدرجة الأولى', description: 'حل تمارين صفحة 24 من الكتاب المدرسي.',
      subject: 'الرياضيات', teacherId: '1', section: '3/2', publishedAt: ago(2 * HOUR), dueDate: ahead(3 * DAY),
      attachments: [file('تمارين-المعادلات.pdf', 0.5)], maxScore: 10, totalSubmissions: 12, totalStudents: 43
    },
    {
      id: 'as-2', title: 'Unit 3 Reading Comprehension', description: 'Read the passage and answer the questions.',
      subject: 'اللغة الإنجليزية', teacherId: '2', section: '2/1', publishedAt: ago(5 * HOUR), dueDate: ahead(2 * DAY),
      attachments: [file('Unit3-Reading.pdf', 0.7), file('Questions.docx', 0.1)], maxScore: 10, totalSubmissions: 30, totalStudents: 43
    },
    {
      id: 'as-3', title: 'تقرير عن مكونات الخلية', description: 'تقرير صفحتين مع رسم للخلية.',
      subject: 'العلوم', teacherId: '3', section: '1/1', publishedAt: ago(1 * DAY), dueDate: ahead(4 * DAY),
      attachments: [file('عناصر-التقرير.pdf', 0.2)], maxScore: 10, totalSubmissions: 25, totalStudents: 42
    },
    {
      id: 'as-4', title: 'حل تمارين الكسور العشرية', description: '',
      subject: 'الرياضيات', teacherId: '4', section: '1/3', publishedAt: ago(2 * DAY), dueDate: ago(6 * HOUR),
      attachments: [], maxScore: 10, totalSubmissions: 38, totalStudents: 40
    },
    {
      id: 'as-5', title: 'إعراب الجمل الاسمية والفعلية', description: 'أعرب الجمل الموجودة في الملف.',
      subject: 'اللغة العربية', teacherId: '5', section: '1/2', publishedAt: ago(3 * DAY), dueDate: ahead(1 * DAY),
      attachments: [file('جمل-للإعراب.pdf', 0.3)], maxScore: 10, totalSubmissions: 18, totalStudents: 41
    },
    {
      id: 'as-6', title: 'خريطة صماء لمحافظات مصر', description: 'لوّن الخريطة واكتب أسماء المحافظات.',
      subject: 'الدراسات الاجتماعية', teacherId: '7', section: '2/2', publishedAt: ago(4 * DAY), dueDate: ago(1 * DAY),
      attachments: [file('خريطة-صماء.png', 1.2)], maxScore: 10, totalSubmissions: 21, totalStudents: 42
    },
    {
      id: 'as-7', title: 'تعبير: يوم في حياة طالب', description: 'موضوع تعبير لا يقل عن 10 سطور.',
      subject: 'اللغة العربية', teacherId: '8', section: '2/3', publishedAt: ago(6 * DAY), dueDate: ago(2 * DAY),
      attachments: [], maxScore: 10, totalSubmissions: 36, totalStudents: 40
    },
    {
      id: 'as-8', title: 'أسئلة على الطاقة وتحولاتها', description: 'جاوب على الأسئلة في الملف.',
      subject: 'العلوم', teacherId: '9', section: '3/1', publishedAt: ago(30 * 60000), dueDate: ahead(5 * DAY),
      attachments: [file('أسئلة-الطاقة.pdf', 0.4), file('صور-توضيحية.zip', 3.5)], maxScore: 10, totalSubmissions: 3, totalStudents: 44
    }
  ]);

  readonly submissions = signal<AssignmentSubmission[]>([
    {
      id: 'sub-1', assignmentId: 'as-3', studentId: 's1', studentName: 'أحمد ياسين محمد إبراهيم',
      files: [file('تقرير-الخلية.pdf', 1.6)], note: '', submittedAt: ago(2 * 60000), score: null, feedback: ''
    },
    {
      id: 'sub-2', assignmentId: 'as-2', studentId: 's3', studentName: 'كريم خالد مصطفى السعيد',
      files: [file('Reading-answers.docx', 0.1)], note: '', submittedAt: ago(5 * 60000), score: null, feedback: ''
    },
    {
      id: 'sub-3', assignmentId: 'as-3', studentId: 's2', studentName: 'مازن شريف عبد المنعم',
      files: [file('الخلية.jpg', 2.2)], note: 'الرسم في الصفحة الثانية', submittedAt: ago(16 * 60000), score: null, feedback: ''
    },
    {
      id: 'sub-4', assignmentId: 'as-6', studentId: 's7', studentName: 'يوسف أحمد محمد مصطفى',
      files: [file('خريطة.jpg', 1.9)], note: '', submittedAt: ago(2 * DAY), score: 9, feedback: 'ممتاز، راجع اسم محافظة الوادي الجديد'
    },
    {
      id: 'sub-5', assignmentId: 'as-1', studentId: 's4', studentName: 'نور الدين حسام حسن رضوان',
      files: [file('حل-المعادلات.pdf', 0.9)], note: '', submittedAt: ago(7 * HOUR), score: 10, feedback: 'برافو يا نور'
    }
  ]);

  // A teacher sees their own assignments, a student their class's; newest first
  readonly visible = computed(() => {
    const list = this.scope.isTeacher()
      ? this.assignments().filter(a => a.teacherId === this.scope.teacherId())
      : this.scope.isStudent()
        ? this.assignments().filter(a => a.section === this.scope.studentSection())
        : this.assignments();
    return [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });

  submissionsOf(assignmentId: string): AssignmentSubmission[] {
    return this.submissions()
      .filter(s => s.assignmentId === assignmentId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  /** The signed-in student's submission, if any. */
  mySubmission(assignmentId: string): AssignmentSubmission | undefined {
    const studentId = this.scope.studentId();
    return this.submissions().find(s => s.assignmentId === assignmentId && s.studentId === studentId);
  }

  /** Publishes (or updates) assignments - one per class, so each class keeps its own submissions. */
  publish(assignments: Assignment[]): void {
    const ids = new Set(assignments.map(a => a.id));
    this.assignments.update(list => [...assignments, ...list.filter(a => !ids.has(a.id))]);
  }

  delete(id: string): void {
    this.assignments.update(list => list.filter(a => a.id !== id));
    this.submissions.update(list => list.filter(s => s.assignmentId !== id));
  }

  /** A student's submission; re-submitting replaces the previous one. */
  submit(submission: AssignmentSubmission): void {
    const isNew = !this.submissions().some(
      s => s.assignmentId === submission.assignmentId && s.studentId === submission.studentId
    );
    this.submissions.update(list => [
      submission,
      ...list.filter(s => !(s.assignmentId === submission.assignmentId && s.studentId === submission.studentId))
    ]);
    if (isNew) {
      this.assignments.update(list =>
        list.map(a => (a.id === submission.assignmentId ? { ...a, totalSubmissions: a.totalSubmissions + 1 } : a))
      );
    }
  }

  grade(submissionId: string, score: number, feedback: string): void {
    this.submissions.update(list => list.map(s => (s.id === submissionId ? { ...s, score, feedback } : s)));
  }
}

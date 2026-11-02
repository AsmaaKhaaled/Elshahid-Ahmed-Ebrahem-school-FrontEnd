import { Injectable, computed, inject, signal } from '@angular/core';
import { AssignmentsStore } from '../assignments/assignments.store';
import { TeachersStore } from '../teachers/teachers.store';
import { teacherDisplayName } from '../teachers/teacher.model';
import { sectionsLabel } from '../teaching/teaching.model';
import { TeachingStore } from '../teaching/teaching.store';
import { CurriculumStore } from '../subjects/curriculum.store';

export type ActorType = 'teacher' | 'student';
export type ActivityKind = 'assignment' | 'file' | 'curriculum' | 'quiz' | 'grades' | 'submission';

export interface ActivityEvent {
  id: string;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  kind: ActivityKind;
  action: string;
  detail: string;
  at: string;
}

export interface StudentPresence {
  id: string;
  name: string;
  section: string;
  lastSeen: string | null;
}

// Online = active within the last 5 minutes; inactive = not seen for more than 7 days
export const ONLINE_WINDOW_MS = 5 * 60000;
export const INACTIVE_AFTER_MS = 7 * 24 * 3600000;

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * Who is active on the platform and what they uploaded.
 * Mock data until the backend tracks real sessions / uploads.
 */
@Injectable({ providedIn: 'root' })
export class PlatformActivityStore {
  private readonly teachersStore = inject(TeachersStore);
  private readonly assignmentsStore = inject(AssignmentsStore);
  private readonly teachingStore = inject(TeachingStore);
  private readonly curriculumStore = inject(CurriculumStore);

  // teacherId -> last time seen on the platform (missing = never logged in)
  readonly teacherLastSeen = signal<Record<string, string>>({
    '1': ago(2 * MIN),
    '2': ago(40 * MIN),
    '3': ago(3 * HOUR),
    '4': ago(1 * MIN),
    '5': ago(1 * DAY),
    '6': ago(12 * DAY),
    '7': ago(2 * DAY),
    '8': ago(5 * HOUR),
    '9': ago(25 * MIN),
    '10': ago(9 * DAY),
    '11': ago(3 * MIN)
  });

  readonly students = signal<StudentPresence[]>([
    { id: 's1', name: 'أحمد ياسين محمد إبراهيم', section: '1/3', lastSeen: ago(1 * MIN) },
    { id: 's2', name: 'مازن شريف عبد المنعم', section: '1/1', lastSeen: ago(15 * MIN) },
    { id: 's3', name: 'كريم خالد مصطفى السعيد', section: '2/1', lastSeen: ago(4 * MIN) },
    { id: 's4', name: 'نور الدين حسام حسن رضوان', section: '3/2', lastSeen: ago(6 * HOUR) },
    { id: 's5', name: 'عمر طارق عبد الله خليل', section: '3/3', lastSeen: ago(10 * DAY) },
    { id: 's6', name: 'ياسين مدحت سامي', section: '1/2', lastSeen: ago(2 * DAY) },
    { id: 's7', name: 'يوسف أحمد محمد مصطفى', section: '2/2', lastSeen: ago(50 * MIN) },
    { id: 's8', name: 'محمد علي حسن عبد الله', section: '3/1', lastSeen: null }
  ]);

  // Uploads not kept in the assignments / teaching stores yet (grades)
  private readonly otherEvents = signal<Omit<ActivityEvent, 'actorName'>[]>([
    { id: 'e2', actorType: 'teacher', actorId: '11', kind: 'grades', action: 'رفع درجات', detail: 'درجات اختبار الشهر — فصل 3/4', at: ago(20 * MIN) }
  ]);

  // Everything uploaded on the platform, newest first - built from what teachers publish and students hand in
  readonly events = computed<ActivityEvent[]>(() => {
    const teachers = new Map(this.teachersStore.teachers().map(t => [t.id, teacherDisplayName(t)]));
    const students = new Map(this.students().map(s => [s.id, s.name]));
    const nameOf = (type: ActorType, id: string, fallback = 'مستخدم محذوف') =>
      (type === 'teacher' ? teachers.get(id) : students.get(id)) ?? fallback;
    const teacherEvent = (id: string, kind: ActivityKind, action: string, detail: string, actorId: string, at: string): ActivityEvent =>
      ({ id, actorType: 'teacher', actorId, actorName: nameOf('teacher', actorId), kind, action, detail, at });
    const studentEvent = (id: string, action: string, detail: string, actorId: string, name: string, at: string): ActivityEvent =>
      ({ id, actorType: 'student', actorId, actorName: nameOf('student', actorId, name), kind: 'submission', action, detail, at });

    const assignments = this.assignmentsStore.assignments();
    const quizzes = this.teachingStore.quizzes();

    const published: ActivityEvent[] = [
      ...assignments.map(a =>
        teacherEvent(`assignment-${a.id}`, 'assignment', 'نشر واجب', `${a.title} — فصل ${a.section}`, a.teacherId, a.publishedAt)
      ),
      ...this.teachingStore.materials().map(m =>
        teacherEvent(
          `material-${m.id}`, 'file', m.files.length ? `رفع ${m.files.length > 1 ? `${m.files.length} ملفات` : 'ملف'} شرح` : 'نشر رابط شرح',
          `${m.title} — فصل ${sectionsLabel(m.sections)}`, m.teacherId, m.publishedAt
        )
      ),
      ...quizzes.map(q =>
        teacherEvent(
          `quiz-${q.id}`, 'quiz', `نشر ${q.kind} ${q.mode === 'online' ? 'أونلاين' : '(ملف)'}`,
          `${q.title} — فصل ${sectionsLabel(q.sections)}`, q.teacherId, q.publishedAt
        )
      ),
      ...this.curriculumStore.curricula().flatMap(c =>
        c.files.map(f =>
          teacherEvent(`curriculum-file-${f.id}`, 'curriculum', 'رفع ملف منهج', `${f.title} — منهج ${c.subject}`, c.teacherId, f.uploadedAt)
        )
      )
    ];

    const assignmentTitles = new Map(assignments.map(a => [a.id, `${a.title} — ${a.subject}`]));
    const quizTitles = new Map(quizzes.map(q => [q.id, { title: `${q.title} — ${q.subject}`, kind: q.kind }]));
    const handedIn: ActivityEvent[] = [
      ...this.assignmentsStore.submissions().map(s =>
        studentEvent(`submission-${s.id}`, 'سلّم واجب', assignmentTitles.get(s.assignmentId) ?? '', s.studentId, s.studentName, s.submittedAt)
      ),
      ...this.teachingStore.attempts().map(a => {
        const quiz = quizTitles.get(a.quizId);
        return studentEvent(`attempt-${a.id}`, `حل ${quiz?.kind ?? 'كويز'}`, quiz?.title ?? '', a.studentId, a.studentName, a.submittedAt);
      })
    ];

    const others = this.otherEvents().map(e => ({ ...e, actorName: nameOf(e.actorType, e.actorId) }));
    return [...published, ...handedIn, ...others].sort((a, b) => b.at.localeCompare(a.at));
  });

  /** Per teacher: how much they published (curricula, materials, assignments, quizzes). */
  readonly teacherContentCounts = computed(() => {
    const counts: Record<string, { curricula: number; materials: number; assignments: number; quizzes: number }> = {};
    const of = (id: string) => (counts[id] ??= { curricula: 0, materials: 0, assignments: 0, quizzes: 0 });
    this.curriculumStore.curricula().forEach(c => of(c.teacherId).curricula++);
    this.teachingStore.materials().forEach(m => of(m.teacherId).materials++);
    this.assignmentsStore.assignments().forEach(a => of(a.teacherId).assignments++);
    this.teachingStore.quizzes().forEach(q => of(q.teacherId).quizzes++);
    return counts;
  });
}

export function presenceOf(lastSeen: string | null | undefined): 'online' | 'today' | 'recent' | 'inactive' | 'never' {
  if (!lastSeen) return 'never';
  const elapsed = Date.now() - new Date(lastSeen).getTime();
  if (elapsed <= ONLINE_WINDOW_MS) return 'online';
  if (new Date(lastSeen).toDateString() === new Date().toDateString()) return 'today';
  return elapsed > INACTIVE_AFTER_MS ? 'inactive' : 'recent';
}

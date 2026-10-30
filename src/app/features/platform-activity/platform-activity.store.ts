import { Injectable, computed, inject, signal } from '@angular/core';
import { AssignmentsStore } from '../assignments/assignments.store';
import { TeachersStore } from '../teachers/teachers.store';
import { teacherDisplayName } from '../teachers/teacher.model';

export type ActorType = 'teacher' | 'student';
export type ActivityKind = 'assignment' | 'file' | 'grades' | 'submission';

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

  // Uploads that are not assignments (lesson files, grades, student submissions)
  private readonly otherEvents = signal<Omit<ActivityEvent, 'actorName'>[]>([
    { id: 'e1', actorType: 'teacher', actorId: '4', kind: 'file', action: 'رفع ملف شرح', detail: 'ملخص درس الكسور العشرية — فصل 1/3', at: ago(1 * MIN) },
    { id: 'e2', actorType: 'teacher', actorId: '11', kind: 'grades', action: 'رفع درجات', detail: 'درجات اختبار الشهر — فصل 3/4', at: ago(20 * MIN) },
    { id: 'e3', actorType: 'teacher', actorId: '2', kind: 'file', action: 'رفع ملف شرح', detail: 'Unit 3 Vocabulary — فصل 2/1', at: ago(6 * HOUR) },
    { id: 'e4', actorType: 'teacher', actorId: '3', kind: 'file', action: 'رفع فيديو شرح', detail: 'تجربة عملية: الخلية تحت المجهر — فصل 1/1', at: ago(1 * DAY) },
    { id: 's-e1', actorType: 'student', actorId: 's1', kind: 'submission', action: 'سلّم واجب', detail: 'تقرير عن مكونات الخلية — العلوم', at: ago(2 * MIN) },
    { id: 's-e2', actorType: 'student', actorId: 's3', kind: 'submission', action: 'سلّم واجب', detail: 'Unit 3 Reading Comprehension — اللغة الإنجليزية', at: ago(5 * MIN) },
    { id: 's-e3', actorType: 'student', actorId: 's2', kind: 'submission', action: 'سلّم واجب', detail: 'تقرير عن مكونات الخلية — العلوم', at: ago(16 * MIN) },
    { id: 's-e4', actorType: 'student', actorId: 's7', kind: 'submission', action: 'سلّم واجب', detail: 'خريطة صماء لمحافظات مصر — الدراسات الاجتماعية', at: ago(2 * DAY) },
    { id: 's-e5', actorType: 'student', actorId: 's4', kind: 'submission', action: 'سلّم واجب', detail: 'تمارين على المعادلات من الدرجة الأولى — الرياضيات', at: ago(7 * HOUR) }
  ]);

  // Everything uploaded on the platform, newest first. Assignments come straight from the assignments store.
  readonly events = computed<ActivityEvent[]>(() => {
    const teachers = new Map(this.teachersStore.teachers().map(t => [t.id, teacherDisplayName(t)]));
    const students = new Map(this.students().map(s => [s.id, s.name]));
    const nameOf = (type: ActorType, id: string) =>
      (type === 'teacher' ? teachers.get(id) : students.get(id)) ?? 'مستخدم محذوف';

    const assignmentEvents: ActivityEvent[] = this.assignmentsStore.assignments().map(a => ({
      id: `assignment-${a.id}`,
      actorType: 'teacher',
      actorId: a.teacherId,
      actorName: nameOf('teacher', a.teacherId),
      kind: 'assignment',
      action: 'نشر واجب',
      detail: `${a.title} — فصل ${a.section}`,
      at: a.publishedAt
    }));

    const others = this.otherEvents().map(e => ({ ...e, actorName: nameOf(e.actorType, e.actorId) }));
    return [...assignmentEvents, ...others].sort((a, b) => b.at.localeCompare(a.at));
  });
}

export function presenceOf(lastSeen: string | null | undefined): 'online' | 'today' | 'recent' | 'inactive' | 'never' {
  if (!lastSeen) return 'never';
  const elapsed = Date.now() - new Date(lastSeen).getTime();
  if (elapsed <= ONLINE_WINDOW_MS) return 'online';
  if (new Date(lastSeen).toDateString() === new Date().toDateString()) return 'today';
  return elapsed > INACTIVE_AFTER_MS ? 'inactive' : 'recent';
}

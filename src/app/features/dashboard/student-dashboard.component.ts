import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { AuthService } from '../../core/auth/auth.service';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { AssignmentsStore } from '../assignments/assignments.store';
import { curriculumKinds, latestCurriculumFile } from '../subjects/curriculum.model';
import { CurriculumStore } from '../subjects/curriculum.store';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { isClosed } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { TeachingStore } from '../teaching/teaching.store';
import { MaterialsStore } from '../materials/materials.store';

interface DueItem {
  id: string;
  kind: 'واجب' | 'كويز' | 'اختبار';
  title: string;
  subject: string;
  due: string;
  link: string;
}

const DAY = 24 * 3600000;

/** The student's home: what's due, their class's curricula, the latest materials and their marks. */
@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ArabicDatePipe, TimeAgoPipe, TeachingFilesComponent],
  templateUrl: './student-dashboard.component.html'
})
export class StudentDashboardComponent {
  readonly auth = inject(AuthService);
  readonly scope = inject(TeachingScope);
  private readonly assignmentsStore = inject(AssignmentsStore);
  private readonly teachingStore = inject(TeachingStore);
  private readonly materialsStore = inject(MaterialsStore);
  private readonly curriculumStore = inject(CurriculumStore);
  readonly currentTerm = inject(AcademicCalendarStore).currentTerm;

  readonly school = SCHOOL_INFO;
  readonly today = new Date();
  readonly kindsOf = curriculumKinds;
  readonly latestFileOf = latestCurriculumFile;

  /** Assignments not handed in and quizzes not taken yet, soonest deadline first. */
  readonly dueItems = computed<DueItem[]>(() => {
    const now = new Date().toISOString();
    const assignments = this.assignmentsStore
      .visible()
      .filter(a => a.requiresSubmission && a.dueDate > now && !this.assignmentsStore.mySubmission(a.id))
      .map(a => ({ id: a.id, kind: 'واجب' as const, title: a.title, subject: a.subject, due: a.dueDate, link: '/student/assignments' }));
    const quizzes = this.teachingStore
      .visibleQuizzes()
      .filter(q => !isClosed(q) && !this.teachingStore.myAttempt(q.id))
      .map(q => ({ id: q.id, kind: q.kind, title: q.title, subject: q.subject, due: q.closesAt, link: '/student/quizzes' }));
    return [...assignments, ...quizzes].sort((a, b) => a.due.localeCompare(b.due));
  });

  readonly pendingAssignments = computed(() => this.dueItems().filter(i => i.kind === 'واجب').length);
  readonly pendingQuizzes = computed(() => this.dueItems().filter(i => i.kind !== 'واجب').length);

  readonly newMaterials = computed(() => {
    const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
    return this.materialsStore.recent().filter(m => m.publishedAt >= weekAgo).length;
  });

  readonly latestMaterials = computed(() => this.materialsStore.recent().slice(0, 4));

  // The latest few; "كل المناهج" opens the full, paged list
  readonly curricula = computed(() => this.curriculumStore.recent().slice(0, 6));

  constructor() {
    this.curriculumStore.ensureLoaded();
    this.assignmentsStore.load();
    this.materialsStore.load();
  }

  /** Average of the marks the student got back (graded assignments & quizzes), in %. */
  readonly averageMark = computed<{ percent: number; count: number } | null>(() => {
    const marks: number[] = [];
    for (const a of this.assignmentsStore.visible()) {
      const score = this.assignmentsStore.mySubmission(a.id)?.score;
      if (score != null && a.maxScore) marks.push(score / a.maxScore);
    }
    for (const q of this.teachingStore.visibleQuizzes()) {
      const score = this.teachingStore.myAttempt(q.id)?.score;
      if (score != null && q.totalMarks) marks.push(score / q.totalMarks);
    }
    if (!marks.length) return null;
    return { percent: Math.round((marks.reduce((s, m) => s + m, 0) / marks.length) * 100), count: marks.length };
  });

  /** "باقي يومين" style label, red when due within a day. */
  dueLabel(due: string): { text: string; urgent: boolean } {
    const ms = new Date(due).getTime() - Date.now();
    const hours = Math.max(0, Math.floor(ms / 3600000));
    if (hours < 24) return { text: hours < 1 ? 'أقل من ساعة' : `باقي ${hours} ساعة`, urgent: true };
    const days = Math.floor(hours / 24);
    return { text: days === 1 ? 'باقي يوم' : days === 2 ? 'باقي يومين' : `باقي ${days} أيام`, urgent: false };
  }
}

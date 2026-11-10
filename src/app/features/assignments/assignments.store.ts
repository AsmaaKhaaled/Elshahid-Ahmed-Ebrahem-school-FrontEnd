import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, concat, forkJoin, map, of, switchMap, tap, throwError, toArray } from 'rxjs';
import { TeachingFile } from '../teaching/teaching.model';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { AssignmentsService } from './assignments.service';

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
  // false = solved outside the platform: students just read it and download its files
  requiresSubmission: boolean;
  totalSubmissions: number;
  ungradedSubmissions: number;
  totalStudents: number;
}

/** What the teacher fills in, without the classes and the files. */
export interface AssignmentDraft {
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  maxScore: number;
  requiresSubmission: boolean;
}

/** What the assignment form hands back to the page. */
export interface AssignmentFormResult {
  draft: AssignmentDraft;
  sections: string[];
  attachments: TeachingFile[];
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

/** What a student hands in. */
export interface AssignmentAnswer {
  files: TeachingFile[];
  note: string;
}

export type AssignmentStatus = 'نشط ومتاح' | 'انتهى الموعد';

export function assignmentStatus(assignment: Assignment): AssignmentStatus {
  return new Date(assignment.dueDate).getTime() < Date.now() ? 'انتهى الموعد' : 'نشط ومتاح';
}

export function submissionRate(assignment: Assignment): number {
  return assignment.totalStudents ? assignment.totalSubmissions / assignment.totalStudents : 0;
}

/** Assignments published by teachers to their classes, and the students' answers (all from the API). */
@Injectable({ providedIn: 'root' })
export class AssignmentsStore {
  private readonly service = inject(AssignmentsService);
  private readonly scope = inject(TeachingScope);

  readonly assignments = signal<Assignment[]>([]);
  readonly loading = signal(false);

  // A student: their own answers. A teacher: the answers of the assignments they opened.
  readonly submissions = signal<AssignmentSubmission[]>([]);
  readonly loadingSubmissions = signal(false);

  // Newest first
  readonly visible = computed(() => [...this.assignments()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));

  /** Fetched on every visit: this store outlives a sign-out, and the list belongs to who is signed in. */
  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.refresh().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }

  /** Teacher side: fetches the answers of one assignment. */
  loadSubmissions(assignmentId: string): void {
    this.loadingSubmissions.set(true);
    this.service.submissions(assignmentId).subscribe({
      next: answers => {
        this.submissions.update(list => [...answers, ...list.filter(s => s.assignmentId !== assignmentId)]);
        this.loadingSubmissions.set(false);
      },
      error: () => this.loadingSubmissions.set(false)
    });
  }

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

  /** Publishes to each class (one assignment per class); if a file fails, nothing stays half published. */
  create(result: AssignmentFormResult): Observable<void> {
    return this.service.create(result.draft, result.sections).pipe(
      switchMap(created =>
        this.upload(created[0].id, created.slice(1).map(a => a.id), result.attachments).pipe(
          catchError(error => this.undo(created).pipe(switchMap(() => throwError(() => error))))
        )
      ),
      switchMap(() => this.refresh())
    );
  }

  /** Saves the edits, removes the files taken out, and uploads the new ones. */
  update(existing: Assignment, result: AssignmentFormResult): Observable<void> {
    const kept = new Set(result.attachments.map(file => file.id).filter(Boolean));
    const removals = existing.attachments
      .filter(file => file.id && !kept.has(file.id))
      .map(file => this.service.deleteAttachment(existing.id, file.id!));
    return this.service.update(existing.id, result.draft).pipe(
      switchMap(() => concat(...removals).pipe(toArray())),
      switchMap(() => this.upload(existing.id, [], result.attachments)),
      switchMap(() => this.refresh())
    );
  }

  remove(id: string): Observable<void> {
    return this.service.remove(id).pipe(
      tap(() => {
        this.assignments.update(list => list.filter(a => a.id !== id));
        this.submissions.update(list => list.filter(s => s.assignmentId !== id));
      })
    );
  }

  /** A student's answer; handing in again replaces the previous one. */
  submit(assignmentId: string, answer: AssignmentAnswer): Observable<void> {
    return this.service.submit(assignmentId, answer.files, answer.note).pipe(
      tap(saved => this.submissions.update(list => [saved, ...list.filter(s => s.assignmentId !== assignmentId)])),
      map(() => undefined)
    );
  }

  grade(submission: AssignmentSubmission, score: number, feedback: string): Observable<void> {
    return this.service.grade(submission.assignmentId, submission.id, score, feedback).pipe(
      tap(saved => {
        this.submissions.update(list => list.map(s => (s.id === saved.id ? saved : s)));
        if (submission.score == null) {
          this.assignments.update(list =>
            list.map(a => (a.id === saved.assignmentId ? { ...a, ungradedSubmissions: a.ungradedSubmissions - 1 } : a))
          );
        }
      }),
      map(() => undefined)
    );
  }

  private refresh(): Observable<void> {
    return this.service.list().pipe(
      tap(({ assignments, mine }) => {
        this.assignments.set(assignments);
        this.submissions.set(mine);
      }),
      map(() => undefined)
    );
  }

  /** Uploads the newly picked files one after the other. */
  private upload(id: string, alsoFor: string[], files: TeachingFile[]): Observable<void[]> {
    const uploads = files.filter(file => file.blob).map(file => this.service.addAttachment(id, file.blob!, alsoFor));
    return concat(...uploads).pipe(toArray());
  }

  private undo(created: Assignment[]): Observable<unknown> {
    return forkJoin(created.map(a => this.service.remove(a.id).pipe(catchError(() => of(undefined)))));
  }
}

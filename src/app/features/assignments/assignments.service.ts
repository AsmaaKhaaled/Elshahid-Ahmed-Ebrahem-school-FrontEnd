import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TeachingFile } from '../teaching/teaching.model';
import { Assignment, AssignmentDraft, AssignmentSubmission } from './assignments.store';

const BASE = 'assignments';
// The assignments page and the dashboards show the latest ones
const LIST_LIMIT = 100;

// ---- As the API sends them ----
interface ApiFile { id: string; name: string; size: number; type: string | null }
interface ApiSubmission extends Omit<AssignmentSubmission, 'files'> { files: ApiFile[] }
interface ApiAssignment extends Omit<Assignment, 'attachments'> {
  attachments: ApiFile[];
  // Sent to a student only
  mySubmission?: ApiSubmission | null;
}

export interface AssignmentsList {
  assignments: Assignment[];
  // A student's own answers
  mine: AssignmentSubmission[];
}

/** الواجبات والتكليفات المدرسية API: publishing, the files, the students' answers and the marking. */
@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly api = inject(ApiService);

  list(): Observable<AssignmentsList> {
    return this.api.get<{ data: { assignments: ApiAssignment[] } }>(BASE, { page: 1, limit: LIST_LIMIT }).pipe(
      map(res => ({
        assignments: res.data.assignments.map(a => this.toAssignment(a)),
        mine: res.data.assignments.flatMap(a => (a.mySubmission ? [this.toSubmission(a.mySubmission)] : []))
      }))
    );
  }

  create(draft: AssignmentDraft, sections: string[]): Observable<Assignment[]> {
    return this.api
      .post<{ data: { assignments: ApiAssignment[] } }>(BASE, { ...draft, sections })
      .pipe(map(res => res.data.assignments.map(a => this.toAssignment(a))));
  }

  update(id: string, draft: AssignmentDraft): Observable<Assignment> {
    return this.api
      .put<{ data: { assignment: ApiAssignment } }>(`${BASE}/${id}`, draft)
      .pipe(map(res => this.toAssignment(res.data.assignment)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete<unknown>(`${BASE}/${id}`).pipe(map(() => undefined));
  }

  /** Uploads a file once, for this assignment and its copies in the teacher's other classes. */
  addAttachment(id: string, file: File, alsoFor: string[]): Observable<void> {
    const form = new FormData();
    form.append('file', file, file.name);
    alsoFor.forEach(otherId => form.append('alsoFor', otherId));
    return this.api.post<unknown>(`${BASE}/${id}/attachments`, form).pipe(map(() => undefined));
  }

  deleteAttachment(id: string, attachmentId: string): Observable<void> {
    return this.api.delete<unknown>(`${BASE}/${id}/attachments/${attachmentId}`).pipe(map(() => undefined));
  }

  /** Hands in the student's answer: the new files, and the files of the previous answer to keep. */
  submit(id: string, files: TeachingFile[], note: string): Observable<AssignmentSubmission> {
    const form = new FormData();
    form.append('note', note);
    files.forEach(file => {
      if (file.blob) form.append('files', file.blob, file.name);
      else if (file.id) form.append('keepFileIds', file.id);
    });
    return this.api
      .post<{ data: { submission: ApiSubmission } }>(`${BASE}/${id}/submission`, form)
      .pipe(map(res => this.toSubmission(res.data.submission)));
  }

  submissions(id: string): Observable<AssignmentSubmission[]> {
    return this.api
      .get<{ data: { submissions: ApiSubmission[] } }>(`${BASE}/${id}/submissions`)
      .pipe(map(res => res.data.submissions.map(s => this.toSubmission(s))));
  }

  grade(id: string, submissionId: string, score: number, feedback: string): Observable<AssignmentSubmission> {
    return this.api
      .put<{ data: { submission: ApiSubmission } }>(`${BASE}/${id}/submissions/${submissionId}/grade`, { score, feedback })
      .pipe(map(res => this.toSubmission(res.data.submission)));
  }

  private toAssignment({ mySubmission, ...assignment }: ApiAssignment): Assignment {
    return {
      ...assignment,
      attachments: assignment.attachments.map(file =>
        this.toTeachingFile(file, `${BASE}/${assignment.id}/attachments/${file.id}/download`)
      )
    };
  }

  private toSubmission(submission: ApiSubmission): AssignmentSubmission {
    const base = `${BASE}/${submission.assignmentId}/submissions/${submission.id}/files`;
    return {
      ...submission,
      files: submission.files.map(file => this.toTeachingFile(file, `${base}/${file.id}/download`))
    };
  }

  // Files on the server have no URL: they're downloaded through the API (with the sign-in token)
  private toTeachingFile(file: ApiFile, endpoint: string): TeachingFile {
    return {
      id: file.id,
      name: file.name,
      size: file.size,
      url: '',
      download: () => this.save(endpoint, file.name).subscribe()
    };
  }

  private save(endpoint: string, name: string): Observable<void> {
    return this.api.getBlob(endpoint).pipe(
      tap(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
      map(() => undefined)
    );
  }
}

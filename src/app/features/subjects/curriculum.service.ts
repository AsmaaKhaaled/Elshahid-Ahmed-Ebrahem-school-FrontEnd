import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  Curriculum, CurriculumDraft, CurriculumFile, CurriculumFileKind, CurriculumPlanWeek, CurriculumSummary, NewCurriculumFile
} from './curriculum.model';

const BASE = 'curricula';

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CurriculaPage {
  curricula: CurriculumSummary[];
  meta: PageMeta;
  // A teacher's subjects that already have a curriculum (on any page)
  startedSubjects: string[];
  // Curricula per grade with the same search, whatever grade is shown: { G1: 12, ... }
  gradeCounts: Record<string, number>;
}

export interface CurriculumFilesPage {
  files: CurriculumFile[];
  meta: PageMeta;
}

// ---- As the API sends them ----
type ApiKind = 'BOOK' | 'PLAN' | 'EXAMS' | 'GUIDE' | 'OTHER';
interface ApiStoredFile { name: string; size: number; type: string | null }
interface ApiSummary extends Omit<CurriculumSummary, 'kinds'> { kinds: ApiKind[] }
interface ApiCurriculum extends ApiSummary {
  fileCounts: Partial<Record<ApiKind, number>>;
  plan: CurriculumPlanWeek[];
  planFile: ApiStoredFile | null;
}
interface ApiFile {
  id: string;
  kind: ApiKind;
  title: string;
  forStudents: boolean;
  link: string | null;
  file: ApiStoredFile | null;
  uploadedAt: string;
}

const toKind = (kind: ApiKind) => kind.toLowerCase() as CurriculumFileKind;
const toApiKind = (kind: CurriculumFileKind) => kind.toUpperCase() as ApiKind;
// Files on the server have no URL: they're downloaded through the API (with the sign-in token)
const toTeachingFile = (file: ApiStoredFile) => ({ name: file.name, size: file.size, url: '' });

const toSummary = (c: ApiSummary): CurriculumSummary => ({ ...c, kinds: c.kinds.map(toKind) });

const toCurriculum = (c: ApiCurriculum): Curriculum => ({
  ...toSummary(c),
  fileCounts: Object.fromEntries(Object.entries(c.fileCounts).map(([kind, n]) => [toKind(kind as ApiKind), n])),
  plan: c.plan,
  planFile: c.planFile ? toTeachingFile(c.planFile) : null
});

const toFile = (f: ApiFile): CurriculumFile => ({
  id: f.id,
  kind: toKind(f.kind),
  title: f.title,
  forStudents: f.forStudents,
  uploadedAt: f.uploadedAt,
  ...(f.link ? { link: f.link } : {}),
  ...(f.file ? { file: toTeachingFile(f.file) } : {})
});

/** المناهج والمواد الدراسية API: paged lists, the teacher's changes, and file downloads. */
@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private readonly api = inject(ApiService);

  list(query: { page: number; limit: number; search?: string; gradeId?: string }): Observable<CurriculaPage> {
    const params = {
      page: query.page,
      limit: query.limit,
      ...(query.search && { search: query.search }),
      ...(query.gradeId && { gradeId: query.gradeId })
    };
    return this.api
      .get<{
        data: { curricula: ApiSummary[]; startedSubjects?: string[]; gradeCounts?: Record<string, number> };
        meta: PageMeta;
      }>(BASE, params)
      .pipe(
        map(res => ({
          curricula: res.data.curricula.map(toSummary),
          meta: res.meta,
          startedSubjects: res.data.startedSubjects ?? [],
          gradeCounts: res.data.gradeCounts ?? {}
        }))
      );
  }

  get(id: string): Observable<Curriculum> {
    return this.api.get<{ data: { curriculum: ApiCurriculum } }>(`${BASE}/${id}`).pipe(map(res => toCurriculum(res.data.curriculum)));
  }

  files(id: string, query: { page: number; limit: number; kind?: CurriculumFileKind | null }): Observable<CurriculumFilesPage> {
    const params = { page: query.page, limit: query.limit, ...(query.kind && { kind: toApiKind(query.kind) }) };
    return this.api
      .get<{ data: { files: ApiFile[] }; meta: PageMeta }>(`${BASE}/${id}/files`, params)
      .pipe(map(res => ({ files: res.data.files.map(toFile), meta: res.meta })));
  }

  create(draft: CurriculumDraft): Observable<Curriculum> {
    return this.api.post<{ data: { curriculum: ApiCurriculum } }>(BASE, draft).pipe(map(res => toCurriculum(res.data.curriculum)));
  }

  update(id: string, draft: CurriculumDraft): Observable<Curriculum> {
    return this.api.put<{ data: { curriculum: ApiCurriculum } }>(`${BASE}/${id}`, draft).pipe(map(res => toCurriculum(res.data.curriculum)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete<unknown>(`${BASE}/${id}`).pipe(map(() => undefined));
  }

  addFile(id: string, file: NewCurriculumFile): Observable<CurriculumFile> {
    const form = new FormData();
    form.append('kind', toApiKind(file.kind));
    form.append('title', file.title);
    form.append('forStudents', String(file.forStudents));
    if (file.file) form.append('file', file.file, file.file.name);
    else if (file.link) form.append('link', file.link);
    return this.api.post<{ data: { file: ApiFile } }>(`${BASE}/${id}/files`, form).pipe(map(res => toFile(res.data.file)));
  }

  deleteFile(id: string, fileId: string): Observable<void> {
    return this.api.delete<unknown>(`${BASE}/${id}/files/${fileId}`).pipe(map(() => undefined));
  }

  savePlan(id: string, weeks: Pick<CurriculumPlanWeek, 'topic' | 'objectives'>[]): Observable<Curriculum> {
    return this.api.put<{ data: { curriculum: ApiCurriculum } }>(`${BASE}/${id}/plan`, { weeks }).pipe(map(res => toCurriculum(res.data.curriculum)));
  }

  setPlanFile(id: string, file: File): Observable<Curriculum> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.api.put<{ data: { curriculum: ApiCurriculum } }>(`${BASE}/${id}/plan-file`, form).pipe(map(res => toCurriculum(res.data.curriculum)));
  }

  deletePlanFile(id: string): Observable<Curriculum> {
    return this.api.delete<{ data: { curriculum: ApiCurriculum } }>(`${BASE}/${id}/plan-file`).pipe(map(res => toCurriculum(res.data.curriculum)));
  }

  /** Downloads a stored file under its own name (the request carries the sign-in token). */
  downloadFile(id: string, fileId: string, name: string): Observable<void> {
    return this.save(this.api.getBlob(`${BASE}/${id}/files/${fileId}/download`), name);
  }

  downloadPlanFile(id: string, name: string): Observable<void> {
    return this.save(this.api.getBlob(`${BASE}/${id}/plan-file`), name);
  }

  private save(blob$: Observable<Blob>, name: string): Observable<void> {
    return blob$.pipe(
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

import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PageMeta } from '../subjects/curriculum.service';
import { Material, TeachingFile } from '../teaching/teaching.model';

const BASE = 'materials';

export interface MaterialsQuery {
  page: number;
  limit: number;
  search?: string;
  subject?: string;
}

export interface MaterialsPage {
  materials: Material[];
  // Every subject the user has materials in, with how many (whatever page is shown)
  subjects: { subject: string; count: number }[];
  meta: PageMeta;
}

// ---- As the API sends them ----
interface ApiFile { id: string; name: string; size: number; type: string | null }
interface ApiMaterial extends Omit<Material, 'files' | 'link'> {
  files: ApiFile[];
  link: string | null;
}

/** المواد والملفات التعليمية API: a teacher publishes to their classes, their students see it right away. */
@Injectable({ providedIn: 'root' })
export class MaterialsService {
  private readonly api = inject(ApiService);

  list(query: MaterialsQuery): Observable<MaterialsPage> {
    return this.api
      .get<{ data: { materials: ApiMaterial[]; subjects: MaterialsPage['subjects'] }; meta: PageMeta }>(BASE, {
        page: query.page,
        limit: query.limit,
        ...(query.search && { search: query.search }),
        ...(query.subject && { subject: query.subject })
      })
      .pipe(
        map(res => ({
          materials: res.data.materials.map(m => this.toMaterial(m)),
          subjects: res.data.subjects,
          meta: res.meta
        }))
      );
  }

  /** Publishes the material with its files in one request. */
  create(material: Material): Observable<Material> {
    return this.api
      .post<{ data: { material: ApiMaterial } }>(BASE, this.toForm(material))
      .pipe(map(res => this.toMaterial(res.data.material)));
  }

  /** Saves the edits: the files still listed are kept, the newly picked ones uploaded, the others removed. */
  update(material: Material): Observable<Material> {
    return this.api
      .put<{ data: { material: ApiMaterial } }>(`${BASE}/${material.id}`, this.toForm(material))
      .pipe(map(res => this.toMaterial(res.data.material)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete<unknown>(`${BASE}/${id}`).pipe(map(() => undefined));
  }

  private toForm(material: Material): FormData {
    const form = new FormData();
    form.append('title', material.title);
    form.append('description', material.description);
    form.append('subject', material.subject);
    // An empty link removes the one saved before
    form.append('link', material.link ?? '');
    material.sections.forEach(section => form.append('sections', section));
    material.files.forEach(file => {
      if (file.blob) form.append('files', file.blob, file.name);
      else if (file.id) form.append('keepFileIds', file.id);
    });
    return form;
  }

  private toMaterial(material: ApiMaterial): Material {
    return {
      ...material,
      link: material.link ?? undefined,
      files: material.files.map(file => this.toTeachingFile(file, `${BASE}/${material.id}/files/${file.id}/download`))
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

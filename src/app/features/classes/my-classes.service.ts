import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ClassStudentsPage, MyClass, PageMeta } from './my-class.model';

const BASE = 'teachers/me/classes';

interface ClassesResponse { data: { classes: MyClass[] } }
interface StudentsResponse { data: Omit<ClassStudentsPage, 'meta'>; meta: PageMeta }

/** The signed-in teacher's own classes and their students (assigned by the admin). */
@Injectable({ providedIn: 'root' })
export class MyClassesService {
  private readonly api = inject(ApiService);

  getClasses(): Observable<MyClass[]> {
    return this.api.get<ClassesResponse>(BASE).pipe(map(res => res.data.classes));
  }

  getStudents(classId: string, page: number, limit: number, search = ''): Observable<ClassStudentsPage> {
    return this.api
      .get<StudentsResponse>(`${BASE}/${encodeURIComponent(classId)}/students`, { page, limit, ...(search && { search }) })
      .pipe(map(res => ({ ...res.data, meta: res.meta })));
  }
}

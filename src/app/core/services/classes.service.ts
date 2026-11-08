import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SchoolClass {
  id: string;
  name: string;
  displayNameArabic: string;
  gradeLevel: string;
  roomNumber?: string;
  capacity?: number;
  // Active students in the class (GET /classes)
  currentStudentCount?: number;
}

interface ClassesApiResponse {
  success?: boolean;
  status?: string;
  statusCode?: number;
  message?: string;
  data: SchoolClass[];
}

@Injectable({
  providedIn: 'root'
})
export class ClassesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/classes`;

  getAll(): Observable<SchoolClass[]> {
    return this.http.get<ClassesApiResponse | SchoolClass[]>(this.apiUrl).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray((res as ClassesApiResponse).data)) {
          return (res as ClassesApiResponse).data;
        }
        return [];
      })
    );
  }
}


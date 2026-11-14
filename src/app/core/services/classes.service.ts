import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClassAdvisorDto {
  id: string;
  name: string;
  fullNameArabic?: string;
  teacherCode?: string;
  phone?: string;
  specialization?: string;
  status?: string;
  employmentStatus?: string;
}

export interface AdvisorHistoryEntry {
  teacherId: string | null;
  teacherName?: string;
  teacherCode?: string;
  year: string;
  since: string;
  reason: string;
  note?: string;
  assignedAt?: string;
}

export interface SchoolClassResponse {
  id: string;
  name: string;
  section?: string;
  displayNameArabic: string;
  gradeLevel: string;
  roomNumber?: string;
  capacity?: number;
  enrolledStudents?: number;
  currentStudentCount?: number;
  shift?: 'صباحي' | 'مسائي';
  classTeacherId?: string | null;
  classTeacher?: ClassAdvisorDto | null;
  advisorHistory?: AdvisorHistoryEntry[];
  isActive?: boolean;
}

export type SchoolClass = SchoolClassResponse;

export interface AssignAdvisorPayload {
  teacherId: string | null;
  year: string;
  since: string;
  reason: string;
  note?: string;
}

interface ClassesApiResponse {
  success?: boolean;
  status?: string;
  statusCode?: number;
  message?: string;
  data: SchoolClassResponse[];
}

interface SingleClassApiResponse {
  success?: boolean;
  status?: string;
  statusCode?: number;
  message?: string;
  data: SchoolClassResponse;
}

@Injectable({
  providedIn: 'root'
})
export class ClassesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/classes`;

  getAll(): Observable<SchoolClassResponse[]> {
    return this.http.get<ClassesApiResponse | SchoolClassResponse[]>(this.apiUrl).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray((res as ClassesApiResponse).data)) {
          return (res as ClassesApiResponse).data;
        }
        return [];
      })
    );
  }

  assignAdvisor(classId: string, payload: AssignAdvisorPayload): Observable<SchoolClassResponse> {
    return this.http.put<SingleClassApiResponse | SchoolClassResponse>(
      `${this.apiUrl}/${encodeURIComponent(classId)}/advisor`,
      payload
    ).pipe(
      map(res => {
        if (res && 'data' in res && res.data) {
          return res.data;
        }
        return res as SchoolClassResponse;
      })
    );
  }
}

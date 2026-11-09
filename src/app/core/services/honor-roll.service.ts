import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HonorCandidateDto {
  id: string;
  name: string;
  teacherCode?: string;
  studentCode?: string;
  specialization?: string;
  jobTitle?: string;
  subjects?: string[];
  section?: string;
  gradeLevel?: string;
  photoUrl?: string | null;
}

export interface HonorEntryDto {
  id: string;
  kind: 'TEACHER' | 'STUDENT';
  name: string;
  photoUrl?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
  subjects: string[];
  section?: string | null;
  achievement?: string | null;
  academicYear?: string;
  term?: string;
  order?: number;
  isActive?: boolean;
}

export interface HonorRollListResponse {
  status: string;
  data: {
    teachers: HonorEntryDto[];
    students: HonorEntryDto[];
  };
}

export interface SingleHonorEntryResponse {
  status: string;
  data: HonorEntryDto;
}

export interface CandidatesResponse {
  status: string;
  data: HonorCandidateDto[];
}

@Injectable({ providedIn: 'root' })
export class HonorRollApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.includes('/api/v1')
    ? `${environment.apiUrl}/honor-roll`
    : `${environment.apiUrl}/api/v1/honor-roll`;

  getHonorRoll(params?: { academicYear?: string; term?: string }): Observable<HonorRollListResponse> {
    return this.http.get<HonorRollListResponse>(this.baseUrl, { params });
  }

  searchCandidates(type: 'TEACHER' | 'STUDENT', q: string, limit = 10): Observable<CandidatesResponse> {
    const params = new HttpParams().set('type', type).set('q', q.trim()).set('limit', limit);
    return this.http.get<CandidatesResponse>(`${this.baseUrl}/candidates`, { params });
  }

  create(payload: Partial<HonorEntryDto>): Observable<SingleHonorEntryResponse> {
    return this.http.post<SingleHonorEntryResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<HonorEntryDto>): Observable<SingleHonorEntryResponse> {
    return this.http.put<SingleHonorEntryResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ status: string; data: { id: string } }> {
    return this.http.delete<{ status: string; data: { id: string } }>(`${this.baseUrl}/${id}`);
  }
}


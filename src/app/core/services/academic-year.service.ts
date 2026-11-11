import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AcademicTermDto {
  id: string;
  year: string;
  term: 1 | 2;
  label: string;
  isCurrent?: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

export interface AcademicTermsListResponse {
  currentTermId: string | null;
  terms: AcademicTermDto[];
}

interface ApiResponse<T> {
  status: string;
  statusCode?: number;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl.includes('/api/v1')
    ? `${environment.apiUrl}/academic-year`
    : `${environment.apiUrl}/api/v1/academic-year`;

  /**
   * ① Get Current Term (Public & Authenticated: Used across headers and all pages)
   */
  getCurrentTerm(): Observable<AcademicTermDto> {
    return this.http.get<ApiResponse<AcademicTermDto>>(`${this.apiUrl}/current`).pipe(
      map(res => res.data)
    );
  }

  /**
   * ② Get All Terms
   */
  getAllTerms(): Observable<AcademicTermsListResponse> {
    return this.http.get<ApiResponse<AcademicTermsListResponse>>(this.apiUrl).pipe(
      map(res => res.data)
    );
  }

  /**
   * ③ Transition to Next Term (Ends current, starts next)
   */
  transitionToNextTerm(): Observable<{ currentTerm: AcademicTermDto; terms: AcademicTermDto[] }> {
    return this.http.post<ApiResponse<{ currentTerm: AcademicTermDto; terms: AcademicTermDto[] }>>(
      `${this.apiUrl}/transition`,
      {}
    ).pipe(
      map(res => res.data)
    );
  }

  /**
   * ④ Add Next Term
   */
  addNextTerm(payload?: { plannedStartDate?: string; plannedEndDate?: string }): Observable<AcademicTermDto> {
    return this.http.post<ApiResponse<AcademicTermDto>>(
      `${this.apiUrl}/next`,
      payload || {}
    ).pipe(
      map(res => res.data)
    );
  }

  /**
   * ⑤ Update Planned Dates
   */
  updatePlannedDates(
    termId: string,
    payload: { plannedStartDate?: string; plannedEndDate?: string }
  ): Observable<AcademicTermDto> {
    return this.http.patch<ApiResponse<AcademicTermDto>>(
      `${this.apiUrl}/terms/${encodeURIComponent(termId)}/dates`,
      payload
    ).pipe(
      map(res => res.data)
    );
  }

  /**
   * ⑥ Delete Upcoming Term
   */
  deleteUpcomingTerm(termId: string): Observable<{ id: string }> {
    return this.http.delete<ApiResponse<{ id: string }>>(
      `${this.apiUrl}/terms/${encodeURIComponent(termId)}`
    ).pipe(
      map(res => res.data)
    );
  }
}


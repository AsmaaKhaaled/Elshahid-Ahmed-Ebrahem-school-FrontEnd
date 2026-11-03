import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateStudentPayload {
  fullNameArabic: string;
  nationalId: string;
  studentCode: string;
  gradeLevel: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentStatus: string;
}

export interface InitialCredentials {
  identifier: string;
  nationalId: string;
  initialPassword: string;
  requirePasswordChange: boolean;
}

export interface CreatedStudentData {
  id: string;
  studentCode: string;
  fullNameArabic: string;
  nationalId: string;
  gender?: string;
  dateOfBirth?: string | null;
  gradeLevel: string;
  classId: string;
  class?: {
    name: string;
    displayNameArabic: string;
  };
  enrollmentStatus: string;
  guardianName: string;
  guardianPhone: string;
  initialCredentials?: InitialCredentials;
}

export interface ExcelImportError {
  row: number;
  name?: string;
  error: string;
}

export interface ExcelImportResult {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors?: ExcelImportError[];
  students?: any[];
}

export interface StudentApiResponse<T> {
  success?: boolean;
  status?: string;
  statusCode?: number;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/students`;

  getNextStudentCode(): Observable<StudentApiResponse<{ studentCode: string }>> {
    return this.http.get<StudentApiResponse<{ studentCode: string }>>(`${this.apiUrl}/next-code`);
  }

  createStudent(payload: CreateStudentPayload): Observable<StudentApiResponse<CreatedStudentData>> {
    return this.http.post<StudentApiResponse<CreatedStudentData>>(this.apiUrl, payload);
  }

  getAll(): Observable<StudentApiResponse<any[]>> {
    return this.http.get<StudentApiResponse<any[]>>(this.apiUrl);
  }

  /**
   * رفع واستيراد ملف الإكسيل
   */
  uploadExcel(file: File): Observable<StudentApiResponse<ExcelImportResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<StudentApiResponse<ExcelImportResult>>(`${this.apiUrl}/upload-excel`, formData);
  }

  /**
   * تنزيل قالب الإكسيل الفارغ
   */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/excel-template`, {
      responseType: 'blob'
    });
  }
}

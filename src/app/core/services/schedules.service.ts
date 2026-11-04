import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScheduleSlotInput {
  slotKey?: string;
  dayOfWeek?: number;
  period?: number;
  classId?: string;
  className?: string;
  section?: string;
  subject: string;
  room?: string | null;
}

export interface SaveTeacherSchedulePayload {
  termId: string;
  slots: ScheduleSlotInput[];
}

export interface TimetableConflictDetail {
  dayOfWeek: number;
  dayName: string;
  period: number;
  className: string;
  conflictingTeacherName: string;
  subject: string;
}

export interface TeacherScheduleSlotDto {
  period: number;
  day: number;
  dayName?: string;
  time?: string;
  className: string;
  classId?: string;
  subject: string;
  room?: string | null;
}

export interface TeacherScheduleResponse {
  status: string;
  message?: string;
  data: {
    teacherId: string;
    teacherName: string;
    specialization?: string;
    termId: string;
    weeklyLoad: number;
    schedule: Record<string, TeacherScheduleSlotDto>;
  };
}

export interface SchoolClassPeriodDto {
  subject: string;
  teacherId: string;
  teacherName: string;
  room?: string | null;
  time?: string;
}

export interface SchoolTeacherPeriodDto {
  subject: string;
  classId?: string;
  className: string;
  room?: string | null;
  time?: string;
}

export interface SchoolScheduleResponse {
  status: string;
  data: {
    termId: string;
    totalPeriodsCount: number;
    byClass: Record<string, Record<string, SchoolClassPeriodDto>>;
    byTeacher: Record<string, Record<string, SchoolTeacherPeriodDto>>;
    conflicts: Array<{
      classId: string;
      className: string;
      dayOfWeek: number;
      dayName: string;
      period: number;
      teachers: Array<{ teacherId: string; teacherName: string; subject: string }>;
    }>;
  };
}

export interface MyTeacherScheduleResponse {
  status: string;
  data: {
    teacherId: string;
    teacherName: string;
    specialization?: string;
    termId: string;
    weeklyLoad: number;
    todayPeriodsCount?: number;
    classesCount?: number;
    schedule: Record<string, TeacherScheduleSlotDto>;
  };
}

export interface StudentLessonItem {
  id?: string;
  dayOfWeek: number;
  dayName: string;
  period: number;
  time: string;
  subject: string;
  teacherName: string;
  room?: string | null;
  topic?: string;
}

export interface MyClassScheduleResponse {
  status: string;
  data: {
    className: string;
    gradeLevel?: string;
    termId: string;
    schedule: StudentLessonItem[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class SchedulesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/schedules`;

  /**
   * Save or replace a teacher's weekly schedule (Admin)
   * PUT /api/v1/schedules/teachers/:teacherId
   */
  saveTeacherSchedule(teacherId: string, payload: SaveTeacherSchedulePayload): Observable<TeacherScheduleResponse> {
    return this.http.put<TeacherScheduleResponse>(`${this.baseUrl}/teachers/${teacherId}`, payload);
  }

  /**
   * Get weekly schedule of a specific teacher (Admin & Teacher)
   * GET /api/v1/schedules/teachers/:teacherId?termId=...
   */
  getTeacherSchedule(teacherId: string, termId?: string): Observable<TeacherScheduleResponse> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId);
    return this.http.get<TeacherScheduleResponse>(`${this.baseUrl}/teachers/${teacherId}`, { params });
  }

  /**
   * Get the cumulative school schedule across all classes and teachers (Admin)
   * GET /api/v1/schedules/school?termId=...
   */
  getSchoolSchedule(termId?: string): Observable<SchoolScheduleResponse> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId);
    return this.http.get<SchoolScheduleResponse>(`${this.baseUrl}/school`, { params });
  }

  /**
   * Get the logged-in teacher's weekly schedule (Teacher Portal)
   * GET /api/v1/schedules/my-schedule?termId=...
   */
  getMySchedule(termId?: string): Observable<MyTeacherScheduleResponse> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId);
    return this.http.get<MyTeacherScheduleResponse>(`${this.baseUrl}/my-schedule`, { params });
  }

  /**
   * Get the logged-in student's class weekly schedule (Student Portal)
   * GET /api/v1/schedules/my-class?termId=...
   */
  getMyClassSchedule(termId?: string): Observable<MyClassScheduleResponse> {
    let params = new HttpParams();
    if (termId) params = params.set('termId', termId);
    return this.http.get<MyClassScheduleResponse>(`${this.baseUrl}/my-class`, { params });
  }
}

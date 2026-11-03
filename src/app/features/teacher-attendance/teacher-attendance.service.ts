import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ArchiveFilters, ArchivePage, ArchiveRecord, AttendanceDay, Holiday, PageMeta, SaveRecord } from './teacher-attendance.model';

const BASE = 'teacher-attendance';

interface DayResponse { data: { day: AttendanceDay } }
interface ArchiveResponse { data: { records: ArchiveRecord[]; summary: ArchivePage['summary'] }; meta: PageMeta }
interface ExportResponse { data: { records: ArchiveRecord[] } }
interface HolidaysResponse { data: { holidays: Holiday[] } }
interface HolidayResponse { data: { holiday: Holiday } }

/** Teachers attendance book API (daily sheet, archive of approved days, official days off). */
@Injectable({ providedIn: 'root' })
export class TeacherAttendanceService {
  private readonly api = inject(ApiService);

  getDay(date: string): Observable<AttendanceDay> {
    return this.api.get<DayResponse>(`${BASE}/day/${date}`).pipe(map(res => res.data.day));
  }

  saveDay(date: string, records: SaveRecord[]): Observable<AttendanceDay> {
    return this.api.put<DayResponse>(`${BASE}/day/${date}`, { records }).pipe(map(res => res.data.day));
  }

  closeDay(date: string): Observable<AttendanceDay> {
    return this.api.post<DayResponse>(`${BASE}/day/${date}/close`, {}).pipe(map(res => res.data.day));
  }

  reopenDay(date: string): Observable<AttendanceDay> {
    return this.api.post<DayResponse>(`${BASE}/day/${date}/reopen`, {}).pipe(map(res => res.data.day));
  }

  getArchive(filters: ArchiveFilters, page: number, limit: number): Observable<ArchivePage> {
    return this.api
      .get<ArchiveResponse>(`${BASE}/records`, { ...queryOf(filters), page, limit })
      .pipe(map(res => ({ records: res.data.records, summary: res.data.summary, meta: res.meta })));
  }

  exportArchive(filters: ArchiveFilters): Observable<ArchiveRecord[]> {
    return this.api.get<ExportResponse>(`${BASE}/export`, queryOf(filters)).pipe(map(res => res.data.records));
  }

  getHolidays(): Observable<Holiday[]> {
    return this.api.get<HolidaysResponse>(`${BASE}/holidays`).pipe(map(res => res.data.holidays));
  }

  createHoliday(holiday: Omit<Holiday, 'id'>): Observable<Holiday> {
    return this.api.post<HolidayResponse>(`${BASE}/holidays`, holiday).pipe(map(res => res.data.holiday));
  }

  deleteHoliday(id: string): Observable<void> {
    return this.api.delete<unknown>(`${BASE}/holidays/${id}`).pipe(map(() => undefined));
  }
}

// Empty filters are left out of the query string
function queryOf(filters: ArchiveFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
}

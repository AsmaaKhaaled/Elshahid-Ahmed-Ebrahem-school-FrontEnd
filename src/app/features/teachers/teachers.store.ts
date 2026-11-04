import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SchedulesService, SchoolScheduleResponse } from '../../core/services/schedules.service';
import { compareArabic } from '../../shared/utils/arabic-sort';
import { Teacher, TeacherDto, TermSchedules, WeeklySchedule, teacherFromDto, teacherToBody } from './teacher.model';

// Roles the backend lets read GET /teachers
const READER_ROLES: string[] = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'];

interface TeachersResponse { data: { teachers: TeacherDto[] } }
interface TeacherResponse { data: { teacher: TeacherDto } }

/**
 * Single source of truth for teachers & their weekly schedules, shared by the teachers page,
 * the school timetable, the classes page and the dashboard.
 * Teachers and their schedules are backed by the API.
 */
@Injectable({ providedIn: 'root' })
export class TeachersStore {
  private readonly calendar = inject(AcademicCalendarStore);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly schedulesService = inject(SchedulesService);

  // A→Z, as the backend sends them
  readonly teachers = signal<Teacher[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<unknown>(null);
  private loaded = false;

  readonly schedules = signal<TermSchedules>({});

  // Weekly periods & distinct sections per teacher for the current term
  readonly currentTermLoad = computed(() => {
    const termSchedules = this.schedules()[this.calendar.currentTermId()] ?? {};
    const result: Record<string, { periods: number; sections: number }> = {};
    for (const [teacherId, schedule] of Object.entries(termSchedules)) {
      const slots = Object.values(schedule);
      result[teacherId] = { periods: slots.length, sections: new Set(slots.map(slot => slot.section)).size };
    }
    return result;
  });

  /**
   * Loads the teachers once; pages call it on open. `force` reloads (e.g. after an error).
   * Students & parents can't read the staff list, so nothing is requested for them.
   */
  ensureLoaded(force = false): void {
    if ((this.loaded && !force) || this.loading()) return;
    if (!READER_ROLES.includes(this.auth.userRole() ?? '')) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.api.get<TeachersResponse>('teachers').subscribe({
      next: res => {
        this.teachers.set(res.data.teachers.map(teacherFromDto));
        this.loaded = true;
        this.loading.set(false);
      },
      error: err => {
        this.loadError.set(err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Loads cumulative school schedule from the backend and updates the reactive schedules signal
   */
  loadSchoolSchedule(termId?: string): Observable<SchoolScheduleResponse> {
    const targetTerm = termId || this.calendar.currentTermId();
    return this.schedulesService.getSchoolSchedule(targetTerm).pipe(
      tap(res => {
        const byTeacher = res.data?.byTeacher || {};
        const termSchedule: Record<string, WeeklySchedule> = {};
        for (const [teacherId, slots] of Object.entries(byTeacher)) {
          const teacherSlots: WeeklySchedule = {};
          for (const [key, slot] of Object.entries(slots)) {
            teacherSlots[key] = {
              subject: slot.subject,
              section: slot.className
            };
          }
          termSchedule[teacherId] = teacherSlots;
        }
        this.schedules.update(all => ({
          ...all,
          [targetTerm]: termSchedule
        }));
      })
    );
  }

  /** Classes a teacher can be assigned to, e.g. ["1/1", ..., "3/4"]. */
  classOptions(): Observable<string[]> {
    return this.api.get<{ data: { classes: string[] } }>('teachers/class-options').pipe(map(res => res.data.classes));
  }

  createTeacher(teacher: Teacher, password: string): Observable<Teacher> {
    return this.api.post<TeacherResponse>('teachers', teacherToBody(teacher, password)).pipe(
      map(res => teacherFromDto(res.data.teacher)),
      tap(saved => this.upsert(saved))
    );
  }

  updateTeacher(teacher: Teacher, password: string): Observable<Teacher> {
    return this.api.put<TeacherResponse>(`teachers/${teacher.id}`, teacherToBody(teacher, password)).pipe(
      map(res => teacherFromDto(res.data.teacher)),
      tap(saved => this.upsert(saved))
    );
  }

  deleteTeacher(teacherId: string): Observable<void> {
    return this.api.delete<unknown>(`teachers/${teacherId}`).pipe(
      map(() => undefined),
      tap(() => {
        this.teachers.update(list => list.filter(t => t.id !== teacherId));
        this.schedules.update(all => {
          const next: TermSchedules = {};
          for (const [termId, termSchedules] of Object.entries(all)) {
            const { [teacherId]: _removed, ...rest } = termSchedules;
            next[termId] = rest;
          }
          return next;
        });
      })
    );
  }

  saveSchedule(teacherId: string, termId: string, schedule: WeeklySchedule): void {
    this.schedules.update(all => ({
      ...all,
      [termId]: { ...all[termId], [teacherId]: schedule }
    }));
  }

  private upsert(teacher: Teacher): void {
    this.teachers.update(list =>
      [...list.filter(t => t.id !== teacher.id), teacher].sort((a, b) => compareArabic(a.name, b.name))
    );
  }
}

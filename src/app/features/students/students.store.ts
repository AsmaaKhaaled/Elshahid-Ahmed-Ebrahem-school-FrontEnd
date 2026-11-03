import { Injectable, computed, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Student, StudentStatus } from './student.model';
import { StudentsService } from '../../core/services/students.service';

/** A student as returned by the backend (GET /students, POST / PUT /students/:id) */
export function studentFromApi(s: any): Student {
  const gradeLevel: string = s.gradeLevel || s.class?.gradeLevel || '';
  const className: string = s.class?.name || s.className || '';
  // Grade from the grade level text, or from the class name ("2/3" -> G2) when the level is missing
  const gradeNumber = gradeLevel.includes('الأول') ? 1 : gradeLevel.includes('الثاني') ? 2 : gradeLevel.includes('الثالث') ? 3 : Number(className[0]) || 0;
  return {
    id: s.id,
    code: s.studentCode || s.code || '',
    nationalId: s.nationalId || '',
    name: s.fullNameArabic || s.name || '',
    gradeId: gradeNumber ? `G${gradeNumber}` : '',
    className,
    guardianName: s.guardianName || '',
    guardianPhone: s.guardianPhone || '',
    status: (s.enrollmentStatus || s.status || 'منتظم') as StudentStatus,
    gpa: s.gpa ?? null
  };
}

/**
 * Single source of truth for enrolled students, loaded from the backend (GET /api/v1/students).
 */
@Injectable({ providedIn: 'root' })
export class StudentsStore {
  private readonly studentsService = inject(StudentsService);

  readonly students = signal<Student[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  // Counted by enrollment status (not isActive), one count per status
  readonly metrics = computed(() => {
    const list = this.students();
    const withStatus = (status: StudentStatus) => list.filter(s => s.status === status).length;
    const graded = list.filter(s => s.gpa !== null);
    return {
      total: list.length,
      regular: withStatus('منتظم'),
      stopped: withStatus('موقوف'),
      transferred: withStatus('منقول'),
      // Everyone not regular (as before) - the dashboard's "غير منتظم" figure
      inactive: list.length - withStatus('منتظم'),
      // null = no grades yet (the API doesn't send a GPA), so the card shows "—" rather than a misleading 0
      honor: graded.length ? graded.filter(s => (s.gpa ?? 0) >= 90).length : null
    };
  });

  loadFromApi(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.studentsService.getAll().subscribe({
      next: res => {
        const rawList = res?.data || (Array.isArray(res) ? res : []);
        this.students.set(Array.isArray(rawList) ? rawList.map(studentFromApi) : []);
        this.loading.set(false);
      },
      error: err => {
        this.loadError.set(
          err?.status === 0
            ? 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.'
            : err?.error?.message || 'تعذر تحميل بيانات الطلاب.'
        );
        this.loading.set(false);
      }
    });
  }

  /** Puts a student the backend just saved into the list (new students go first). */
  saveStudent(student: Student): void {
    this.students.update(list =>
      list.some(s => s.id === student.id) ? list.map(s => (s.id === student.id ? student : s)) : [student, ...list]
    );
  }

  /** Deletes the student (and their sign-in account) in the backend, then drops them from the list. */
  deleteStudent(studentId: string): Observable<unknown> {
    return this.studentsService
      .deleteStudent(studentId)
      .pipe(tap(() => this.students.update(list => list.filter(s => s.id !== studentId))));
  }
}

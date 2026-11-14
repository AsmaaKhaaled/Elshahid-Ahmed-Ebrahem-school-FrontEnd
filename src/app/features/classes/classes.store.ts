import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { ClassesService, SchoolClassResponse } from '../../core/services/classes.service';
import { AdvisorAssignment, SchoolClass } from './school-class.model';

function normalizeGradeLevel(gradeLevel: string | undefined, section: string): string {
  if (section.startsWith('1/') || (gradeLevel && (gradeLevel.includes('1st') || gradeLevel.includes('الأول')))) {
    return 'الصف الأول الإعدادي';
  }
  if (section.startsWith('2/') || (gradeLevel && (gradeLevel.includes('2nd') || gradeLevel.includes('الثاني')))) {
    return 'الصف الثاني الإعدادي';
  }
  if (section.startsWith('3/') || (gradeLevel && (gradeLevel.includes('3rd') || gradeLevel.includes('الثالث')))) {
    return 'الصف الثالث الإعدادي';
  }
  return gradeLevel || 'الصف الأول الإعدادي';
}

function mapApiToSchoolClass(cls: SchoolClassResponse, fallbackCapacity = 40): SchoolClass {
  const section = cls.section || cls.name;
  const gradeLevel = normalizeGradeLevel(cls.gradeLevel, section);

  const history: AdvisorAssignment[] = Array.isArray(cls.advisorHistory) && cls.advisorHistory.length > 0
    ? cls.advisorHistory
        .filter(h => !!h.teacherId)
        .map(h => ({
          teacherId: h.teacherId!,
          year: h.year || '2026/2027',
          since: h.since || (h.assignedAt ? h.assignedAt.slice(0, 10) : '2026-09-20'),
          reason: h.reason || 'بداية عام دراسي جديد',
          note: h.note || undefined
        }))
    : (cls.classTeacherId ? [{
        teacherId: cls.classTeacherId,
        year: '2026/2027',
        since: '2026-09-20',
        reason: 'بداية عام دراسي جديد'
      }] : []);

  return {
    id: cls.id || section,
    section,
    gradeLevel,
    enrolledStudents: cls.enrolledStudents ?? cls.currentStudentCount ?? 0,
    capacity: cls.capacity || fallbackCapacity,
    shift: (cls.shift as 'صباحي' | 'مسائي') || 'صباحي',
    advisorHistory: history
  };
}

/**
 * Single source of truth for the school's classes & their advisors,
 * loaded live from the Backend API (GET /api/v1/classes).
 */
@Injectable({ providedIn: 'root' })
export class ClassesStore {
  private readonly structure = inject(SchoolStructureStore);
  private readonly classesService = inject(ClassesService);

  readonly apiClasses = signal<SchoolClass[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  /**
   * The school's classes list: prioritizes live classes from the backend API,
   * with fallback to SchoolStructureStore layout if backend is not yet loaded.
   */
  readonly classes = computed<SchoolClass[]>(() => {
    const list = this.apiClasses();
    if (list.length > 0) return list;

    // Fallback while loading
    return this.structure.grades().flatMap(grade =>
      grade.sections.map(section => ({
        id: section,
        section,
        gradeLevel: grade.label,
        enrolledStudents: 0,
        capacity: this.structure.capacityOf(section),
        shift: 'صباحي' as const,
        advisorHistory: []
      }))
    );
  });

  constructor() {
    this.loadClasses();
  }

  loadClasses(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.classesService.getAll().subscribe({
      next: (data: SchoolClassResponse[]) => {
        this.loading.set(false);
        const mapped = (data || []).map(c => mapApiToSchoolClass(c, this.structure.capacityOf(c.name)));
        this.apiClasses.set(mapped);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('تعذر تحميل بيانات الفصول من الخادم');
      }
    });
  }

  /** Backward-compatibility alias for loadClasses */
  loadEnrollment(): void {
    this.loadClasses();
  }

  assignAdvisor(classId: string, assignment: AdvisorAssignment): Observable<SchoolClassResponse> {
    // 1. Optimistic local update
    this.apiClasses.update(list =>
      list.map(c => {
        if (c.id === classId || c.section === classId) {
          return {
            ...c,
            advisorHistory: [...c.advisorHistory, assignment]
          };
        }
        return c;
      })
    );

    // 2. Persist to Backend API
    return this.classesService.assignAdvisor(classId, {
      teacherId: assignment.teacherId,
      year: assignment.year,
      since: assignment.since,
      reason: assignment.reason,
      note: assignment.note
    }).pipe(
      tap((updated: SchoolClassResponse) => {
        const mapped = mapApiToSchoolClass(updated);
        this.apiClasses.update(list =>
          list.map(c => (c.id === updated.id || c.section === updated.name ? mapped : c))
        );
      })
    );
  }
}

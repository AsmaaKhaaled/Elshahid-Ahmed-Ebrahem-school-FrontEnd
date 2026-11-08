import { Injectable, computed, inject, signal } from '@angular/core';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { ClassesService } from '../../core/services/classes.service';
import { AdvisorAssignment, SchoolClass } from './school-class.model';

/**
 * Single source of truth for the school's classes & their advisors,
 * shared by the classes page and the dashboard.
 * The classes themselves follow this year's setup (SchoolStructureStore).
 */
@Injectable({ providedIn: 'root' })
export class ClassesStore {
  private readonly structure = inject(SchoolStructureStore);
  private readonly classesService = inject(ClassesService);

  // Advisors per class ("2/3" -> history); kept here until the backend stores them
  private readonly advisors = signal<Record<string, AdvisorAssignment[]>>({});
  // Active students per class, from the backend
  private readonly enrolled = signal<Record<string, number>>({});

  readonly classes = computed<SchoolClass[]>(() =>
    this.structure.grades().flatMap(grade =>
      grade.sections.map(section => ({
        id: section,
        section,
        gradeLevel: grade.label,
        enrolledStudents: this.enrolled()[section] ?? 0,
        capacity: this.structure.capacityOf(section),
        shift: 'صباحي' as const,
        advisorHistory: this.advisors()[section] ?? []
      }))
    )
  );

  /** Reads how many students each class has (the classes page calls it on open). */
  loadEnrollment(): void {
    this.classesService.getAll().subscribe({
      next: classes =>
        this.enrolled.set(Object.fromEntries(classes.map(cls => [cls.name, cls.currentStudentCount ?? 0]))),
      error: () => {}
    });
  }

  assignAdvisor(classId: string, assignment: AdvisorAssignment): void {
    this.advisors.update(all => ({ ...all, [classId]: [...(all[classId] ?? []), assignment] }));
  }
}

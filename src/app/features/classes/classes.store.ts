import { Injectable, signal } from '@angular/core';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { AdvisorAssignment, SchoolClass } from './school-class.model';

/**
 * Single source of truth for the school's classes & their advisors,
 * shared by the classes page and the dashboard.
 */
@Injectable({ providedIn: 'root' })
export class ClassesStore {
  // Advisors are picked from the real teachers (they now come from the backend), so none is set up front
  readonly classes = signal<SchoolClass[]>([
    seedClass('c1', '1/1', 0, 42),
    seedClass('c2', '1/2', 0, 41),
    seedClass('c3', '1/3', 0, 40),
    seedClass('c4', '1/4', 0, 39),
    seedClass('c5', '2/1', 1, 43),
    seedClass('c6', '2/2', 1, 42),
    seedClass('c7', '2/3', 1, 40),
    seedClass('c8', '2/4', 1, 47),
    seedClass('c9', '3/1', 2, 44),
    seedClass('c10', '3/2', 2, 43),
    seedClass('c11', '3/3', 2, 41),
    seedClass('c12', '3/4', 2, 42)
  ]);

  assignAdvisor(classId: string, assignment: AdvisorAssignment): void {
    this.classes.update(list =>
      list.map(cls => (cls.id === classId ? { ...cls, advisorHistory: [...cls.advisorHistory, assignment] } : cls))
    );
  }
}

// Demo data until classes come from the backend
function seedClass(id: string, section: string, gradeIndex: number, enrolledStudents: number): SchoolClass {
  return {
    id,
    section,
    gradeLevel: GRADE_LEVELS[gradeIndex].label,
    enrolledStudents,
    shift: 'صباحي',
    advisorHistory: []
  };
}

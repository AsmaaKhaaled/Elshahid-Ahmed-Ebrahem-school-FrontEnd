import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { DEFAULT_CLASS_CAPACITY, GRADE_LEVELS, GradeLevel } from '../constants/school.constants';
import { ApiService } from '../services/api.service';

/** One grade's setup for the year: how many classes it has and how many students each class takes. */
export interface GradeSetup {
  // 1 = first preparatory, ...
  grade: number;
  sections: number;
  capacity: number;
}

interface StructureResponse { data: { grades: GradeSetup[] } }

const DEFAULT_SETUP: GradeSetup[] = GRADE_LEVELS.map((grade, i) => ({
  grade: i + 1,
  sections: grade.sections.length,
  capacity: DEFAULT_CLASS_CAPACITY
}));

// Grade 2 with 3 classes -> ["2/1", "2/2", "2/3"]
export function sectionNames(grade: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${grade}/${i + 1}`);
}

/**
 * The school's classes for this year: how many classes each grade has and their capacity.
 * Set by the admin on the classes page (it changes from year to year); every page that lists
 * classes reads them from here.
 */
@Injectable({ providedIn: 'root' })
export class SchoolStructureStore {
  private readonly api = inject(ApiService);

  readonly setup = signal<GradeSetup[]>(DEFAULT_SETUP);
  private loaded = false;
  private loading = false;

  /** The grades with this year's classes, e.g. G1 -> ["1/1", "1/2", "1/3"]. */
  readonly grades = computed<GradeLevel[]>(() =>
    GRADE_LEVELS.map((grade, i) => ({ ...grade, sections: sectionNames(i + 1, this.setupOf(i + 1).sections) }))
  );

  /** Every class in the school, e.g. ["1/1", ..., "3/4"]. */
  readonly allSections = computed(() => this.grades().flatMap(grade => grade.sections));

  /** Max students in a class, e.g. "2/3" -> 45. */
  capacityOf(section: string): number {
    return this.setupOf(Number(section.split('/')[0])).capacity;
  }

  /** Loads the setup once (the layouts call it); `force` reloads. Keeps the defaults if it fails. */
  ensureLoaded(force = false): void {
    if ((this.loaded && !force) || this.loading) return;
    this.loading = true;
    this.api.get<StructureResponse>('classes/structure').subscribe({
      next: res => {
        this.setup.set(res.data.grades);
        this.loaded = true;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  /** Saves a new setup (admin). The backend refuses to drop a class that still has students. */
  save(setup: GradeSetup[]): Observable<GradeSetup[]> {
    return this.api.put<StructureResponse>('classes/structure', { grades: setup }).pipe(
      map(res => res.data.grades),
      tap(grades => this.setup.set(grades))
    );
  }

  private setupOf(grade: number): GradeSetup {
    return this.setup().find(g => g.grade === grade) ?? { grade, sections: 0, capacity: DEFAULT_CLASS_CAPACITY };
  }
}

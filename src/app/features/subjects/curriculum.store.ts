import { Injectable, inject, signal } from '@angular/core';
import { CurriculumSummary } from './curriculum.model';
import { CurriculumService } from './curriculum.service';

// The dashboards show the latest ones; the curricula page itself pages through all of them
const RECENT_LIMIT = 100;

/**
 * The most recently updated curricula the signed-in user may see (a teacher their own, a student
 * their class's, the administration everyone's), for the dashboards and the platform activity.
 * Loaded once, and again after the curricula page changes something.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumStore {
  private readonly service = inject(CurriculumService);

  readonly recent = signal<CurriculumSummary[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  ensureLoaded(): void {
    if (this.loaded || this.loading()) return;
    this.load();
  }

  /** After a change on the curricula page: the next screen that needs the list gets it fresh. */
  invalidate(): void {
    this.loaded = false;
  }

  private load(): void {
    this.loading.set(true);
    this.service.list({ page: 1, limit: RECENT_LIMIT }).subscribe({
      next: page => {
        this.recent.set(page.curricula);
        this.loaded = true;
        this.loading.set(false);
      },
      // The dashboards just show nothing; the curricula page reports its own errors
      error: () => this.loading.set(false)
    });
  }
}

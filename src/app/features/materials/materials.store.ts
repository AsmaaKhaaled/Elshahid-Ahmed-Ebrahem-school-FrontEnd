import { Injectable, inject, signal } from '@angular/core';
import { Material } from '../teaching/teaching.model';
import { MaterialsService } from './materials.service';

// The dashboards show the latest ones; the materials page itself pages through all of them
const RECENT_LIMIT = 100;

/**
 * The latest materials the signed-in user may see, newest first (a teacher their own, a student
 * their class's, the administration everyone's), for the dashboards and the platform activity.
 */
@Injectable({ providedIn: 'root' })
export class MaterialsStore {
  private readonly service = inject(MaterialsService);

  readonly recent = signal<Material[]>([]);
  readonly loading = signal(false);

  /** Fetched on every visit: this store outlives a sign-out, and the list belongs to who is signed in. */
  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.service.list({ page: 1, limit: RECENT_LIMIT }).subscribe({
      next: page => {
        this.recent.set(page.materials);
        this.loading.set(false);
      },
      // The dashboards just show nothing; the materials page reports its own errors
      error: () => this.loading.set(false)
    });
  }
}

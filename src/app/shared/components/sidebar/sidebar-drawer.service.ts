import { Injectable, signal } from '@angular/core';

/**
 * Below lg the sidebar is a drawer: the navbar's menu button opens it, and picking a page,
 * the backdrop or Escape closes it. From lg up it's always shown and this flag is ignored.
 */
@Injectable({ providedIn: 'root' })
export class SidebarDrawer {
  readonly open = signal(false);

  toggle(): void {
    this.open.update(v => !v);
  }

  close(): void {
    this.open.set(false);
  }
}

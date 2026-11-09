import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  // danger = red button (delete, leave without saving...)
  tone?: 'danger' | 'primary';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (answer: boolean) => void;
}

/**
 * The system's own confirmation dialog, in place of the browser's confirm():
 *   if (!(await confirmService.ask({ title: 'توجد درجات لم يتم حفظها بعد' }))) return;
 * Shown by the notifications host in the app root.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    // A question still open is answered "no" before the new one replaces it
    this.request()?.resolve(false);
    return new Promise(resolve => this.request.set({ tone: 'primary', ...options, resolve }));
  }

  answer(answer: boolean): void {
    const request = this.request();
    if (!request) return;
    this.request.set(null);
    request.resolve(answer);
  }
}

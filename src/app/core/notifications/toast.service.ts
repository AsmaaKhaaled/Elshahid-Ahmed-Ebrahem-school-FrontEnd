import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
}

// How long each kind stays on screen; errors stay longer so they can be read
const DURATION_MS: Record<ToastKind, number> = { success: 3500, info: 4500, warning: 6000, error: 7000 };
// At most this many at once; the oldest goes first
const MAX_TOASTS = 4;

/**
 * Short messages in the corner of the screen ("تم الحفظ بنجاح", "تعذر الاتصال بالخادم"...),
 * shown by the notify interceptor after every save / edit / delete, and by any page that needs one.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string, title?: string): void {
    this.show('success', message, title);
  }

  error(message: string, title?: string): void {
    this.show('error', message, title);
  }

  warning(message: string, title?: string): void {
    this.show('warning', message, title);
  }

  info(message: string, title?: string): void {
    this.show('info', message, title);
  }

  show(kind: ToastKind, message: string, title?: string): void {
    // The same message already on screen (e.g. several requests failing together): show it once
    const shown = this.toasts().find(t => t.kind === kind && t.message === message);
    if (shown) {
      this.startTimer(shown);
      return;
    }
    const toast: Toast = { id: this.nextId++, kind, message, title };
    this.toasts.update(list => [...list, toast].slice(-MAX_TOASTS));
    this.startTimer(toast);
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  /** Keeps a toast while the pointer is over it. */
  hold(id: number): void {
    clearTimeout(this.timers.get(id));
  }

  release(id: number): void {
    const toast = this.toasts().find(t => t.id === id);
    if (toast) this.startTimer(toast);
  }

  private startTimer(toast: Toast): void {
    clearTimeout(this.timers.get(toast.id));
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), DURATION_MS[toast.kind]));
  }
}

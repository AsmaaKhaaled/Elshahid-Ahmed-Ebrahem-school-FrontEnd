import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../../../core/notifications/confirm.service';
import { ToastKind, ToastService } from '../../../core/notifications/toast.service';

const TOAST_STYLES: Record<ToastKind, { bar: string; icon: string; title: string }> = {
  success: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600', title: 'تمت العملية بنجاح' },
  error: { bar: 'bg-rose-500', icon: 'bg-rose-50 text-rose-600', title: 'حدثت مشكلة' },
  warning: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600', title: 'تنبيه' },
  info: { bar: 'bg-primary-600', icon: 'bg-primary-50 text-primary-700', title: 'معلومة' }
};

/**
 * Mounted once in the app root: the toasts stack and the confirmation dialog for every page.
 */
@Component({
  selector: 'app-notifications-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './notifications-host.component.css',
  template: `
    <!-- Toasts: top-left on wide screens, across the top on phones -->
    <div dir="rtl" class="fixed z-[300] top-3 inset-x-3 sm:inset-x-auto sm:left-5 sm:top-5 sm:w-96 flex flex-col gap-2.5 pointer-events-none font-cairo"
      aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        @let style = styles[toast.kind];
        <div class="toast-in pointer-events-auto relative overflow-hidden bg-white rounded-2xl shadow-elevated border border-slate-200/80 pr-4 pl-3 py-3 flex items-start gap-3 text-right"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
          (mouseenter)="toasts.hold(toast.id)" (mouseleave)="toasts.release(toast.id)">
          <span class="absolute inset-y-0 right-0 w-1.5" [class]="style.bar"></span>
          <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" [class]="style.icon">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
              @switch (toast.kind) {
                @case ('success') { <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /> }
                @case ('error') { <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /> }
                @case ('warning') { <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> }
                @default { <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> }
              }
            </svg>
          </span>
          <div class="flex-1 min-w-0 pt-0.5">
            <p class="text-xs font-black text-slate-800">{{ toast.title || style.title }}</p>
            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{{ toast.message }}</p>
          </div>
          <button type="button" (click)="toasts.dismiss(toast.id)" aria-label="إغلاق"
            class="w-7 h-7 -mt-0.5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      }
    </div>

    <!-- Confirmation dialog -->
    @if (confirm.request(); as request) {
      <div dir="rtl" class="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px] font-cairo dialog-fade"
        (click)="confirm.answer(false)" (keydown.escape)="confirm.answer(false)">
        <div role="alertdialog" aria-modal="true" [attr.aria-label]="request.title"
          class="dialog-pop w-full max-w-sm bg-white rounded-3xl shadow-elevated p-6 text-center" (click)="$event.stopPropagation()">
          <span class="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
            [class]="request.tone === 'danger' ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-700'">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </span>
          <h3 class="mt-4 text-base font-black text-slate-800">{{ request.title }}</h3>
          @if (request.message) {
            <p class="mt-2 text-xs text-slate-500 leading-relaxed">{{ request.message }}</p>
          }
          <div class="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
            <button type="button" (click)="confirm.answer(false)"
              class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors">
              {{ request.cancelText || 'إلغاء' }}
            </button>
            <button #confirmButton type="button" (click)="confirm.answer(true)"
              class="flex-1 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-colors"
              [class]="request.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10' : 'bg-primary-800 hover:bg-primary-900 shadow-primary-900/10'">
              {{ request.confirmText || 'تأكيد' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class NotificationsHostComponent {
  readonly toasts = inject(ToastService);
  readonly confirm = inject(ConfirmService);
  readonly styles = TOAST_STYLES;

  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');

  constructor() {
    // Focus the dialog's main button so Enter answers and Escape (on the overlay) cancels
    effect(() => this.confirmButton()?.nativeElement.focus());
  }
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DateFieldComponent } from '../../shared/components/date-field/date-field.component';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { Holiday } from './teacher-attendance.model';

/** Registers an official day off (or a range, e.g. the mid-year break) besides Friday & Saturday. */
@Component({
  selector: 'app-holiday-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, DateFieldComponent, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div appPortalToBody dir="rtl" class="dialog-overlay font-cairo">
      <form #form="ngForm" (ngSubmit)="save(form)" [appSubmitLock]="lock.busy()" novalidate
        class="dialog-panel max-w-md">
        <div class="dialog-head flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-black text-slate-800 text-lg">تسجيل يوم إجازة</h3>
            <p class="text-xs text-slate-500 mt-0.5">الجمعة والسبت إجازة تلقائياً، سجّل هنا أي إجازة رسمية تانية.</p>
          </div>
          <button (click)="closed.emit()" type="button" class="text-slate-400 hover:text-slate-600" aria-label="إغلاق">✕</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <app-date-field label="من يوم" name="startDate" required [(ngModel)]="draft.startDate" error="اختر يوم البداية" />
          <app-date-field label="إلى يوم (اختياري)" name="endDate" [(ngModel)]="draft.endDate" [min]="draft.startDate"
            hint='سيبه فاضي لو الإجازة يوم واحد' />
        </div>

        <mat-form-field class="w-full">
          <mat-label>سبب الإجازة</mat-label>
          <input matInput name="reason" [(ngModel)]="draft.reason" required minlength="2" maxlength="150"
            placeholder="مثال: عيد الأضحى، انتخابات، قرار المحافظ..." />
          <mat-error>اكتب سبب الإجازة</mat-error>
        </mat-form-field>

        @if (localError || serverError()) {
          <p class="text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl px-3 py-2" role="alert">{{ localError || serverError() }}</p>
        }

        <div class="dialog-foot pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
          <button (click)="closed.emit()" type="button" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs">إلغاء</button>
          <button type="submit" [disabled]="lock.busy()"
            class="px-5 py-2 rounded-xl bg-primary-800 text-white font-bold text-xs hover:bg-primary-900 shadow disabled:opacity-60">
            {{ lock.busy() ? 'جاري الحفظ...' : 'تسجيل الإجازة' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class HolidayDialogComponent {
  readonly saving = input(false);
  readonly serverError = input<string | null>(null);
  readonly saved = output<Omit<Holiday, 'id'>>();
  readonly closed = output<void>();

  // Locked from the click until the page closes the dialog (or the request fails)
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });

  draft = { startDate: '', endDate: '', reason: '' };
  localError = '';

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    this.localError = '';
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.localError = 'اختر تاريخ الإجازة واكتب السبب.';
      return;
    }
    if (this.draft.endDate && this.draft.endDate < this.draft.startDate) {
      this.localError = 'تاريخ النهاية لازم يكون بعد تاريخ البداية.';
      return;
    }
    this.lock.run(() =>
      this.saved.emit({
        startDate: this.draft.startDate,
        endDate: this.draft.endDate || this.draft.startDate,
        reason: this.draft.reason.trim()
      })
    );
  }
}

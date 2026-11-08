import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDatepickerInput, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SCHOOL_DATE_PROVIDERS, dateToIso as toIso, isoToDate as toDate } from '../../material/school-date';

/**
 * The one date field of the system: a Material calendar (Arabic, week from Saturday) instead of the
 * browser's own date input. Values stay "YYYY-MM-DD" strings, as everywhere else.
 *
 *   <app-date-field label="من تاريخ" [value]="from()" (valueChange)="setFrom($event)" />
 *   <app-date-field label="تاريخ الامتحان" name="date" required [(ngModel)]="draft.date" error="التاريخ مطلوب" />
 *
 * With [value] the page decides: if it refuses the date (e.g. unsaved changes), the field goes back to its value.
 */
@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: SCHOOL_DATE_PROVIDERS,
  host: { class: 'block' },
  template: `
    <mat-form-field class="w-full" [class.field-compact]="compact()">
      @if (label()) {
        <mat-label>{{ label() }}</mat-label>
      }
      <!-- Read-only: the date is picked on the calendar, so nothing can be typed in the wrong format -->
      <input matInput readonly [matDatepicker]="picker" [value]="date()" [min]="minDate()" [max]="maxDate()"
        [required]="required()" [disabled]="disabled()" [placeholder]="placeholder()" [errorStateMatcher]="errorState"
        [attr.aria-label]="ariaLabel() || label() || null" class="cursor-pointer"
        (click)="picker.open()" (keydown.enter)="picker.open()" (blur)="touched()" (dateChange)="pick($event.value)" />
      <!-- The calendar first, then the clear button after it - in one row so they line up -->
      <span matIconSuffix class="date-field-actions flex items-center">
        <mat-datepicker-toggle [for]="picker" aria-label="فتح التقويم" />
        @if (date() && !required() && !disabled()) {
          <button type="button" (click)="pick(null)" aria-label="مسح التاريخ"
            class="date-field-clear flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[10px] leading-none">✕</button>
        }
      </span>
      <mat-datepicker #picker panelClass="app-datepicker-panel" />
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      @if (error()) {
        <mat-error>{{ error() }}</mat-error>
      }
    </mat-form-field>
  `
})
export class DateFieldComponent implements ControlValueAccessor {
  readonly value = input('');
  readonly label = input('');
  readonly min = input<string | null | undefined>('');
  readonly max = input<string | null | undefined>('');
  readonly required = input(false, { transform: (v: boolean | string) => v !== false && v !== 'false' });
  readonly placeholder = input('اختر التاريخ');
  readonly hint = input('');
  readonly error = input('');
  readonly ariaLabel = input('');
  // 32px tall, for toolbars and filter rows
  readonly compact = input(false, { transform: (v: boolean | string) => v !== false && v !== 'false' });
  readonly valueChange = output<string>();

  // Set when the field is used with ngModel / formControl
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly injector = inject(Injector);
  private readonly dateInput = viewChild.required(MatDatepickerInput<Date>);

  private readonly modelValue = signal('');
  private readonly disabledByForm = signal(false);
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly disabled = this.disabledByForm.asReadonly();
  readonly date = computed(() => toDate(this.ngControl ? this.modelValue() : this.value()));
  readonly minDate = computed(() => toDate(this.min() ?? ''));
  readonly maxDate = computed(() => toDate(this.max() ?? ''));

  // The form's own validation (e.g. required) shows the field in red once touched
  readonly errorState: ErrorStateMatcher = {
    isErrorState: () => !!this.ngControl?.invalid && !!this.ngControl.touched
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  pick(date: Date | null): void {
    const iso = toIso(date);
    if (this.ngControl) {
      this.modelValue.set(iso);
      this.onChange(iso);
      this.touched();
    } else {
      this.valueChange.emit(iso);
      // Show what the page kept: the new date, or the old one if it refused
      afterNextRender(() => (this.dateInput().value = this.date()), { injector: this.injector });
    }
  }

  touched(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.modelValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabledByForm.set(disabled);
  }
}

import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerInput, MatTimepickerModule } from '@angular/material/timepicker';
import { SCHOOL_DATE_PROVIDERS, dateToTime, timeToDate } from '../../material/school-date';

const boolAttr = (v: boolean | string) => v !== false && v !== 'false';

/**
 * The one time field of the system: a Material list of times ("7:30 ص") instead of the browser's own
 * time input. Values stay "HH:mm" strings, as everywhere else. Works like DateFieldComponent:
 *
 *   <app-time-field compact [value]="rec.arrivalTime" (valueChange)="setArrival($event)" />
 *   <app-time-field label="وقت البداية" name="startTime" required [(ngModel)]="draft.startTime" error="الوقت مطلوب" />
 */
@Component({
  selector: 'app-time-field',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatTimepickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: SCHOOL_DATE_PROVIDERS,
  host: { class: 'block' },
  template: `
    <mat-form-field class="w-full" [class.field-compact]="compact()">
      @if (label()) {
        <mat-label>{{ label() }}</mat-label>
      }
      <!-- Read-only: the time is picked from the list, so nothing can be typed in the wrong format -->
      <input matInput readonly [matTimepicker]="picker" [value]="time()" [required]="required()" [disabled]="isDisabled()"
        [placeholder]="placeholder()" [errorStateMatcher]="errorState" [attr.aria-label]="ariaLabel() || label() || null"
        (valueChange)="pick($event)" (blur)="touched()" />
      <mat-timepicker-toggle matIconSuffix [for]="picker" aria-label="اختيار الوقت" />
      <mat-timepicker #picker [interval]="interval()" />
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      @if (error()) {
        <mat-error>{{ error() }}</mat-error>
      }
    </mat-form-field>
  `
})
export class TimeFieldComponent implements ControlValueAccessor {
  readonly value = input('');
  readonly label = input('');
  readonly required = input(false, { transform: boolAttr });
  readonly disabled = input(false, { transform: boolAttr });
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly ariaLabel = input('');
  // Between two choices in the list
  readonly interval = input('5m');
  // 32px tall, for tables and toolbars
  readonly compact = input(false, { transform: boolAttr });
  readonly valueChange = output<string>();

  // Set when the field is used with ngModel / formControl
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly injector = inject(Injector);
  private readonly timeInput = viewChild.required(MatTimepickerInput<Date>);

  private readonly modelValue = signal('');
  private readonly disabledByForm = signal(false);
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());
  readonly time = computed(() => timeToDate(this.ngControl ? this.modelValue() : this.value()));

  // The form's own validation (e.g. required) shows the field in red once touched
  readonly errorState: ErrorStateMatcher = {
    isErrorState: () => !!this.ngControl?.invalid && !!this.ngControl.touched
  };

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  pick(date: Date | null): void {
    const time = dateToTime(date);
    // The timepicker also reports the value it was given; only a real change goes out
    if (time === (this.ngControl ? this.modelValue() : this.value())) return;
    if (this.ngControl) {
      this.modelValue.set(time);
      this.onChange(time);
      this.touched();
    } else {
      this.valueChange.emit(time);
      // Show what the page kept: the new time, or the old one if it refused
      afterNextRender(() => this.timeInput().value.set(this.time()), { injector: this.injector });
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

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AcademicCalendarStore, today } from '../../core/academic/academic-calendar.store';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { arabicCount } from '../../shared/pipes/time-ago.pipe';

const STATUS_LABELS = { current: 'الفصل الحالي', past: 'منتهي', upcoming: 'قادم' } as const;
const STATUS_STYLES = {
  current: 'bg-emerald-50 text-emerald-700',
  past: 'bg-slate-100 text-slate-500',
  upcoming: 'bg-primary-50 text-primary-700'
} as const;

@Component({
  selector: 'app-academic-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe],
  templateUrl: './academic-settings.component.html',
  styleUrl: './academic-settings.component.css'
})
export class AcademicSettingsComponent {
  readonly calendar = inject(AcademicCalendarStore);

  readonly statusLabels = STATUS_LABELS;
  readonly statusStyles = STATUS_STYLES;
  readonly todayDate = new Date();

  readonly current = this.calendar.currentTerm;
  readonly next = this.calendar.termAfterCurrent;
  readonly confirming = signal(false);

  readonly termsNewestFirst = computed(() => [...this.calendar.terms()].reverse());

  // Days until the current term's planned end (null when no date is set)
  readonly daysLeft = computed(() => {
    const plannedEnd = this.current().plannedEndDate;
    return plannedEnd ? Math.round((Date.parse(plannedEnd) - Date.parse(today())) / 86400000) : null;
  });

  daysText(days: number): string {
    return arabicCount(days, 'يوم', 'يومين', 'أيام');
  }

  // Adding a first term means a new academic year
  readonly addLabel = computed(() => {
    const next = this.calendar.nextTermToAdd();
    return next.term === 1 ? `إضافة عام دراسي جديد (${next.year})` : `إضافة ${next.label}`;
  });

  confirmNextTerm(): void {
    this.calendar.startNextTerm();
    this.confirming.set(false);
  }
}

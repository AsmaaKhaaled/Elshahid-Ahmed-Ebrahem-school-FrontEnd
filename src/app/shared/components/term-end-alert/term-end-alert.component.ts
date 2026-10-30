import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicCalendarStore } from '../../../core/academic/academic-calendar.store';
import { AuthService } from '../../../core/auth/auth.service';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';
import { arabicCount } from '../../pipes/time-ago.pipe';

/** Admin-only banner reminding to end the current term when its planned end date is near or passed. */
@Component({
  selector: 'app-term-end-alert',
  standalone: true,
  imports: [RouterLink, ArabicDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './term-end-alert.component.html',
  styleUrl: './term-end-alert.component.css'
})
export class TermEndAlertComponent {
  private readonly calendar = inject(AcademicCalendarStore);
  private readonly authService = inject(AuthService);

  readonly reminder = this.calendar.endReminder;
  readonly term = this.calendar.currentTerm;
  readonly next = this.calendar.termAfterCurrent;

  readonly visible = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  readonly message = computed(() => {
    const alert = this.reminder();
    const label = this.term().label;
    if (!alert) return '';
    if (alert.kind === 'overdue') {
      return `انتهى موعد ${label} منذ ${arabicCount(-alert.daysLeft, 'يوم', 'يومين', 'أيام')}`;
    }
    return alert.daysLeft === 0
      ? `${label} ينتهي النهارده`
      : `${label} ينتهي خلال ${arabicCount(alert.daysLeft, 'يوم', 'يومين', 'أيام')}`;
  });
}

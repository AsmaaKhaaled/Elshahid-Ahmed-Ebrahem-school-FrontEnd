import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { Student, birthDateFromNationalId, gradeOf } from './student.model';

@Component({
  selector: 'app-student-details-dialog',
  standalone: true,
  imports: [PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-details-dialog.component.html',
  styleUrl: './student-details-dialog.component.css'
})
export class StudentDetailsDialogComponent {
  readonly student = input.required<Student>();
  readonly edit = output<Student>();
  readonly closed = output<void>();

  readonly gradeLabel = computed(() => gradeOf(this.student())?.label ?? '—');

  readonly birth = computed(() => {
    const date = birthDateFromNationalId(this.student().nationalId);
    if (!date) return null;
    const now = new Date();
    const age = now.getFullYear() - date.getFullYear() - (now < new Date(now.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0);
    return { label: date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }), age };
  });
}

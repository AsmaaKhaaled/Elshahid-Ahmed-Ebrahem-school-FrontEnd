import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/auth/auth.service';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { Teacher, teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { Assignment, AssignmentStatus, AssignmentsStore, assignmentStatus, submissionRate } from './assignments.store';

// Below this submission rate an assignment is flagged for follow-up
const LOW_SUBMISSION_RATE = 0.6;

@Component({
  selector: 'app-assignments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe, TimeAgoPipe, MatFormFieldModule, MatSelectModule],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css'
})
export class AssignmentsComponent {
  private readonly authService = inject(AuthService);
  private readonly teachersStore = inject(TeachersStore);
  private readonly assignmentsStore = inject(AssignmentsStore);

  readonly assignments = this.assignmentsStore.assignments;
  readonly teachers = this.teachersStore.teachers;
  readonly displayName = teacherDisplayName;
  readonly statusOf = assignmentStatus;
  readonly rateOf = submissionRate;
  readonly lowRate = LOW_SUBMISSION_RATE;
  readonly lowRatePercent = LOW_SUBMISSION_RATE * 100;

  readonly isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  readonly selectedTeacherId = signal<string>('ALL');
  readonly selectedStatus = signal<'ALL' | AssignmentStatus>('ALL');
  readonly statusTabs: { id: 'ALL' | AssignmentStatus; label: string }[] = [
    { id: 'ALL', label: 'الكل' },
    { id: 'نشط ومتاح', label: 'نشطة' },
    { id: 'انتهى الموعد', label: 'منتهية' }
  ];

  readonly filteredAssignments = computed(() => {
    const teacherId = this.selectedTeacherId();
    const status = this.selectedStatus();
    return [...this.assignments()]
      .filter(a => (teacherId === 'ALL' || a.teacherId === teacherId) && (status === 'ALL' || assignmentStatus(a) === status))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });

  readonly stats = computed(() => {
    const list = this.assignments();
    const rates = list.map(submissionRate);
    return {
      total: list.length,
      active: list.filter(a => assignmentStatus(a) === 'نشط ومتاح').length,
      avgRate: rates.length ? Math.round((rates.reduce((sum, r) => sum + r, 0) / rates.length) * 100) : 0,
      lowRate: rates.filter(r => r < LOW_SUBMISSION_RATE).length
    };
  });

  // Every teacher on the staff, including those who haven't published anything yet
  readonly teacherSummary = computed(() =>
    this.teachers()
      .map(teacher => {
        const own = this.assignments().filter(a => a.teacherId === teacher.id);
        const rates = own.map(submissionRate);
        return {
          teacher,
          count: own.length,
          avgRate: rates.length ? Math.round((rates.reduce((sum, r) => sum + r, 0) / rates.length) * 100) : 0,
          lastPublishedAt: own.map(a => a.publishedAt).sort().at(-1) ?? null
        };
      })
      .sort((a, b) => b.count - a.count)
  );

  teacherName(teacherId: string): string {
    const teacher = this.teachers().find(t => t.id === teacherId);
    return teacher ? teacherDisplayName(teacher) : 'معلم سابق';
  }
}

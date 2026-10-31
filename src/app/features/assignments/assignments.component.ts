import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { teacherDisplayName } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';
import { AssignmentsStore, assignmentStatus, submissionRate } from './assignments.store';

// Below this submission rate an assignment is flagged for follow-up
const LOW_SUBMISSION_RATE = 0.6;

/** Assignments page of the teacher & student portals (not part of the admin panel). */
@Component({
  selector: 'app-assignments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe, TimeAgoPipe],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css'
})
export class AssignmentsComponent {
  private readonly teachersStore = inject(TeachersStore);
  private readonly assignmentsStore = inject(AssignmentsStore);

  constructor() {
    this.teachersStore.ensureLoaded();
  }

  readonly statusOf = assignmentStatus;
  readonly rateOf = submissionRate;
  readonly lowRate = LOW_SUBMISSION_RATE;

  // Newest first
  readonly filteredAssignments = computed(() =>
    [...this.assignmentsStore.assignments()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  );

  teacherName(teacherId: string): string {
    const teacher = this.teachersStore.teachers().find(t => t.id === teacherId);
    return teacher ? teacherDisplayName(teacher) : 'معلم سابق';
  }
}

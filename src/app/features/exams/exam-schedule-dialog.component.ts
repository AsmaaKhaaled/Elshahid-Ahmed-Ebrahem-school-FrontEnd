import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { EXAM_TYPES, ExamSchedule, ExamType } from './exams.store';

export interface ExamScheduleDetails {
  type: ExamType;
  gradeId: string;
  title: string;
}

@Component({
  selector: 'app-exam-schedule-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam-schedule-dialog.component.html',
  styleUrl: './exam-schedule-dialog.component.css'
})
export class ExamScheduleDialogComponent implements OnInit {
  // null = create mode
  readonly schedule = input<ExamSchedule | null>(null);
  readonly termLabel = input.required<string>();
  readonly saved = output<ExamScheduleDetails>();
  readonly closed = output<void>();

  readonly types = EXAM_TYPES;
  readonly grades = GRADE_LEVELS;

  draft: ExamScheduleDetails = { type: 'تقييم شهري', gradeId: GRADE_LEVELS[0].id, title: '' };

  ngOnInit(): void {
    const schedule = this.schedule();
    if (schedule) {
      this.draft = { type: schedule.type, gradeId: schedule.gradeId, title: schedule.title };
    }
  }

  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.saved.emit({ ...this.draft, title: this.draft.title.trim() });
  }
}

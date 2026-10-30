import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SCHOOL_SUBJECTS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { ExamEntry, ExamSchedule, addMinutes, formatTime, minutesOf } from './exams.store';

@Component({
  selector: 'app-exam-entry-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam-entry-dialog.component.html',
  styleUrl: './exam-entry-dialog.component.css'
})
export class ExamEntryDialogComponent implements OnInit {
  readonly schedule = input.required<ExamSchedule>();
  // null = add mode
  readonly entry = input<ExamEntry | null>(null);
  readonly saved = output<ExamEntry>();
  readonly closed = output<void>();

  readonly subjects = SCHOOL_SUBJECTS;
  readonly formatTime = formatTime;
  readonly addMinutes = addMinutes;
  readonly error = signal('');

  draft: ExamEntry = { id: '', subject: '', date: '', startTime: '09:00', durationMinutes: 60, totalMarks: 20, notes: '' };

  ngOnInit(): void {
    const entry = this.entry();
    if (entry) {
      this.draft = { ...entry };
    }
  }

  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    // The same grade can't sit two exams at once, and each subject appears once per timetable
    const others = this.schedule().entries.filter(e => e.id !== this.draft.id);
    const duplicate = others.find(e => e.subject === this.draft.subject);
    if (duplicate) {
      this.error.set(`مادة ${duplicate.subject} مدرجة بالفعل في هذا الجدول.`);
      return;
    }

    const start = minutesOf(this.draft.startTime);
    const end = start + this.draft.durationMinutes;
    const overlap = others.find(e => {
      if (e.date !== this.draft.date) return false;
      const otherStart = minutesOf(e.startTime);
      return start < otherStart + e.durationMinutes && otherStart < end;
    });
    if (overlap) {
      this.error.set(`الوقت ده متعارض مع امتحان ${overlap.subject} في نفس اليوم (${formatTime(overlap.startTime)}).`);
      return;
    }

    this.saved.emit({ ...this.draft, notes: this.draft.notes.trim(), id: this.draft.id || crypto.randomUUID() });
  }
}

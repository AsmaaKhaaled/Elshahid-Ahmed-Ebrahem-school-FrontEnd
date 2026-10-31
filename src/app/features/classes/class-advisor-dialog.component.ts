import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { Teacher, teacherDisplayName } from '../teachers/teacher.model';
import { ADVISOR_CHANGE_REASONS, AdvisorAssignment, SchoolClass, currentAdvisor } from './school-class.model';

@Component({
  selector: 'app-class-advisor-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective, ArabicDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './class-advisor-dialog.component.html',
  styleUrl: './class-advisor-dialog.component.css'
})
export class ClassAdvisorDialogComponent implements OnInit {
  readonly schoolClass = input.required<SchoolClass>();
  readonly teachers = input.required<Teacher[]>();
  // teacherId -> section they already advise this year (other classes only)
  readonly advisorsElsewhere = input.required<Record<string, string>>();
  readonly saved = output<AdvisorAssignment>();
  readonly closed = output<void>();

  readonly year = inject(AcademicCalendarStore).currentYear;
  readonly reasons = ADVISOR_CHANGE_REASONS;
  // Locked from the click until the page closes the dialog
  readonly lock = submitLock();

  readonly current = computed(() => currentAdvisor(this.schoolClass(), this.year()));
  readonly history = computed(() => [...this.schoolClass().advisorHistory].reverse());

  // A teacher can advise only one class per year, must be on duty, and must differ from the current advisor
  readonly teacherOptions = computed(() =>
    this.teachers().map(teacher => {
      const elsewhere = this.advisorsElsewhere()[teacher.id];
      let blockedReason = '';
      if (teacher.id === this.current()?.teacherId) {
        blockedReason = 'الرائد الحالي';
      } else if (elsewhere) {
        blockedReason = `رائد فصل ${elsewhere}`;
      } else if (teacher.status !== 'على رأس العمل') {
        blockedReason = teacher.status;
      }
      return { teacher, name: teacherDisplayName(teacher), blockedReason };
    })
  );

  draft = { teacherId: '', reason: '', note: '' };

  ngOnInit(): void {
    // No advisor yet this year -> most likely the start of a new academic year
    if (!this.current()) {
      this.draft.reason = ADVISOR_CHANGE_REASONS[0];
    }
  }

  teacherName(teacherId: string): string {
    const teacher = this.teachers().find(t => t.id === teacherId);
    return teacher ? teacherDisplayName(teacher) : 'معلم لم يعد ضمن هيئة التدريس';
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() =>
      this.saved.emit({
        teacherId: this.draft.teacherId,
        year: this.year(),
        since: new Date().toISOString().slice(0, 10),
        reason: this.draft.reason,
        note: this.draft.reason === 'أخرى' ? this.draft.note.trim() : undefined
      })
    );
  }
}

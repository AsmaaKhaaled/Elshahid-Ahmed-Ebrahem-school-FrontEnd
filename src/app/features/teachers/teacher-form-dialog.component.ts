import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SCHOOL_SUBJECTS, TEACHING_DEPARTMENTS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { TEACHER_HONORIFIC, TEACHER_STATUSES, Teacher } from './teacher.model';

@Component({
  selector: 'app-teacher-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-form-dialog.component.html',
  styleUrl: './teacher-form-dialog.component.css'
})
export class TeacherFormDialogComponent implements OnInit {
  // null = add mode
  readonly teacher = input<Teacher | null>(null);
  readonly saved = output<Teacher>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly honorific = TEACHER_HONORIFIC;
  readonly departments = TEACHING_DEPARTMENTS;
  readonly subjects = SCHOOL_SUBJECTS;
  readonly statuses = TEACHER_STATUSES;
  readonly confirmingDelete = signal(false);

  draft: Teacher = {
    id: '',
    name: '',
    nationalId: '',
    title: '',
    specialization: '',
    email: '',
    phone: '',
    subjects: [],
    status: 'على رأس العمل'
  };

  ngOnInit(): void {
    const teacher = this.teacher();
    if (teacher) {
      this.draft = { ...teacher, subjects: [...teacher.subjects] };
    }
  }

  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.saved.emit({ ...this.draft, name: this.draft.name.trim(), id: this.draft.id || crypto.randomUUID() });
  }
}

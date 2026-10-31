import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS, SCHOOL_SUBJECTS, TEACHING_DEPARTMENTS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TEACHER_HONORIFIC, TEACHER_STATUSES, Teacher } from './teacher.model';

export interface TeacherFormResult {
  teacher: Teacher;
  // Initial sign-in password (add), or a new one to reset it (edit, optional)
  password: string;
}

@Component({
  selector: 'app-teacher-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-form-dialog.component.html',
  styleUrl: './teacher-form-dialog.component.css'
})
export class TeacherFormDialogComponent implements OnInit {
  // null = add mode
  readonly teacher = input<Teacher | null>(null);
  // Class names from the backend; falls back to the school's standard classes
  readonly classOptions = input<string[]>([]);
  readonly saving = input(false);
  readonly serverError = input<string | null>(null);
  readonly saved = output<TeacherFormResult>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly honorific = TEACHER_HONORIFIC;
  readonly departments = TEACHING_DEPARTMENTS;
  readonly subjects = SCHOOL_SUBJECTS;
  readonly statuses = TEACHER_STATUSES;
  readonly confirmingDelete = signal(false);
  // Locked from the click until the page closes the dialog (or the request fails)
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });

  // Classes grouped by grade for the picker: [{ label: 'الأول الإعدادي', sections: ['1/1', ...] }, ...]
  readonly classGroups = computed(() => {
    const options = this.classOptions().length ? this.classOptions() : GRADE_LEVELS.flatMap(g => g.sections);
    const groups = GRADE_LEVELS.map(grade => ({
      label: grade.shortLabel,
      sections: options.filter(name => name.startsWith(`${grade.id.slice(1)}/`))
    }));
    const other = options.filter(name => !groups.some(group => group.sections.includes(name)));
    return other.length ? [...groups, { label: 'فصول أخرى', sections: other }] : groups;
  });

  draft: Teacher = {
    id: '',
    name: '',
    nationalId: '',
    title: '',
    specialization: '',
    email: '',
    phone: '',
    subjects: [],
    classes: [],
    status: 'على رأس العمل'
  };
  password = '';

  ngOnInit(): void {
    const teacher = this.teacher();
    if (teacher) {
      this.draft = { ...teacher, subjects: [...teacher.subjects], classes: [...teacher.classes] };
    }
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() =>
      this.saved.emit({
        teacher: { ...this.draft, name: this.draft.name.trim(), classes: [...this.draft.classes].sort() },
        password: this.password
      })
    );
  }

  confirmDelete(): void {
    this.lock.run(() => this.deleted.emit(this.draft.id));
  }
}

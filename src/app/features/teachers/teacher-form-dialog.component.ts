import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { GRADE_LEVELS, SCHOOL_SUBJECTS, TEACHING_DEPARTMENTS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { normalizeNationalId, normalizePhone } from '../../shared/utils/egyptian-ids';
import { TEACHER_HONORIFIC, TEACHER_STATUSES, Teacher } from './teacher.model';

export interface TeacherFormResult {
  teacher: Teacher;
  // Initial sign-in password (add only; empty on edit)
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
  // Stop (left the school) / bring back a teacher
  readonly deactivated = output<string>();
  readonly activated = output<string>();
  readonly closed = output<void>();

  readonly honorific = TEACHER_HONORIFIC;
  readonly departments = TEACHING_DEPARTMENTS;
  readonly subjects = SCHOOL_SUBJECTS;
  readonly statuses = TEACHER_STATUSES;
  readonly confirmingDelete = signal(false);
  readonly confirmingDeactivate = signal(false);
  // A stopped teacher can only be brought back (or deleted), not edited
  readonly isStopped = computed(() => this.teacher()?.active === false);
  private readonly structure = inject(SchoolStructureStore);
  // Locked from the click until the page closes the dialog (or the request fails)
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });

  // Classes grouped by grade for the picker: [{ label: 'الأول الإعدادي', sections: ['1/1', ...] }, ...]
  readonly classGroups = computed(() => {
    const options = this.classOptions().length ? this.classOptions() : this.structure.allSections();
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
    assignments: [],
    status: 'على رأس العمل',
    active: true
  };
  password = '';

  ngOnInit(): void {
    const teacher = this.teacher();
    if (teacher) {
      this.draft = {
        ...teacher,
        subjects: [...teacher.subjects],
        classes: [...teacher.classes],
        assignments: teacher.subjects.map(subject => ({
          subject,
          classes: [...(teacher.assignments.find(a => a.subject === subject)?.classes ?? [])]
        }))
      };
    }
  }

  /** Keeps one class picker per chosen subject (a subject that stays keeps its classes). */
  onSubjectsChange(subjects: string[]): void {
    this.draft.subjects = subjects;
    this.draft.assignments = subjects.map(
      subject => this.draft.assignments.find(a => a.subject === subject) ?? { subject, classes: [] }
    );
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const assignments = this.draft.assignments.map(a => ({ subject: a.subject, classes: [...a.classes].sort() }));
    const classes = [...new Set(assignments.flatMap(a => a.classes))].sort();
    this.lock.run(() =>
      this.saved.emit({
        teacher: { ...this.draft, name: this.draft.name.trim(), assignments, classes },
        password: this.teacher() ? '' : this.password
      })
    );
  }

  confirmDelete(): void {
    this.lock.run(() => this.deleted.emit(this.draft.id));
  }

  confirmDeactivate(): void {
    this.lock.run(() => this.deactivated.emit(this.draft.id));
  }

  activate(): void {
    this.lock.run(() => this.activated.emit(this.draft.id));
  }

  /** National ID & phone typed with Arabic digits, spaces or dashes are cleaned as they are typed */
  cleanNationalId(value: string): void {
    this.draft.nationalId = normalizeNationalId(value);
  }

  cleanPhone(value: string): void {
    this.draft.phone = normalizePhone(value);
  }
}

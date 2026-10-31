import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { STUDENT_STATUSES, Student, gradeOf, nextStudentCode } from './student.model';

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-form-dialog.component.html',
  styleUrl: './student-form-dialog.component.css'
})
export class StudentFormDialogComponent implements OnInit {
  // null = add mode
  readonly student = input<Student | null>(null);
  // All enrolled students, to keep national IDs & codes unique
  readonly existing = input<Student[]>([]);
  readonly saved = output<Student>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly grades = GRADE_LEVELS;
  readonly statuses = STUDENT_STATUSES;
  readonly confirmingDelete = signal(false);
  readonly duplicateError = signal<string | null>(null);
  // Locked from the click until the page closes the dialog
  readonly lock = submitLock();

  draft: Student = {
    id: '',
    code: '',
    nationalId: '',
    name: '',
    gradeId: GRADE_LEVELS[0].id,
    className: GRADE_LEVELS[0].sections[0],
    guardianName: '',
    guardianPhone: '',
    status: 'منتظم',
    gpa: null
  };

  ngOnInit(): void {
    const student = this.student();
    if (student) {
      this.draft = { ...student };
    } else {
      this.draft.code = nextStudentCode(new Set(this.existing().map(s => s.code)));
    }
  }

  get sections(): string[] {
    return gradeOf(this.draft)?.sections ?? [];
  }

  // Keep the section valid for the newly selected grade
  onGradeChange(): void {
    this.draft.className = this.sections[0] ?? '';
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const others = this.existing().filter(s => s.id !== this.draft.id);
    const code = this.draft.code.trim().toUpperCase();
    const sameId = others.find(s => s.nationalId === this.draft.nationalId);
    if (sameId) {
      this.duplicateError.set(`الرقم القومي مسجل بالفعل للطالب "${sameId.name}"`);
      return;
    }
    if (others.some(s => s.code === code)) {
      this.duplicateError.set(`كود الطالب ${code} مستخدم لطالب آخر`);
      return;
    }

    this.lock.run(() =>
      this.saved.emit({
        ...this.draft,
        code,
        name: this.draft.name.trim().replace(/\s+/g, ' '),
        guardianName: this.draft.guardianName.trim(),
        id: this.draft.id || crypto.randomUUID()
      })
    );
  }

  confirmDelete(): void {
    this.lock.run(() => this.deleted.emit(this.draft.id));
  }
}

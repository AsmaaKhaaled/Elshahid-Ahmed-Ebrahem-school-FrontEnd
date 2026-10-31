import { ChangeDetectionStrategy, Component, DestroyRef, signal, computed, inject, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { StudentDetailsDialogComponent } from './student-details-dialog.component';
import { exportStudents } from './student-excel';
import { StudentFormDialogComponent } from './student-form-dialog.component';
import { StudentImportDialogComponent } from './student-import-dialog.component';
import { STUDENT_STATUSES, Student, gradeOf } from './student.model';
import { StudentsStore } from './students.store';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule, StudentFormDialogComponent, StudentDetailsDialogComponent, StudentImportDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './students.component.html',
  styleUrl: './students.component.css'
})
export class StudentsComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedGrade = signal<string>('ALL');
  readonly selectedStatus = signal<string>('ALL');

  readonly grades = GRADE_LEVELS;
  readonly studentStatuses = STUDENT_STATUSES;

  readonly gradeSections = computed(() => GRADE_LEVELS.find(grade => grade.id === this.selectedGrade())?.sections ?? []);
  // Back to "all sections" whenever the grade filter changes
  readonly selectedSection = linkedSignal<string, string>({ source: this.selectedGrade, computation: () => 'ALL' });

  private readonly store = inject(StudentsStore);
  readonly students = this.store.students;
  readonly metrics = this.store.metrics;

  readonly showForm = signal(false);
  readonly editingStudent = signal<Student | null>(null);
  readonly viewingStudent = signal<Student | null>(null);
  readonly showImport = signal(false);
  readonly exporting = signal(false);
  readonly notice = signal<string | null>(null);

  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
  }

  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const grade = this.selectedGrade();
    const section = this.selectedSection();
    const status = this.selectedStatus();

    return this.students().filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.nationalId.includes(q) || s.guardianPhone.includes(q);
      const matchGrade = grade === 'ALL' || s.gradeId === grade;
      const matchSection = section === 'ALL' || s.className === section;
      const matchStatus = status === 'ALL' || s.status === status;
      return matchSearch && matchGrade && matchSection && matchStatus;
    });
  });

  gradeLabel(student: Student): string {
    return gradeOf(student)?.label ?? '—';
  }

  openForm(student: Student | null): void {
    this.viewingStudent.set(null);
    this.editingStudent.set(student);
    this.showForm.set(true);
  }

  saveStudent(student: Student): void {
    const isNew = !this.editingStudent();
    this.store.saveStudent(student);
    this.showForm.set(false);
    this.showNotice(isNew ? `تم تسجيل الطالب ${student.name}` : `تم حفظ تعديلات ${student.name}`);
  }

  deleteStudent(studentId: string): void {
    this.store.deleteStudent(studentId);
    this.showForm.set(false);
    this.showNotice('تم حذف قيد الطالب');
  }

  importStudents(students: Student[]): void {
    this.store.addStudents(students);
    this.showImport.set(false);
    this.showNotice(`تم تسجيل ${students.length} طالب من ملف Excel بنجاح`);
  }

  async exportExcel(): Promise<void> {
    this.exporting.set(true);
    try {
      await exportStudents(this.filteredStudents());
    } finally {
      this.exporting.set(false);
    }
  }

  private showNotice(message: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 4000);
  }
}

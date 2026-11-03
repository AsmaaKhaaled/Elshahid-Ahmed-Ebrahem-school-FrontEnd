import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, computed, inject, linkedSignal } from '@angular/core';
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
import { CardTableDirective } from '../../shared/directives/card-table.directive';

export interface CredentialNoticeData {
  studentName: string;
  studentCode: string;
  nationalId: string;
  initialPassword: string;
  className: string;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CardTableDirective, FormsModule, MatFormFieldModule, MatSelectModule, StudentFormDialogComponent, StudentDetailsDialogComponent, StudentImportDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './students.component.html',
  styleUrl: './students.component.css'
})
export class StudentsComponent implements OnInit {
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

  // Instant feedback & credentials highlight for newly added student
  readonly newlyAddedStudentId = signal<string | null>(null);
  readonly credentialNotice = signal<CredentialNoticeData | null>(null);
  readonly copiedCred = signal<boolean>(false);

  private noticeTimer?: ReturnType<typeof setTimeout>;
  private newlyAddedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.noticeTimer);
      clearTimeout(this.newlyAddedTimer);
    });
  }

  ngOnInit(): void {
    this.store.loadFromApi();
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

    if (isNew) {
      // 1. Reset all filters and search so the new student is 100% visible immediately in table
      this.searchQuery.set('');
      this.selectedGrade.set('ALL');
      this.selectedSection.set('ALL');
      this.selectedStatus.set('ALL');

      // 2. Visually highlight the newly added student row
      this.newlyAddedStudentId.set(student.id);
      clearTimeout(this.newlyAddedTimer);
      this.newlyAddedTimer = setTimeout(() => this.newlyAddedStudentId.set(null), 8000);

      // 3. Show prominent credentials notice with one-click copy button
      this.credentialNotice.set({
        studentName: student.name,
        studentCode: student.code,
        nationalId: student.nationalId,
        initialPassword: student.initialPassword || 'Student@2026',
        className: student.className
      });

      // 4. Background synchronization with backend API
      this.store.loadFromApi();
    } else {
      this.showNotice(`تم حفظ تعديلات ${student.name}`);
    }
  }

  copyNoticeCredentials(cred: CredentialNoticeData): void {
    const text = `بيانات الدخول لطالب بمدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية:
الاسم: ${cred.studentName}
كود الطالب (اسم المستخدم): ${cred.studentCode}
الرقم القومي: ${cred.nationalId}
كلمة المرور المؤقتة: ${cred.initialPassword}
الفصل: فصل ${cred.className}
رابط الدخول: ${typeof window !== 'undefined' ? window.location.origin : ''}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedCred.set(true);
        setTimeout(() => this.copiedCred.set(false), 3000);
      });
    }
  }

  deleteStudent(studentId: string): void {
    this.store.deleteStudent(studentId);
    this.showForm.set(false);
    this.showNotice('تم حذف قيد الطالب');
  }

  importStudents(students: Student[]): void {
    if (students && students.length > 0) {
      this.store.addStudents(students);
      this.showNotice(`تم استيراد ${students.length} طالب من ملف Excel وتأسيس حساباتهم بنجاح`);
    }
    this.showImport.set(false);
    this.store.loadFromApi();
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

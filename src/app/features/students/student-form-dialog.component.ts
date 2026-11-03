import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { ClassesService, SchoolClass } from '../../core/services/classes.service';
import { CreateStudentPayload, StudentsService } from '../../core/services/students.service';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { STUDENT_STATUSES, Student, nextStudentCode } from './student.model';
import { studentFromApi } from './students.store';

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PortalToBodyDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-form-dialog.component.html',
  styleUrl: './student-form-dialog.component.css'
})
export class StudentFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly classesService = inject(ClassesService);
  private readonly studentsService = inject(StudentsService);

  // Inputs & Outputs
  readonly student = input<Student | null>(null);
  readonly existing = input<Student[]>([]);
  readonly saved = output<Student>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  // Options
  readonly gradeLevels = [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي'
  ];

  // منتظم / موقوف / منقول: the same list as the filter and the Excel template
  readonly enrollmentStatuses = STUDENT_STATUSES;

  // State Signals
  readonly allClasses = signal<SchoolClass[]>([]);
  readonly filteredClasses = signal<SchoolClass[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly serverError = signal<string | null>(null);
  readonly confirmingDelete = signal<boolean>(false);

  // Reactive Form
  readonly form = this.fb.group({
    fullNameArabic: ['', [Validators.required, Validators.minLength(3)]],
    nationalId: ['', [Validators.required, Validators.pattern(/^[23]\d{13}$/)]],
    studentCode: ['', [Validators.required]],
    gradeLevel: ['الصف الأول الإعدادي', [Validators.required]],
    classId: ['', [Validators.required]],
    guardianName: ['', [Validators.required, Validators.minLength(3)]],
    guardianPhone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
    enrollmentStatus: ['منتظم', [Validators.required]]
  });

  // Convenience getters for form controls
  get fullNameArabicControl() { return this.form.get('fullNameArabic'); }
  get nationalIdControl() { return this.form.get('nationalId'); }
  get studentCodeControl() { return this.form.get('studentCode'); }
  get gradeLevelControl() { return this.form.get('gradeLevel'); }
  get classIdControl() { return this.form.get('classId'); }
  get guardianNameControl() { return this.form.get('guardianName'); }
  get guardianPhoneControl() { return this.form.get('guardianPhone'); }
  get enrollmentStatusControl() { return this.form.get('enrollmentStatus'); }

  ngOnInit(): void {
    const currentStudent = this.student();

    // 1. Fetch classes from Backend API
    this.loadClasses(currentStudent);

    // 2. Setup form values depending on add or edit mode
    if (currentStudent) {
      const gradeLabel = currentStudent.gradeId === 'G1' ? 'الصف الأول الإعدادي' :
                         currentStudent.gradeId === 'G2' ? 'الصف الثاني الإعدادي' : 'الصف الثالث الإعدادي';
      this.form.patchValue({
        fullNameArabic: currentStudent.name,
        nationalId: currentStudent.nationalId,
        studentCode: currentStudent.code,
        gradeLevel: gradeLabel,
        guardianName: currentStudent.guardianName,
        guardianPhone: currentStudent.guardianPhone,
        enrollmentStatus: currentStudent.status
      });
    } else {
      // Add mode: fetch next suggested student code from Backend
      this.studentsService.getNextStudentCode().subscribe({
        next: (res) => {
          const code = res?.data?.studentCode;
          if (code) {
            this.form.get('studentCode')?.setValue(code);
          } else {
            this.form.get('studentCode')?.setValue(nextStudentCode(new Set(this.existing().map(s => s.code))));
          }
        },
        error: () => {
          // Fallback if backend next-code endpoint fails
          this.form.get('studentCode')?.setValue(nextStudentCode(new Set(this.existing().map(s => s.code))));
        }
      });
    }

    // 3. Dynamic Cascading Filter for Classes
    this.form.get('gradeLevel')?.valueChanges.subscribe(selectedGrade => {
      if (selectedGrade) {
        this.updateFilteredClasses(selectedGrade);
      }
    });
  }

  private loadClasses(currentStudent: Student | null): void {
    this.classesService.getAll().subscribe({
      next: (classes) => {
        if (classes && classes.length > 0) {
          this.allClasses.set(classes);
        } else {
          this.allClasses.set(this.generateFallbackClasses());
        }
        this.applyInitialClassSelection(currentStudent);
      },
      error: () => {
        this.allClasses.set(this.generateFallbackClasses());
        this.applyInitialClassSelection(currentStudent);
      }
    });
  }

  private applyInitialClassSelection(currentStudent: Student | null): void {
    const selectedGrade = this.form.get('gradeLevel')?.value || 'الصف الأول الإعدادي';
    this.updateFilteredClasses(selectedGrade);

    if (currentStudent) {
      const match = this.filteredClasses().find(c =>
        c.name === currentStudent.className || c.displayNameArabic?.includes(currentStudent.className)
      );
      if (match) {
        this.form.get('classId')?.setValue(match.id);
      }
    } else {
      if (!this.form.get('classId')?.value && this.filteredClasses().length > 0) {
        this.form.get('classId')?.setValue(this.filteredClasses()[0].id);
      }
    }
  }

  private updateFilteredClasses(selectedGrade: string): void {
    const filtered = this.allClasses().filter(c =>
      c.gradeLevel === selectedGrade || c.displayNameArabic?.includes(selectedGrade)
    );
    this.filteredClasses.set(filtered);

    const currentClassId = this.form.get('classId')?.value;
    const stillValid = filtered.some(c => c.id === currentClassId);
    if (!stillValid) {
      this.form.get('classId')?.setValue(filtered[0]?.id || '');
    }
  }

  private generateFallbackClasses(): SchoolClass[] {
    const list: SchoolClass[] = [];
    GRADE_LEVELS.forEach(g => {
      g.sections.forEach(s => {
        list.push({
          id: `class-${g.id}-${s}`,
          name: s,
          displayNameArabic: `${g.label} - فصل ${s}`,
          gradeLevel: g.label
        });
      });
    });
    return list;
  }

  onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const studentCode = (raw.studentCode || '').trim().toUpperCase();
    const nationalId = (raw.nationalId || '').trim();
    const fullNameArabic = (raw.fullNameArabic || '').trim();
    const guardianName = (raw.guardianName || '').trim();
    const guardianPhone = (raw.guardianPhone || '').trim();
    const gradeLevel = raw.gradeLevel || 'الصف الأول الإعدادي';
    const classId = raw.classId || '';
    const enrollmentStatus = raw.enrollmentStatus || 'منتظم';

    const currentStudent = this.student();

    // Client-side uniqueness check if existing list is provided
    const others = this.existing().filter(s => s.id !== currentStudent?.id);
    const sameId = others.find(s => s.nationalId === nationalId);
    if (sameId) {
      this.serverError.set(`الرقم القومي مسجل بالفعل للطالب "${sameId.name}"`);
      return;
    }
    if (others.some(s => s.code === studentCode)) {
      this.serverError.set(`كود الطالب ${studentCode} مستخدم لطالب آخر`);
      return;
    }

    const payload: CreateStudentPayload = {
      fullNameArabic,
      nationalId,
      studentCode,
      gradeLevel,
      classId,
      guardianName,
      guardianPhone,
      enrollmentStatus
    };

    this.isSubmitting.set(true);

    if (!currentStudent) {
      // POST to Backend API
      this.studentsService.createStudent(payload).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const data = res?.data;
          const initialPassword = data?.initialCredentials?.initialPassword || 'Student@2026';
          // Immediately emit saved student to update table instantly!
          this.emitSavedStudent(data || payload, initialPassword);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const backendMessage =
            err?.error?.message ||
            err?.error?.details?.[0]?.message ||
            'حدث خطأ أثناء حفظ قيد الطالب بالمنظومة. يرجى مراجعة البيانات.';
          this.serverError.set(backendMessage);
        }
      });
    } else {
      // Update Mode: PUT to Backend API, then show what the backend saved
      this.studentsService.updateStudent(currentStudent.id, payload).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.saved.emit({ ...studentFromApi(res?.data ?? {}), id: currentStudent.id, gpa: currentStudent.gpa });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.serverError.set(
            err?.error?.message ||
            err?.error?.errors?.[0]?.message ||
            'تعذر حفظ تعديلات الطالب. يرجى مراجعة البيانات.'
          );
        }
      });
    }
  }

  // The student the backend saved (its class & grade as the server resolved them), same mapper as the edit flow
  private emitSavedStudent(data: any, initialPassword?: string): void {
    const saved = studentFromApi(data);
    // Only if the response has no class object: the class picked in the form (the one sent to the backend)
    const className = saved.className || this.allClasses().find(c => c.id === data.classId)?.name || '';
    const gradeNumber = Number(className[0]);

    this.saved.emit({
      ...saved,
      id: saved.id || crypto.randomUUID(),
      className,
      gradeId: saved.gradeId || (gradeNumber ? `G${gradeNumber}` : ''),
      gpa: null,
      initialPassword: initialPassword || data.initialCredentials?.initialPassword
    });
  }

  confirmDelete(): void {
    const current = this.student();
    if (current) {
      this.deleted.emit(current.id);
    }
  }
}

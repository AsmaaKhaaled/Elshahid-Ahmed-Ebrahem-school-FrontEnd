import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { TEACHING_DEPARTMENTS } from '../../core/constants/school.constants';
import { TeacherFormDialogComponent, TeacherFormResult } from './teacher-form-dialog.component';
import { TeacherScheduleDialogComponent } from './teacher-schedule-dialog.component';
import { Teacher, WeeklySchedule, teacherDisplayName } from './teacher.model';
import { TeachersStore } from './teachers.store';
import { PlatformActivityStore, presenceOf } from '../platform-activity/platform-activity.store';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule, TeacherFormDialogComponent, TeacherScheduleDialogComponent, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teachers.component.html',
  styleUrl: './teachers.component.css'
})
export class TeachersComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedDepartment = signal<string>('ALL');

  readonly departments = TEACHING_DEPARTMENTS;
  readonly currentTerm = inject(AcademicCalendarStore).currentTerm;
  readonly displayName = teacherDisplayName;

  readonly showForm = signal(false);
  readonly editingTeacher = signal<Teacher | null>(null);
  readonly scheduleTeacher = signal<Teacher | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly classOptions = signal<string[]>([]);
  readonly notice = signal<string | null>(null);

  private readonly store = inject(TeachersStore);
  readonly teachers = this.store.teachers;
  readonly loading = this.store.loading;
  readonly loadError = computed(() =>
    this.store.loadError() ? errorMessage(this.store.loadError(), 'تعذر تحميل المعلمين.') : null
  );
  readonly schedules = this.store.schedules;
  readonly currentTermLoad = this.store.currentTermLoad;
  readonly lastSeen = inject(PlatformActivityStore).teacherLastSeen;

  constructor() {
    this.store.ensureLoaded();
    this.store.classOptions().subscribe({ next: classes => this.classOptions.set(classes), error: () => {} });
  }

  isOnline(lastSeen: string): boolean {
    return presenceOf(lastSeen) === 'online';
  }

  readonly filteredTeachers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDepartment();

    return this.teachers().filter(t => {
      const matchSearch = !q || teacherDisplayName(t).toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q) || t.phone.includes(q);
      const matchDept = dept === 'ALL' || t.specialization.includes(dept);
      return matchSearch && matchDept;
    });
  });

  reload(): void {
    this.store.ensureLoaded(true);
  }

  openForm(teacher: Teacher | null): void {
    this.editingTeacher.set(teacher);
    this.formError.set(null);
    this.showForm.set(true);
  }

  saveTeacher({ teacher, password }: TeacherFormResult): void {
    const isNew = !this.editingTeacher();
    this.saving.set(true);
    this.formError.set(null);
    const request$ = isNew ? this.store.createTeacher(teacher, password) : this.store.updateTeacher(teacher, password);
    request$.subscribe({
      next: saved => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set(isNew ? `تمت إضافة ${teacherDisplayName(saved)}، ويقدر يدخل البوابة بالرقم القومي.` : 'تم حفظ بيانات المعلم.');
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(errorMessage(err, 'تعذر حفظ بيانات المعلم.'));
      }
    });
  }

  deleteTeacher(teacherId: string): void {
    this.saving.set(true);
    this.formError.set(null);
    this.store.deleteTeacher(teacherId).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set('تم حذف المعلم.');
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(errorMessage(err, 'تعذر حذف المعلم.'));
      }
    });
  }

  saveSchedule(teacherId: string, termId: string, schedule: WeeklySchedule): void {
    this.store.saveSchedule(teacherId, termId, schedule);
    this.scheduleTeacher.set(null);
  }
}

// Duplicate national ID / email messages come from the backend in Arabic
function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  if ([400, 404, 409].includes(err.status) && typeof err.error?.message === 'string') return err.error.message;
  if (err.status === 422) return 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.';
  if (err.status === 403) return 'ليس لديك صلاحية إدارة هيئة التدريس.';
  return fallback;
}

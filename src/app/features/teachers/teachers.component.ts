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
import { apiErrorMessage } from '../../shared/utils/api-error';

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
    this.store.loadSchoolSchedule().subscribe({ error: () => {} });
    this.store.classOptions().subscribe({ next: classes => this.classOptions.set(classes), error: () => {} });
  }

  isOnline(lastSeen: string): boolean {
    return presenceOf(lastSeen) === 'online';
  }

  // Teachers still at the school by default; stopped ones (left the school) on demand
  readonly selectedState = signal<'ACTIVE' | 'STOPPED' | 'ALL'>('ACTIVE');
  readonly stoppedCount = computed(() => this.teachers().filter(t => !t.active).length);

  readonly filteredTeachers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDepartment();
    const state = this.selectedState();

    return this.teachers().filter(t => {
      const matchSearch = !q || teacherDisplayName(t).toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q) || t.phone.includes(q);
      const matchDept = dept === 'ALL' || t.specialization.includes(dept);
      const matchState = state === 'ALL' || (state === 'ACTIVE' ? t.active : !t.active);
      return matchSearch && matchDept && matchState;
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

  /** Stops a teacher who left the school: their account is closed at once and their records stay. */
  deactivateTeacher(teacherId: string): void {
    this.saving.set(true);
    this.formError.set(null);
    this.store.deactivateTeacher(teacherId).subscribe({
      next: ({ teacher, removedPeriods }) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set(
          `تم إيقاف ${teacherDisplayName(teacher)}: حسابه اتقفل ومش هيقدر يدخل المنظومة` +
            (removedPeriods ? `، واتشالت ${removedPeriods} حصة من الجدول.` : '.') +
            ' سجلاته القديمة محفوظة.'
        );
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(errorMessage(err, 'تعذر إيقاف المعلم.'));
      }
    });
  }

  activateTeacher(teacherId: string): void {
    this.saving.set(true);
    this.formError.set(null);
    this.store.activateTeacher(teacherId).subscribe({
      next: teacher => {
        this.saving.set(false);
        this.showForm.set(false);
        this.selectedState.set('ACTIVE');
        this.notice.set(`تم تفعيل ${teacherDisplayName(teacher)} ويقدر يدخل المنظومة تاني. افتح "تعديل البيانات" وحدد مواده وفصوله من جديد.`);
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(errorMessage(err, 'تعذر تفعيل المعلم.'));
      }
    });
  }

  saveSchedule(teacherId: string, termId: string, schedule: WeeklySchedule): void {
    this.store.saveSchedule(teacherId, termId, schedule);
    this.scheduleTeacher.set(null);
    this.notice.set('تم حفظ واعتماد جدول المعلم بنجاح.');
  }
}

// The backend explains every refusal in Arabic (duplicate national ID, teacher with records, ...)
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.status === 403) return 'ليس لديك صلاحية إدارة هيئة التدريس.';
  return apiErrorMessage(err, fallback);
}

import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { TEACHING_DEPARTMENTS } from '../../core/constants/school.constants';
import { TeacherFormDialogComponent } from './teacher-form-dialog.component';
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

  private readonly store = inject(TeachersStore);
  readonly teachers = this.store.teachers;
  readonly schedules = this.store.schedules;
  readonly currentTermLoad = this.store.currentTermLoad;
  readonly lastSeen = inject(PlatformActivityStore).teacherLastSeen;

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

  openForm(teacher: Teacher | null): void {
    this.editingTeacher.set(teacher);
    this.showForm.set(true);
  }

  saveTeacher(teacher: Teacher): void {
    this.store.saveTeacher(teacher);
    this.showForm.set(false);
  }

  deleteTeacher(teacherId: string): void {
    this.store.deleteTeacher(teacherId);
    this.showForm.set(false);
  }

  saveSchedule(teacherId: string, termId: string, schedule: WeeklySchedule): void {
    this.store.saveSchedule(teacherId, termId, schedule);
    this.scheduleTeacher.set(null);
  }
}
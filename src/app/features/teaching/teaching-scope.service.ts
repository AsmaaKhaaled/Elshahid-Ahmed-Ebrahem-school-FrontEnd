import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { TeachersStore } from '../teachers/teachers.store';

// Demo fallbacks while accounts don't carry their classes yet (same classes as the teacher dashboard)
const DEMO_TEACHER_SECTIONS = ['3/2', '3/3', '3/4'];
const DEMO_TEACHER_SUBJECT = 'الرياضيات';
const DEMO_STUDENT_SECTION = '3/2';

/** `wanted` (e.g. a class from the link) if it's one of the options, else the first option. */
export function pickOption(wanted: string | null, options: string[]): string {
  return wanted && options.includes(wanted) ? wanted : (options[0] ?? '');
}

/**
 * Who is signed in, as far as teaching content goes:
 * a teacher publishes only to the classes & subjects assigned to them,
 * a student only sees what was published to their own class.
 */
@Injectable({ providedIn: 'root' })
export class TeachingScope {
  private readonly auth = inject(AuthService);
  private readonly teachersStore = inject(TeachersStore);

  readonly isTeacher = computed(() => this.auth.userRole() === 'TEACHER');
  readonly isStudent = computed(() => ['STUDENT', 'PARENT'].includes(this.auth.userRole() ?? ''));

  // The signed-in teacher's record in the staff list (matched by id, then national ID)
  private readonly teacher = computed(() => {
    const user = this.auth.currentUser();
    if (!user || !this.isTeacher()) return null;
    return (
      this.teachersStore.teachers().find(t => t.id === user.id || (!!user.nationalId && t.nationalId === user.nationalId)) ?? null
    );
  });

  readonly teacherId = computed(() => this.teacher()?.id ?? this.auth.currentUser()?.id ?? '');

  /** Classes the signed-in teacher teaches, e.g. ["3/2", "3/3"]. */
  readonly sections = computed<string[]>(() => {
    const profile = this.auth.teacherProfile();
    const sections =
      this.teacher()?.classes ?? profile?.classes?.map(c => c.name) ?? profile?.assignedClasses ?? [];
    return sections.length ? sections : DEMO_TEACHER_SECTIONS;
  });

  /** Subjects the signed-in teacher teaches. */
  readonly subjects = computed<string[]>(() => {
    const profile = this.auth.teacherProfile();
    const subjects =
      this.teacher()?.subjects ?? profile?.subjects?.map(s => s.nameArabic) ?? profile?.assignedSubjects ?? [];
    if (subjects.length) return subjects;
    return [profile?.specialization || DEMO_TEACHER_SUBJECT];
  });

  // Which classes each subject is taught to, as the admin assigned them (no demo fallback)
  readonly subjectAssignments = computed<{ subject: string; classes: string[] }[]>(
    () => this.teacher()?.assignments ?? this.auth.teacherProfile()?.teachingAssignments ?? []
  );

  /** Classes the signed-in teacher teaches `subject` to (all their classes if none were set per subject). */
  sectionsFor(subject: string): string[] {
    const classes = this.subjectAssignments().find(a => a.subject === subject)?.classes;
    return classes?.length ? classes : this.sections();
  }

  /** Drops the picked classes that `subject` isn't taught to (after the subject changes). */
  keepSections(subject: string, sections: string[]): string[] {
    const taught = this.sectionsFor(subject);
    return sections.filter(section => taught.includes(section));
  }

  /** Subjects the signed-in teacher teaches to `section`. */
  subjectsFor(section: string): string[] {
    const subjects = this.subjects().filter(subject => this.sectionsFor(subject).includes(section));
    return subjects.length ? subjects : this.subjects();
  }

  ensureLoaded(): void {
    this.teachersStore.ensureLoaded();
  }

  readonly studentId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly studentName = computed(() => this.auth.userName());

  /** The signed-in student's class, e.g. "3/2". */
  readonly studentSection = computed(() => {
    const user = this.auth.currentUser();
    const profile = this.auth.studentProfile();
    return profile?.class?.name || profile?.className || user?.className || DEMO_STUDENT_SECTION;
  });
}

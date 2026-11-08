import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { GradeLevel } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { Curriculum, CurriculumDraft, gradeOfSection } from './curriculum.model';

/** Starts (or edits) the curriculum of one of the teacher's subjects for one grade. */
@Component({
  selector: 'app-curriculum-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curriculum-form-dialog.component.html'
})
export class CurriculumFormDialogComponent implements OnInit {
  readonly scope = inject(TeachingScope);
  private readonly structure = inject(SchoolStructureStore);

  // null = new curriculum
  readonly curriculum = input<Curriculum | null>(null);
  // Pre-selected subject for a new one
  readonly subject = input('');
  readonly saving = input(false);
  // From the server, e.g. one curriculum per subject & grade
  readonly serverError = input<string | null>(null);
  readonly saved = output<CurriculumDraft>();
  readonly closed = output<void>();

  // Locked from the click until the page closes the dialog (or the request fails)
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });

  draft: CurriculumDraft = { subject: '', gradeId: '', sections: [], description: '' };

  /** Grades the teacher teaches the chosen subject in (all grades if their classes aren't known). */
  grades(): GradeLevel[] {
    const all = this.structure.grades();
    const taught = new Set(this.scope.sectionsFor(this.draft.subject).map(gradeOfSection));
    const grades = all.filter(grade => taught.has(grade.id));
    return grades.length ? grades : all;
  }

  /** The teacher's classes for the chosen subject in the chosen grade. */
  sectionOptions(): string[] {
    const grade = this.structure.grades().find(g => g.id === this.draft.gradeId);
    if (!grade) return [];
    const mine = this.scope.sectionsFor(this.draft.subject).filter(s => grade.sections.includes(s));
    return mine.length ? mine : grade.sections;
  }

  // Another subject may be taught in other grades / classes
  selectSubject(subject: string): void {
    this.draft.subject = subject;
    const grades = this.grades();
    if (!grades.some(g => g.id === this.draft.gradeId)) {
      this.draft.gradeId = '';
      this.draft.sections = [];
      if (grades.length === 1) this.selectGrade(grades[0].id);
    } else {
      this.draft.sections = this.scope.keepSections(subject, this.draft.sections);
    }
  }

  ngOnInit(): void {
    const curriculum = this.curriculum();
    if (curriculum) {
      const { subject, gradeId, sections, description } = curriculum;
      this.draft = { subject, gradeId, sections: [...sections], description };
      return;
    }
    const subjects = this.scope.subjects();
    this.draft.subject = this.subject() || (subjects.length === 1 ? subjects[0] : '');
    const grades = this.grades();
    if (grades.length === 1) this.selectGrade(grades[0].id);
  }

  // A new grade starts with all of the teacher's classes in it
  selectGrade(gradeId: string): void {
    this.draft.gradeId = gradeId;
    this.draft.sections = this.sectionOptions();
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() => this.saved.emit({ ...this.draft, description: this.draft.description.trim() }));
  }
}

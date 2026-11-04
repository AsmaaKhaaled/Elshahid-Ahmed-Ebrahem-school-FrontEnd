import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
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

  /** Grades the teacher has classes in (all grades if their classes aren't known). */
  grades(): typeof GRADE_LEVELS {
    const taught = new Set(this.scope.sections().map(gradeOfSection));
    const grades = GRADE_LEVELS.filter(grade => taught.has(grade.id));
    return grades.length ? grades : GRADE_LEVELS;
  }

  /** The teacher's classes in the chosen grade. */
  sectionOptions(): string[] {
    const grade = GRADE_LEVELS.find(g => g.id === this.draft.gradeId);
    if (!grade) return [];
    const mine = this.scope.sections().filter(s => grade.sections.includes(s));
    return mine.length ? mine : grade.sections;
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

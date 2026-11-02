import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { Curriculum, gradeOfSection } from './curriculum.model';
import { CurriculumStore } from './curriculum.store';

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
  private readonly store = inject(CurriculumStore);

  // null = new curriculum
  readonly curriculum = input<Curriculum | null>(null);
  // Pre-selected subject for a new one
  readonly subject = input('');
  readonly saved = output<Curriculum>();
  readonly closed = output<void>();

  readonly lock = submitLock();
  readonly duplicateError = signal(false);

  draft: Curriculum = { id: '', teacherId: '', subject: '', gradeId: '', sections: [], description: '', units: [], files: [], updatedAt: '' };

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
      this.draft = { ...curriculum, sections: [...curriculum.sections] };
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
    this.duplicateError.set(false);
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    const teacherId = this.draft.teacherId || this.scope.teacherId();
    // One curriculum per subject & grade for the same teacher
    this.duplicateError.set(
      this.store.curricula().some(
        c => c.id !== this.draft.id && c.teacherId === teacherId && c.subject === this.draft.subject && c.gradeId === this.draft.gradeId
      )
    );
    if (form.invalid || this.duplicateError()) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() =>
      this.saved.emit({
        ...this.draft,
        description: this.draft.description.trim(),
        id: this.draft.id || crypto.randomUUID(),
        teacherId
      })
    );
  }
}

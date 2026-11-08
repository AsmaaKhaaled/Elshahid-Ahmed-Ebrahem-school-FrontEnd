import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GradeSetup, sectionNames } from '../../core/academic/school-structure.store';
import { GRADE_LEVELS, MAX_CLASS_CAPACITY, MAX_SECTIONS_PER_GRADE } from '../../core/constants/school.constants';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';

/** The admin sets this year's number of classes per grade and their capacity. */
@Component({
  selector: 'app-class-structure-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './class-structure-dialog.component.html'
})
export class ClassStructureDialogComponent implements OnInit {
  readonly setup = input.required<GradeSetup[]>();
  readonly year = input('');
  readonly saving = input(false);
  // e.g. a class that would be removed still has students
  readonly serverError = input<string | null>(null);
  readonly saved = output<GradeSetup[]>();
  readonly closed = output<void>();

  readonly maxCapacity = MAX_CLASS_CAPACITY;
  readonly maxSections = MAX_SECTIONS_PER_GRADE;
  // Locked from the click until the page closes the dialog (or the request fails)
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });

  draft: GradeSetup[] = [];

  ngOnInit(): void {
    this.draft = this.setup().map(grade => ({ ...grade }));
  }

  gradeLabel(grade: number): string {
    return GRADE_LEVELS[grade - 1]?.label ?? `الصف ${grade}`;
  }

  /** e.g. "2/1، 2/2، 2/3" - what the grade's classes will be called. */
  sectionsPreview(setup: GradeSetup): string {
    return sectionNames(setup.grade, Number(setup.sections) || 0).join('، ');
  }

  /** Classes that will be removed compared with the current setup (they must have no students). */
  removed(setup: GradeSetup): string[] {
    const current = this.setup().find(g => g.grade === setup.grade)?.sections ?? 0;
    return sectionNames(setup.grade, current).slice(Number(setup.sections) || 0);
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() =>
      this.saved.emit(this.draft.map(g => ({ grade: g.grade, sections: Number(g.sections), capacity: Number(g.capacity) })))
    );
  }
}

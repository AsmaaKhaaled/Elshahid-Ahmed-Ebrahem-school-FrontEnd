import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { CurriculumLesson, CurriculumUnit } from './curriculum.model';

/** A curriculum unit and its lessons (with their week in the term plan). */
@Component({
  selector: 'app-curriculum-unit-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curriculum-unit-dialog.component.html'
})
export class CurriculumUnitDialogComponent implements OnInit {
  // null = new unit
  readonly unit = input<CurriculumUnit | null>(null);
  readonly saved = output<CurriculumUnit>();
  readonly closed = output<void>();

  readonly lock = submitLock();
  readonly lessonsError = signal(false);

  title = '';
  lessons: CurriculumLesson[] = [];

  ngOnInit(): void {
    const unit = this.unit();
    if (unit) {
      this.title = unit.title;
      this.lessons = unit.lessons.map(l => ({ ...l }));
    } else {
      this.addLesson();
    }
  }

  addLesson(): void {
    // Next week after the last one set
    const lastWeek = [...this.lessons].reverse().find(l => l.week)?.week ?? null;
    this.lessons = [...this.lessons, { id: crypto.randomUUID(), title: '', week: lastWeek ? Math.min(lastWeek + 1, 20) : null, doneAt: null }];
  }

  removeLesson(id: string): void {
    this.lessons = this.lessons.filter(l => l.id !== id);
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    const lessons = this.lessons
      .map(l => ({ ...l, title: l.title.trim(), week: l.week ? Math.round(l.week) : null }))
      .filter(l => l.title);
    this.lessonsError.set(!lessons.length);
    if (form.invalid || this.lessonsError()) {
      form.control.markAllAsTouched();
      return;
    }
    this.lock.run(() => this.saved.emit({ id: this.unit()?.id ?? crypto.randomUUID(), title: this.title.trim(), lessons }));
  }
}

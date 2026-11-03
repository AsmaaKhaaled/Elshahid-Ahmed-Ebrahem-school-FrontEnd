import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { TeachingFilesComponent } from '../teaching/teaching-files.component';
import { FILE_ACCEPT, TeachingFile, readPickedFiles } from '../teaching/teaching.model';
import { Curriculum, CurriculumPlanWeek } from './curriculum.model';

/** A week being edited: the objectives as one text, one per line */
interface DraftWeek {
  id: string;
  topic: string;
  objectives: string;
}

export interface CurriculumPlan {
  plan: CurriculumPlanWeek[];
  planFile?: TeachingFile;
}

/** The teacher writes the curriculum plan & objectives week by week, and/or uploads their plan document. */
@Component({
  selector: 'app-curriculum-plan-dialog',
  standalone: true,
  imports: [FormsModule, PortalToBodyDirective, SubmitLockDirective, TeachingFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './curriculum-plan-dialog.component.html'
})
export class CurriculumPlanDialogComponent implements OnInit {
  readonly curriculum = input.required<Curriculum>();
  readonly saved = output<CurriculumPlan>();
  readonly closed = output<void>();

  readonly accept = FILE_ACCEPT;
  readonly lock = submitLock();
  readonly fileError = signal('');
  readonly formError = signal('');

  weeks: DraftWeek[] = [];
  planFile: TeachingFile | undefined;

  ngOnInit(): void {
    const { plan, planFile } = this.curriculum();
    this.weeks = plan.map(w => ({ id: w.id, topic: w.topic, objectives: w.objectives.join('\n') }));
    this.planFile = planFile;
    if (!this.weeks.length) this.addWeek();
  }

  addWeek(): void {
    this.weeks = [...this.weeks, { id: crypto.randomUUID(), topic: '', objectives: '' }];
  }

  removeWeek(index: number): void {
    this.weeks = this.weeks.filter((_, i) => i !== index);
  }

  onFileSelected(event: Event): void {
    const { files, error } = readPickedFiles(event);
    this.fileError.set(error);
    if (files.length) this.planFile = files[0];
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    // Weeks left completely empty are dropped; a week needs its topic
    const weeks = this.weeks.filter(w => w.topic.trim() || w.objectives.trim());
    if (weeks.some(w => !w.topic.trim())) {
      this.formError.set('اكتب موضوع كل أسبوع.');
      form.control.markAllAsTouched();
      return;
    }
    this.formError.set('');
    const plan: CurriculumPlanWeek[] = weeks.map((w, i) => ({
      id: w.id,
      week: i + 1,
      topic: w.topic.trim(),
      objectives: w.objectives.split('\n').map(o => o.trim()).filter(Boolean)
    }));
    this.lock.run(() => this.saved.emit({ plan, planFile: this.planFile }));
  }
}

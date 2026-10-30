import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TEACHER_HONORIFIC } from '../teachers/teacher.model';
import { HonorAvatarComponent } from './honor-avatar.component';
import { HonorEntryDialogComponent } from './honor-entry-dialog.component';
import { HONOR_KINDS, HonorEntry, HonorKind } from './honor-roll.model';
import { HonorRollStore } from './honor-roll.store';

/** Admin management of the honor roll (لوحة الشرف) shown on the home page. */
@Component({
  selector: 'app-honor-roll',
  standalone: true,
  imports: [RouterLink, HonorAvatarComponent, HonorEntryDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './honor-roll.component.html',
  styleUrl: './honor-roll.component.css'
})
export class HonorRollComponent {
  private readonly store = inject(HonorRollStore);

  readonly kinds = HONOR_KINDS;
  readonly honorific = TEACHER_HONORIFIC;
  readonly selectedKind = signal<HonorKind>('TEACHER');

  readonly counts = computed<Record<HonorKind, number>>(() => ({
    TEACHER: this.store.teachers().length,
    STUDENT: this.store.students().length
  }));
  readonly visibleEntries = computed(() =>
    this.selectedKind() === 'TEACHER' ? this.store.teachers() : this.store.students()
  );

  readonly showDialog = signal(false);
  readonly editingEntry = signal<HonorEntry | null>(null);

  openDialog(entry: HonorEntry | null): void {
    this.editingEntry.set(entry);
    this.showDialog.set(true);
  }

  saveEntry(entry: HonorEntry): void {
    this.store.saveEntry(entry);
    this.showDialog.set(false);
  }

  deleteEntry(entryId: string): void {
    this.store.deleteEntry(entryId);
    this.showDialog.set(false);
  }
}

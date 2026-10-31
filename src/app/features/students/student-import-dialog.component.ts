import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { ImportRow, downloadImportTemplate, parseStudentsFile } from './student-excel';
import { Student, gradeOf } from './student.model';

type ImportStep = 'pick' | 'reading' | 'review';

@Component({
  selector: 'app-student-import-dialog',
  standalone: true,
  imports: [PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-import-dialog.component.html',
  styleUrl: './student-import-dialog.component.css'
})
export class StudentImportDialogComponent {
  // Already enrolled students, to catch duplicates before saving
  readonly existing = input<Student[]>([]);
  readonly imported = output<Student[]>();
  readonly closed = output<void>();

  readonly step = signal<ImportStep>('pick');
  readonly fileName = signal('');
  readonly fileError = signal<string | null>(null);
  readonly rows = signal<ImportRow[]>([]);
  readonly errorsOnly = signal(false);
  readonly dragging = signal(false);
  readonly downloadingTemplate = signal(false);
  // Locked from the click until the page closes the dialog
  readonly lock = submitLock();

  readonly validRows = computed(() => this.rows().filter(row => !row.errors.length));
  readonly invalidCount = computed(() => this.rows().length - this.validRows().length);
  readonly visibleRows = computed(() => (this.errorsOnly() ? this.rows().filter(row => row.errors.length) : this.rows()));

  readonly gradeLabel = (student: Student) => gradeOf(student)?.shortLabel ?? '—';

  async downloadTemplate(): Promise<void> {
    this.downloadingTemplate.set(true);
    try {
      await downloadImportTemplate();
    } finally {
      this.downloadingTemplate.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    // Reset so picking the same (fixed) file again still fires change
    inputEl.value = '';
    if (file) this.readFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.readFile(file);
  }

  async readFile(file: File): Promise<void> {
    this.fileName.set(file.name);
    this.fileError.set(null);
    this.step.set('reading');

    const result = await parseStudentsFile(file, this.existing()).catch(() => ({
      rows: [],
      fileError: 'حصل خطأ غير متوقع أثناء قراءة الملف - حاول مرة أخرى'
    }));
    if (result.fileError) {
      this.fileError.set(result.fileError);
      this.step.set('pick');
      return;
    }
    this.rows.set(result.rows);
    this.errorsOnly.set(result.rows.some(row => row.errors.length) && result.rows.length > 20);
    this.step.set('review');
  }

  restart(): void {
    this.rows.set([]);
    this.fileError.set(null);
    this.step.set('pick');
  }

  confirm(): void {
    const students = this.validRows().map(row => row.student);
    if (students.length) this.lock.run(() => this.imported.emit(students));
  }
}

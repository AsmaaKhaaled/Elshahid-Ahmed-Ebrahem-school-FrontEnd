import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ExcelImportResult, StudentsService } from '../../core/services/students.service';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { Student } from './student.model';
import { CardTableDirective } from '../../shared/directives/card-table.directive';

@Component({
  selector: 'app-student-import-dialog',
  standalone: true,
  imports: [CommonModule, CardTableDirective, PortalToBodyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-import-dialog.component.html',
  styleUrl: './student-import-dialog.component.css'
})
export class StudentImportDialogComponent {
  private readonly studentsService = inject(StudentsService);

  readonly existing = input<Student[]>([]);
  readonly imported = output<Student[]>();
  readonly closed = output<void>();

  readonly selectedFile = signal<File | null>(null);
  readonly isUploading = signal<boolean>(false);
  readonly isDownloadingTemplate = signal<boolean>(false);
  readonly dragging = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly importResult = signal<ExcelImportResult | null>(null);

  readonly formattedFileSize = computed(() => {
    const file = this.selectedFile();
    if (!file) return '';
    return this.formatBytes(file.size);
  });

  downloadTemplate(): void {
    if (this.isDownloadingTemplate()) return;
    this.isDownloadingTemplate.set(true);
    this.errorMessage.set(null);

    this.studentsService.downloadTemplate().subscribe({
      next: (blob) => {
        this.isDownloadingTemplate.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.isDownloadingTemplate.set(false);
        this.errorMessage.set('تعذر تحميل النموذج من السيرفر. يرجى التأكد من تشغيل الخادم والاتصال.');
      }
    });
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (file) {
      this.handleFile(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  handleFile(file: File): void {
    this.errorMessage.set(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      this.errorMessage.set('نوع الملف غير مدعوم. يرجى اختيار ملف إكسيل (.xlsx أو .xls أو .csv).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set('حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت).');
      return;
    }

    this.selectedFile.set(file);
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.errorMessage.set(null);
  }

  onUpload(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;

    this.isUploading.set(true);
    this.errorMessage.set(null);

    this.studentsService.uploadExcel(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        const data = res?.data;
        if (data) {
          this.importResult.set(data);
        } else {
          this.errorMessage.set('تمت المعالجة ولكن لم تتوفر استجابة كاملة من الخادم.');
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.error?.details?.[0]?.message ||
          'حدث خطأ أثناء معالجة ملف الإكسيل بالسيرفر. يرجى التأكد من مطابقة الأعمدة للقالب.';
        this.errorMessage.set(errorMsg);
      }
    });
  }

  reset(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.errorMessage.set(null);
    this.isUploading.set(false);
  }

  finish(): void {
    const res = this.importResult();
    const rawStudents = res?.students || [];

    const mapped: Student[] = rawStudents.map((s: any) => ({
      id: s.id || crypto.randomUUID(),
      code: s.studentCode || s.code,
      nationalId: s.nationalId,
      name: s.fullNameArabic || s.name,
      gradeId: s.gradeLevel?.includes('الأول') ? 'G1' : s.gradeLevel?.includes('الثاني') ? 'G2' : 'G3',
      className: s.class?.name || s.className || '1/1',
      guardianName: s.guardianName || '',
      guardianPhone: s.guardianPhone || '',
      status: (s.enrollmentStatus || s.status || 'منتظم') as any,
      gpa: null
    }));

    this.imported.emit(mapped);
    this.closed.emit();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

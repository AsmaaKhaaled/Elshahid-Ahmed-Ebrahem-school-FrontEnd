import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TeachingFile, fileSizeLabel } from './teaching.model';

/** Attached files as chips: a download link when the file is available, and an optional remove button. */
@Component({
  selector: 'app-teaching-files',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-wrap gap-2">
      @for (file of files(); track $index) {
        <li class="flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
          <span aria-hidden="true">📎</span>
          @if (file.url) {
            <a [href]="file.url" [download]="file.name" class="font-semibold truncate hover:text-primary-700 hover:underline">{{ file.name }}</a>
          } @else {
            <span class="font-semibold truncate" title="ملف تجريبي - التحميل متاح بعد ربط الباك اند">{{ file.name }}</span>
          }
          <span class="text-slate-400 shrink-0">{{ sizeOf(file.size) }}</span>
          @if (removable()) {
            <button type="button" (click)="removed.emit($index)" class="text-rose-600 hover:text-rose-700 font-bold shrink-0" aria-label="إزالة الملف">✕</button>
          }
        </li>
      }
    </ul>
  `
})
export class TeachingFilesComponent {
  readonly files = input.required<TeachingFile[]>();
  readonly removable = input(false);
  readonly removed = output<number>();

  readonly sizeOf = fileSizeLabel;
}

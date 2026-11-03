import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

/** "عرض 11–20 من 57" + previous / page numbers / next. Pages are 1-based. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <nav class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" aria-label="التنقل بين الصفحات">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-slate-500">
            عرض <strong class="text-slate-700 tabular-nums">{{ first() }}–{{ last() }}</strong> من
            <strong class="text-slate-700 tabular-nums">{{ total() }}</strong> {{ itemLabel() }}
          </span>

          <!-- Outside the page buttons: still there after picking a size that fits everything on one page -->
          @if (pageSizeOptions().length) {
            <div class="flex items-center gap-1.5 text-slate-500">
              <span>عدد الصفوف</span>
              <mat-form-field class="field-compact w-20">
                <mat-select [value]="pageSize()" [disabled]="disabled()" (selectionChange)="changeSize($event.value)"
                  aria-label="عدد الصفوف في الصفحة">
                  @for (size of pageSizeOptions(); track size) {
                    <mat-option [value]="size">{{ size }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="flex items-center gap-1">
            <button type="button" (click)="go(page() - 1)" [disabled]="page() === 1 || disabled()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              السابق
            </button>
            @for (item of pages(); track $index) {
              @if (item === null) {
                <span class="px-1 text-slate-400">…</span>
              } @else {
                <button type="button" (click)="go(item)" [disabled]="disabled()" [attr.aria-current]="item === page() ? 'page' : null"
                  [class]="item === page() ? 'bg-primary-800 text-white border-primary-800' : 'text-slate-600 border-slate-200 hover:bg-slate-50'"
                  class="min-w-8 px-2 py-1.5 rounded-lg border font-bold tabular-nums disabled:cursor-not-allowed">
                  {{ item }}
                </button>
              }
            }
            <button type="button" (click)="go(page() + 1)" [disabled]="page() === totalPages() || disabled()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              التالي
            </button>
          </div>
        }
      </nav>
    }
  `
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly itemLabel = input('');
  // e.g. while the next page is loading
  readonly disabled = input(false);
  // Empty = no size selector; the parent owns the size and goes back to page 1 when it changes
  readonly pageSizeOptions = input<readonly number[]>([]);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly first = computed(() => (this.page() - 1) * this.pageSize() + 1);
  readonly last = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  // First, last, and two pages around the current one; null = gap
  readonly pages = computed<(number | null)[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    const result: (number | null)[] = [];
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - current) <= 1) {
        result.push(p);
      } else if (result.at(-1) !== null) {
        result.push(null);
      }
    }
    return result;
  });

  go(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }

  changeSize(value: string | number): void {
    const size = Number(value);
    if (this.pageSizeOptions().includes(size) && size !== this.pageSize()) {
      this.pageSizeChange.emit(size);
    }
  }
}

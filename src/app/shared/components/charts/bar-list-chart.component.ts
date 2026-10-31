import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarListItem {
  label: string;
  value: number;
  // Extra line in the hover tooltip (e.g. the teacher's subject)
  hint?: string;
}

/** Horizontal bars for one measure, labelled with their values so no color reading is needed. */
@Component({
  selector: 'app-bar-list-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="space-y-2.5" [attr.aria-label]="ariaLabel()">
      @for (item of items(); track item.label) {
        <li class="group relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-slate-50 focus:bg-slate-50 outline-none"
          tabindex="0" [attr.aria-label]="item.label + ': ' + item.value + ' ' + unit()">
          <span class="truncate text-xs font-semibold text-slate-700">{{ item.label }}</span>
          <span class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <span class="block h-full rounded-full bar" [style.width.%]="percent(item.value)"></span>
          </span>
          <span class="text-xs font-bold text-slate-800 tabular-nums min-w-8 text-left">{{ item.value }}</span>

          <!-- Hover / focus tooltip -->
          <span role="tooltip"
            class="pointer-events-none absolute z-10 bottom-full mb-1 start-1/3 hidden group-hover:block group-focus:block rounded-lg bg-slate-900 text-white text-[11px] px-2.5 py-1.5 shadow-lg whitespace-nowrap">
            <span class="font-bold">{{ item.label }}</span> — {{ item.value }} {{ unit() }}
            @if (item.hint) {
              <span class="block text-slate-300">{{ item.hint }}</span>
            }
          </span>
        </li>
      } @empty {
        <li class="text-xs text-slate-400 py-4 text-center">{{ emptyText() }}</li>
      }
    </ul>
  `,
  styles: `
    .bar {
      background: var(--chart-series-1, #2a78d6);
      transition: width 300ms ease;
    }
  `
})
export class BarListChartComponent {
  readonly items = input.required<BarListItem[]>();
  readonly unit = input('');
  readonly ariaLabel = input('');
  readonly emptyText = input('لا توجد بيانات');
  // Fixed scale (e.g. 35 periods a week); defaults to the largest value
  readonly max = input<number | null>(null);

  private readonly scaleMax = computed(() => this.max() ?? Math.max(1, ...this.items().map(item => item.value)));

  percent(value: number): number {
    return Math.min(100, (value / this.scaleMax()) * 100);
  }
}

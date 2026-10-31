import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface DonutItem {
  label: string;
  value: number;
}

// Categorical order validated for color-blind separation; assigned in order, never cycled
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHER_COLOR = '#a8a29e';
const OTHER_LABEL = 'أخرى';
// Gap between segments, in percent of the ring
const GAP = 0.8;

interface Segment extends DonutItem {
  color: string;
  percent: number;
  dash: string;
  offset: number;
}

/**
 * Share of a whole (e.g. weekly periods per subject). Pass the items in a fixed order
 * so each entity keeps its color; past 8 items the rest fold into "أخرى".
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
        <div class="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90" role="img" [attr.aria-label]="ariaLabel()">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" stroke-width="16" />
            @for (segment of segments(); track segment.label; let i = $index) {
              <circle cx="60" cy="60" r="46" fill="none" pathLength="100"
                [attr.stroke]="segment.color"
                [attr.stroke-width]="hovered() === i ? 19 : 16"
                [attr.stroke-dasharray]="segment.dash"
                [attr.stroke-dashoffset]="-segment.offset"
                (mouseenter)="hovered.set(i)" (mouseleave)="hovered.set(null)"
                class="cursor-pointer transition-[stroke-width] duration-150">
                <title>{{ segment.label }}: {{ segment.value }} {{ unit() }}</title>
              </circle>
            }
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
            @if (hovered() !== null) {
              @let active = segments()[hovered()!];
              <span class="text-xl font-black text-slate-800 tabular-nums">{{ active.value }}</span>
              <span class="text-[10px] font-semibold text-slate-500 leading-tight">{{ active.label }}</span>
            } @else {
              <span class="text-xl font-black text-slate-800 tabular-nums">{{ total() }}</span>
              <span class="text-[10px] font-semibold text-slate-500 leading-tight">{{ totalLabel() }}</span>
            }
          </div>
        </div>

        <!-- Legend doubles as the data table -->
        <ul class="w-full space-y-1.5 text-xs">
          @for (segment of segments(); track segment.label; let i = $index) {
            <li class="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors"
              [class.bg-slate-100]="hovered() === i"
              (mouseenter)="hovered.set(i)" (mouseleave)="hovered.set(null)">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" [style.background]="segment.color"></span>
              <span class="flex-1 truncate font-semibold text-slate-700">{{ segment.label }}</span>
              <span class="font-bold text-slate-800 tabular-nums">{{ segment.value }}</span>
              <span class="w-10 text-left text-slate-400 tabular-nums">{{ segment.percent }}%</span>
            </li>
          }
        </ul>
      </div>
    } @else {
      <p class="text-xs text-slate-400 py-8 text-center">{{ emptyText() }}</p>
    }
  `
})
export class DonutChartComponent {
  readonly items = input.required<DonutItem[]>();
  readonly unit = input('');
  readonly totalLabel = input('الإجمالي');
  readonly ariaLabel = input('');
  readonly emptyText = input('لا توجد بيانات');

  readonly hovered = signal<number | null>(null);

  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.value, 0));

  readonly segments = computed<Segment[]>(() => {
    const items = this.items().filter(item => item.value > 0);
    const shown = items.length > SERIES_COLORS.length ? items.slice(0, SERIES_COLORS.length - 1) : items;
    const rest = items.slice(shown.length).reduce((sum, item) => sum + item.value, 0);
    const all = rest ? [...shown, { label: OTHER_LABEL, value: rest }] : shown;

    const total = this.total();
    const gap = all.length > 1 ? GAP : 0;
    let offset = 0;
    return all.map((item, i) => {
      const share = (item.value / total) * 100;
      const segment: Segment = {
        ...item,
        color: item.label === OTHER_LABEL && rest ? OTHER_COLOR : SERIES_COLORS[i],
        percent: Math.round(share),
        dash: `${Math.max(share - gap, 0.1)} ${100 - Math.max(share - gap, 0.1)}`,
        offset
      };
      offset += share;
      return segment;
    });
  });
}

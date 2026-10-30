import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS, SCHOOL_INFO } from '../../core/constants/school.constants';

type StatsPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'TERM';

interface SectionStats {
  grade: string;
  section: string;
  enrolled: number;
  present: number;
  absent: number;
  excused: number;
}

interface FrequentAbsentee {
  name: string;
  section: string;
  absentDays: number;
}

// Mock absence rate per period (fraction of enrolled students absent on average)
const PERIOD_FACTORS: Record<StatsPeriod, number> = { TODAY: 1, WEEK: 1.15, MONTH: 1.3, TERM: 1.4 };

@Component({
  selector: 'app-attendance-stats',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">إحصائية حضور وغياب الطلاب</h2>
          <p class="text-xs text-slate-500 mt-1">نسب الحضور والغياب على مستوى الصفوف والفصول - {{ school.fullName }}</p>
        </div>

        <div class="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          @for (p of periods; track p.id) {
            <button
              type="button"
              (click)="selectedPeriod.set(p.id)"
              [class]="selectedPeriod() === p.id ? 'bg-primary-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              {{ p.label }}
            </button>
          }
        </div>
      </div>

      <!-- School-wide KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">إجمالي الطلاب</span>
          <span class="text-xl font-black text-slate-800 mt-1 block">{{ totals().enrolled }} طالب</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-emerald-100 shadow-soft bg-emerald-50/20">
          <span class="text-xs text-emerald-600 block">متوسط الحضور</span>
          <span class="text-xl font-black text-emerald-700 mt-1 block">{{ totals().present }} ({{ rate(totals().present, totals().enrolled) }}%)</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-rose-100 shadow-soft bg-rose-50/20">
          <span class="text-xs text-rose-600 block">متوسط الغياب</span>
          <span class="text-xl font-black text-rose-700 mt-1 block">{{ totals().absent }} ({{ rate(totals().absent, totals().enrolled) }}%)</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-blue-100 shadow-soft bg-blue-50/20">
          <span class="text-xs text-blue-600 block">غياب بعذر</span>
          <span class="text-xl font-black text-blue-700 mt-1 block">{{ totals().excused }}</span>
        </div>
      </div>

      <!-- Per-grade summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        @for (g of gradeSummaries(); track g.label) {
          <div class="bg-white rounded-2xl p-5 shadow-soft border border-slate-100/80 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-black text-slate-800">{{ g.label }}</h3>
              <span class="text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">{{ g.enrolled }} طالب</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs text-slate-600">
                <span>نسبة الحضور</span>
                <span class="font-bold text-slate-800">{{ rate(g.present, g.enrolled) }}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  [class]="rate(g.present, g.enrolled) >= 90 ? 'bg-emerald-500' : 'bg-amber-500'"
                  [style.width.%]="rate(g.present, g.enrolled)"></div>
              </div>
            </div>
            <div class="flex justify-between text-xs pt-2 border-t border-slate-100">
              <span class="text-emerald-700">حضور: <b>{{ g.present }}</b></span>
              <span class="text-rose-700">غياب: <b>{{ g.absent }}</b></span>
              <span class="text-blue-700">بعذر: <b>{{ g.excused }}</b></span>
            </div>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Per-section table -->
        <div class="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h3 class="font-bold text-slate-800 text-base">تفصيل الفصول</h3>
            <mat-form-field class="w-56">
              <mat-label>الصف الدراسي</mat-label>
              <mat-select [(value)]="selectedGrade">
                <mat-option value="ALL">جميع الصفوف</mat-option>
                @for (grade of grades; track grade.id) {
                  <mat-option [value]="grade.label">{{ grade.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-right text-sm">
              <thead class="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
                <tr>
                  <th class="py-3 px-4">الفصل</th>
                  <th class="py-3 px-4">الصف</th>
                  <th class="py-3 px-4 text-center">المقيدون</th>
                  <th class="py-3 px-4 text-center">حضور</th>
                  <th class="py-3 px-4 text-center">غياب</th>
                  <th class="py-3 px-4 text-center">بعذر</th>
                  <th class="py-3 px-4 text-center">نسبة الحضور</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                @for (s of filteredSections(); track s.section) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4 font-black text-slate-800 font-mono">{{ s.section }}</td>
                    <td class="py-3 px-4 text-xs text-slate-500">{{ s.grade }}</td>
                    <td class="py-3 px-4 text-center">{{ s.enrolled }}</td>
                    <td class="py-3 px-4 text-center text-emerald-700 font-bold">{{ s.present }}</td>
                    <td class="py-3 px-4 text-center text-rose-700 font-bold">{{ s.absent }}</td>
                    <td class="py-3 px-4 text-center text-blue-700 font-bold">{{ s.excused }}</td>
                    <td class="py-3 px-4 text-center">
                      <span class="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs"
                        [class]="rate(s.present, s.enrolled) >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                        {{ rate(s.present, s.enrolled) }}%
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Frequent absentees -->
        <div class="bg-white rounded-2xl p-5 shadow-soft border border-slate-100/80 space-y-4">
          <div class="pb-3 border-b border-slate-100">
            <h3 class="font-bold text-slate-800 text-base">الطلاب الأكثر غياباً</h3>
            <p class="text-[11px] text-slate-500 mt-0.5">يستلزم التواصل مع ولي الأمر عند تجاوز 5 أيام</p>
          </div>
          <div class="space-y-3">
            @for (st of frequentAbsentees; track st.name) {
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span class="block text-xs font-bold text-slate-800">{{ st.name }}</span>
                  <span class="block text-[11px] text-slate-500">فصل {{ st.section }}</span>
                </div>
                <span [class]="st.absentDays > 5 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'"
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">
                  {{ st.absentDays }} أيام
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class AttendanceStatsComponent {
  readonly school = SCHOOL_INFO;
  readonly grades = GRADE_LEVELS;

  readonly periods: { id: StatsPeriod; label: string }[] = [
    { id: 'TODAY', label: 'اليوم' },
    { id: 'WEEK', label: 'هذا الأسبوع' },
    { id: 'MONTH', label: 'هذا الشهر' },
    { id: 'TERM', label: 'الفصل الدراسي' }
  ];

  readonly selectedPeriod = signal<StatsPeriod>('TODAY');
  readonly selectedGrade = signal<string>('ALL');

  // Base (today) mock figures for every section: 1/1 .. 3/3
  private readonly baseSections: SectionStats[] = [
    { grade: 'الصف الأول الإعدادي', section: '1/1', enrolled: 42, present: 40, absent: 1, excused: 1 },
    { grade: 'الصف الأول الإعدادي', section: '1/2', enrolled: 41, present: 38, absent: 2, excused: 1 },
    { grade: 'الصف الأول الإعدادي', section: '1/3', enrolled: 40, present: 37, absent: 3, excused: 0 },
    { grade: 'الصف الأول الإعدادي', section: '1/4', enrolled: 39, present: 36, absent: 2, excused: 1 },
    { grade: 'الصف الثاني الإعدادي', section: '2/1', enrolled: 43, present: 41, absent: 1, excused: 1 },
    { grade: 'الصف الثاني الإعدادي', section: '2/2', enrolled: 42, present: 38, absent: 3, excused: 1 },
    { grade: 'الصف الثاني الإعدادي', section: '2/3', enrolled: 40, present: 36, absent: 2, excused: 2 },
    { grade: 'الصف الثاني الإعدادي', section: '2/4', enrolled: 41, present: 38, absent: 2, excused: 1 },
    { grade: 'الصف الثالث الإعدادي', section: '3/1', enrolled: 44, present: 42, absent: 2, excused: 0 },
    { grade: 'الصف الثالث الإعدادي', section: '3/2', enrolled: 43, present: 39, absent: 3, excused: 1 },
    { grade: 'الصف الثالث الإعدادي', section: '3/3', enrolled: 41, present: 36, absent: 4, excused: 1 },
    { grade: 'الصف الثالث الإعدادي', section: '3/4', enrolled: 42, present: 39, absent: 2, excused: 1 }
  ];

  readonly frequentAbsentees: FrequentAbsentee[] = [
    { name: 'عمر طارق عبد الله خليل', section: '3/3', absentDays: 8 },
    { name: 'يوسف محمد السيد علي', section: '2/2', absentDays: 7 },
    { name: 'مصطفى أشرف حسن', section: '1/3', absentDays: 6 },
    { name: 'محمود سامح عبد الرحيم', section: '3/2', absentDays: 5 },
    { name: 'زياد هشام فتحي', section: '2/3', absentDays: 4 }
  ];

  readonly sections = computed<SectionStats[]>(() => {
    const factor = PERIOD_FACTORS[this.selectedPeriod()];
    return this.baseSections.map(s => {
      const absent = Math.round(s.absent * factor);
      const excused = Math.round(s.excused * factor);
      return { ...s, absent, excused, present: Math.max(s.enrolled - absent - excused, 0) };
    });
  });

  readonly filteredSections = computed(() => {
    const grade = this.selectedGrade();
    return grade === 'ALL' ? this.sections() : this.sections().filter(s => s.grade === grade);
  });

  readonly gradeSummaries = computed(() =>
    GRADE_LEVELS.map(g => ({ label: g.label, ...this.sum(this.sections().filter(s => s.grade === g.label)) }))
  );

  readonly totals = computed(() => this.sum(this.sections()));

  rate(part: number, total: number): number {
    return total === 0 ? 0 : Math.round((part / total) * 100);
  }

  private sum(list: SectionStats[]) {
    return list.reduce(
      (acc, s) => ({
        enrolled: acc.enrolled + s.enrolled,
        present: acc.present + s.present,
        absent: acc.absent + s.absent,
        excused: acc.excused + s.excused
      }),
      { enrolled: 0, present: 0, absent: 0, excused: 0 }
    );
  }
}

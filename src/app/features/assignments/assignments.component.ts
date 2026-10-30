import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  totalSubmissions: number;
  totalStudents: number;
  status: 'نشط ومتاح' | 'انتهى الموعد' | 'مسودة';
}

@Component({
  selector: 'app-assignments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">الواجبات والتكليفات المدرسية</h2>
          <p class="text-xs text-slate-500 mt-1">متابعة تسليمات الواجبات، تقييم الحلول، وإرفاق بنوك الأسئلة</p>
        </div>

        <button 
          type="button" 
          class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة واجب دراسي جديد</span>
        </button>
      </div>

      <!-- Assignment Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (item of assignments(); track item.id) {
          <div class="bg-white rounded-2xl p-5 shadow-soft border border-slate-100 flex flex-col justify-between hover:border-primary-200 transition-all space-y-4">
            <div>
              <div class="flex items-start justify-between gap-2">
                <span class="text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
                  {{ item.subject }}
                </span>
                <span 
                  [class]="item.status === 'نشط ومتاح' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                  class="text-[11px] font-bold px-2 py-0.5 rounded-md">
                  {{ item.status }}
                </span>
              </div>

              <h3 class="text-base font-bold text-slate-800 mt-2">{{ item.title }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">الفصل المستهدف: <strong class="text-slate-700">{{ item.className }}</strong></p>

              <!-- Submission Rate -->
              <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <div class="flex justify-between text-xs text-slate-600">
                  <span>نسبة التسليم:</span>
                  <span class="font-bold text-slate-800">{{ item.totalSubmissions }} من {{ item.totalStudents }} طالب</span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    class="h-full rounded-full bg-primary-600 transition-all duration-500"
                    [style.width.%]="(item.totalSubmissions / item.totalStudents) * 100">
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span class="text-slate-400 block text-[10px]">آخر موعد للتسليم:</span>
                <span class="font-semibold text-slate-700">{{ item.dueDate | arabicDate:'short' }}</span>
              </div>

              <button type="button" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-800 text-slate-700 font-bold transition-colors">
                مراجعة التسليمات
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AssignmentsComponent {
  readonly assignments = signal<Assignment[]>([
    {
      id: 'as-1',
      title: 'Problem Set #4: Calculus & Vectors',
      subject: 'Pure Mathematics',
      className: 'الصف الثاني الإعدادي (2/1)',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      totalSubmissions: 28,
      totalStudents: 32,
      status: 'نشط ومتاح'
    },
    {
      id: 'as-2',
      title: 'Essay: The Impact of Artificial Intelligence',
      subject: 'Advanced English',
      className: 'الصف الأول الإعدادي (1/3)',
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
      totalSubmissions: 20,
      totalStudents: 30,
      status: 'نشط ومتاح'
    },
    {
      id: 'as-3',
      title: 'تقرير التجارب المعملية: قياس سرعة التفاعل',
      subject: 'الكيمياء (لغات)',
      className: 'الصف الأول الإعدادي (1/1)',
      dueDate: new Date(Date.now() - 86400000).toISOString(),
      totalSubmissions: 31,
      totalStudents: 32,
      status: 'انتهى الموعد'
    }
  ]);
}


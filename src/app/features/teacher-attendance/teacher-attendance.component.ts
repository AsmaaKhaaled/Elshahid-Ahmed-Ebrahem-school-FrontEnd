import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { SCHOOL_INFO } from '../../core/constants/school.constants';

type TeacherAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'MISSION';

interface TeacherAttendanceRecord {
  teacherId: string;
  name: string;
  specialization: string;
  status: TeacherAttendanceStatus;
  arrivalTime: string;
  departureTime: string;
  note?: string;
}

interface StatusOption {
  value: TeacherAttendanceStatus;
  label: string;
  activeClass: string;
}

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ArabicDatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">دفتر حضور وغياب المعلمين</h2>
          <p class="text-xs text-slate-500 mt-1">
            رصد حضور وانصراف هيئة التدريس والإجازات والمأموريات - {{ school.fullName }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            (click)="markAllPresent()"
            type="button"
            class="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-2 transition-all">
            <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>تسجيل الكل حضور</span>
          </button>

          <button
            (click)="saveAttendance()"
            type="button"
            class="px-5 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
            <span>حفظ واعتماد الدفتر</span>
          </button>
        </div>
      </div>

      <!-- Stats Strip -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">إجمالي المعلمين</span>
          <span class="text-xl font-black text-slate-800 mt-1 block">{{ records().length }} معلم</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-emerald-100 shadow-soft bg-emerald-50/20">
          <span class="text-xs text-emerald-600 block">الحاضرون</span>
          <span class="text-xl font-black text-emerald-700 mt-1 block">{{ countOf('PRESENT') + countOf('LATE') }} ({{ attendanceRate() }}%)</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-rose-100 shadow-soft bg-rose-50/20">
          <span class="text-xs text-rose-600 block">الغياب</span>
          <span class="text-xl font-black text-rose-700 mt-1 block">{{ countOf('ABSENT') }}</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-amber-100 shadow-soft bg-amber-50/20">
          <span class="text-xs text-amber-600 block">التأخير</span>
          <span class="text-xl font-black text-amber-700 mt-1 block">{{ countOf('LATE') }}</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-blue-100 shadow-soft bg-blue-50/20">
          <span class="text-xs text-blue-600 block">إجازات ومأموريات</span>
          <span class="text-xl font-black text-blue-700 mt-1 block">{{ countOf('CASUAL_LEAVE') + countOf('SICK_LEAVE') + countOf('MISSION') }}</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="bg-white p-4 rounded-2xl shadow-soft border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <label class="text-xs font-bold text-slate-700">تاريخ الدفتر:</label>
          <input
            type="date"
            [(ngModel)]="selectedDate"
            class="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700" />
        </div>

        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span>مدير المدرسة:</span>
          <strong class="text-slate-800">{{ school.principal }}</strong>
          <span class="mx-2 text-slate-300">|</span>
          <span>اليوم:</span>
          <strong class="text-slate-800">{{ today | arabicDate:'full' }}</strong>
        </div>
      </div>

      <!-- Teachers Attendance Table -->
      <div class="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-sm">
            <thead class="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
              <tr>
                <th class="py-3.5 px-4">#</th>
                <th class="py-3.5 px-4">اسم المعلم</th>
                <th class="py-3.5 px-4">التخصص</th>
                <th class="py-3.5 px-4 text-center">الحالة</th>
                <th class="py-3.5 px-4 text-center">وقت الحضور</th>
                <th class="py-3.5 px-4 text-center">وقت الانصراف</th>
                <th class="py-3.5 px-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (rec of records(); track rec.teacherId; let idx = $index) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 font-mono text-xs text-slate-400">{{ idx + 1 }}</td>
                  <td class="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">{{ rec.name }}</td>
                  <td class="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">{{ rec.specialization }}</td>
                  <td class="py-3.5 px-4 text-center">
                    <div class="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      @for (opt of statusOptions; track opt.value) {
                        <button
                          type="button"
                          (click)="setStatus(rec.teacherId, opt.value)"
                          [class]="rec.status === opt.value ? opt.activeClass + ' text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                          class="px-2 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap">
                          {{ opt.label }}
                        </button>
                      }
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <input
                      type="time"
                      [(ngModel)]="rec.arrivalTime"
                      [disabled]="!isOnDuty(rec.status)"
                      class="px-2 py-1 text-xs rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300" />
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <input
                      type="time"
                      [(ngModel)]="rec.departureTime"
                      [disabled]="!isOnDuty(rec.status)"
                      class="px-2 py-1 text-xs rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300" />
                  </td>
                  <td class="py-3.5 px-4">
                    <input
                      type="text"
                      [(ngModel)]="rec.note"
                      placeholder="ملاحظة..."
                      class="w-full min-w-[140px] px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-primary-500" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Signature -->
      <div class="flex justify-end">
        <div class="bg-white px-6 py-4 rounded-2xl shadow-soft border border-slate-100 text-center text-xs space-y-1">
          <span class="block text-slate-500">يعتمد،، مدير المدرسة</span>
          <strong class="block text-slate-800 text-sm">{{ school.principal }}</strong>
        </div>
      </div>
    </div>
  `
})
export class TeacherAttendanceComponent {
  readonly school = SCHOOL_INFO;
  readonly today = new Date();
  readonly selectedDate = signal<string>(new Date().toISOString().slice(0, 10));

  readonly statusOptions: StatusOption[] = [
    { value: 'PRESENT', label: 'حاضر', activeClass: 'bg-emerald-600' },
    { value: 'LATE', label: 'متأخر', activeClass: 'bg-amber-500' },
    { value: 'ABSENT', label: 'غائب', activeClass: 'bg-rose-600' },
    { value: 'CASUAL_LEAVE', label: 'عارضة', activeClass: 'bg-blue-600' },
    { value: 'SICK_LEAVE', label: 'مرضي', activeClass: 'bg-indigo-600' },
    { value: 'MISSION', label: 'مأمورية', activeClass: 'bg-slate-600' }
  ];

  readonly records = signal<TeacherAttendanceRecord[]>([
    { teacherId: '1', name: 'أ. محمود عبد العزيز الشناوي', specialization: 'الرياضيات', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00' },
    { teacherId: '2', name: 'أ. كمال محمد الشربيني', specialization: 'اللغة الإنجليزية', status: 'PRESENT', arrivalTime: '07:25', departureTime: '14:00' },
    { teacherId: '3', name: 'أ. شريف فؤاد عبد الهادي', specialization: 'العلوم', status: 'LATE', arrivalTime: '08:10', departureTime: '14:00', note: 'تأخير 40 دقيقة' },
    { teacherId: '4', name: 'أ. سامي نبيل عبد العليم', specialization: 'الرياضيات', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00' },
    { teacherId: '5', name: 'الشيخ عبد الرحمن طه إبراهيم', specialization: 'اللغة العربية والتربية الدينية', status: 'PRESENT', arrivalTime: '07:20', departureTime: '14:00' },
    { teacherId: '6', name: 'أ. حسن إبراهيم السيد', specialization: 'الدراسات الاجتماعية', status: 'CASUAL_LEAVE', arrivalTime: '', departureTime: '', note: 'إجازة عارضة' },
    { teacherId: '7', name: 'أ. أحمد مصطفى عبد الله', specialization: 'التربية الرياضية', status: 'PRESENT', arrivalTime: '07:30', departureTime: '14:00' },
    { teacherId: '8', name: 'أ. خالد سعيد محمود', specialization: 'الحاسب الآلي', status: 'MISSION', arrivalTime: '', departureTime: '', note: 'مأمورية بالإدارة التعليمية' },
    { teacherId: '9', name: 'أ. ياسر عادل فهمي', specialization: 'التربية الفنية', status: 'ABSENT', arrivalTime: '', departureTime: '' }
  ]);

  readonly attendanceRate = computed(() => {
    const total = this.records().length;
    if (total === 0) return 0;
    const onSite = this.records().filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    return Math.round((onSite / total) * 100);
  });

  countOf(status: TeacherAttendanceStatus): number {
    return this.records().filter(r => r.status === status).length;
  }

  isOnDuty(status: TeacherAttendanceStatus): boolean {
    return status === 'PRESENT' || status === 'LATE';
  }

  setStatus(teacherId: string, status: TeacherAttendanceStatus): void {
    this.records.update(list =>
      list.map(r => {
        if (r.teacherId !== teacherId) return r;
        return this.isOnDuty(status)
          ? { ...r, status, arrivalTime: r.arrivalTime || '07:30', departureTime: r.departureTime || '14:00' }
          : { ...r, status, arrivalTime: '', departureTime: '' };
      })
    );
  }

  markAllPresent(): void {
    this.records.update(list =>
      list.map(r => ({ ...r, status: 'PRESENT', arrivalTime: r.arrivalTime || '07:30', departureTime: r.departureTime || '14:00' }))
    );
  }

  saveAttendance(): void {
    alert('تم حفظ واعتماد دفتر حضور وغياب المعلمين بنجاح.');
  }
}

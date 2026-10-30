import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { GRADE_LEVELS } from '../../core/constants/school.constants';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface AttendanceRecord {
  studentId: string;
  name: string;
  code: string;
  status: AttendanceStatus;
  note?: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, ArabicDatePipe, MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">دفتر الحضور والغياب اليومي</h2>
          <p class="text-xs text-slate-500 mt-1">رصد الحضور الصباحي والتأخيرات وإرسال إشعارات فورية لأولياء الأمور</p>
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

      <!-- Attendance Stats Strip -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">إجمالي الطلاب بالفصل</span>
          <span class="text-xl font-black text-slate-800 mt-1 block">{{ records().length }} طالب</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-emerald-100 shadow-soft bg-emerald-50/20">
          <span class="text-xs text-emerald-600 block">الحاضرون</span>
          <span class="text-xl font-black text-emerald-700 mt-1 block">{{ presentCount() }} ({{ attendanceRate() }}%)</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-rose-100 shadow-soft bg-rose-50/20">
          <span class="text-xs text-rose-600 block">الغياب بدون إذن</span>
          <span class="text-xl font-black text-rose-700 mt-1 block">{{ absentCount() }}</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-amber-100 shadow-soft bg-amber-50/20">
          <span class="text-xs text-amber-600 block">تأخير / إذن رسمي</span>
          <span class="text-xl font-black text-amber-700 mt-1 block">{{ lateCount() + excusedCount() }}</span>
        </div>
      </div>

      <!-- Controls: Date & Class Selector -->
      <div class="bg-white p-4 rounded-2xl shadow-soft border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <mat-form-field class="w-full sm:w-72">
          <mat-label>الفصل الدراسي</mat-label>
          <mat-select [(value)]="selectedSection">
            @for (grade of grades; track grade.id) {
              <mat-optgroup [label]="grade.label">
                @for (section of grade.sections; track section) {
                  <mat-option [value]="section">فصل {{ section }}</mat-option>
                }
              </mat-optgroup>
            }
          </mat-select>
        </mat-form-field>

        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span>تاريخ اليوم:</span>
          <strong class="text-slate-800">{{ today | arabicDate:'full' }}</strong>
        </div>
      </div>

      <!-- Attendance Table -->
      <div class="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <table class="w-full text-right text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th class="py-3.5 px-4">#</th>
              <th class="py-3.5 px-4">اسم الطالب</th>
              <th class="py-3.5 px-4">كود القيد</th>
              <th class="py-3.5 px-4 text-center">حالة الحضور</th>
              <th class="py-3.5 px-4">ملاحظات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            @for (rec of records(); track rec.studentId; let idx = $index) {
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3.5 px-4 font-mono text-xs text-slate-400">{{ idx + 1 }}</td>
                <td class="py-3.5 px-4 font-bold text-slate-800">{{ rec.name }}</td>
                <td class="py-3.5 px-4 font-mono text-xs text-slate-500">{{ rec.code }}</td>
                <td class="py-3.5 px-4 text-center">
                  <div class="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      (click)="setStatus(rec.studentId, 'PRESENT')"
                      [class]="rec.status === 'PRESENT' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all">
                      حاضر
                    </button>
                    <button 
                      type="button" 
                      (click)="setStatus(rec.studentId, 'ABSENT')"
                      [class]="rec.status === 'ABSENT' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all">
                      غائب
                    </button>
                    <button 
                      type="button" 
                      (click)="setStatus(rec.studentId, 'LATE')"
                      [class]="rec.status === 'LATE' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-amber-700'"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all">
                      متأخر
                    </button>
                    <button 
                      type="button" 
                      (click)="setStatus(rec.studentId, 'EXCUSED')"
                      [class]="rec.status === 'EXCUSED' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all">
                      إذن
                    </button>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <input 
                    type="text" 
                    [(ngModel)]="rec.note" 
                    placeholder="ملاحظة أو سبب الغياب..."
                    class="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-primary-500"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AttendanceComponent {
  readonly today = new Date();
  readonly grades = GRADE_LEVELS;
  readonly selectedSection = signal<string>(GRADE_LEVELS[0].sections[0]);

  readonly records = signal<AttendanceRecord[]>([
    { studentId: '1', name: 'أحمد ياسين محمد إبراهيم', code: 'STD-2026-001', status: 'PRESENT' },
    { studentId: '2', name: 'مازن شريف عبد المنعم', code: 'STD-2026-002', status: 'PRESENT' },
    { studentId: '3', name: 'كريم خالد مصطفى السعيد', code: 'STD-2026-003', status: 'LATE', note: 'تأخر عن الطابور الصباحي' },
    { studentId: '4', name: 'نور الدين حسام حسن رضوان', code: 'STD-2026-004', status: 'PRESENT' },
    { studentId: '5', name: 'عمر طارق عبد الله خليل', code: 'STD-2026-005', status: 'ABSENT', note: 'إشعار مرسل للوالد' },
    { studentId: '6', name: 'ياسين مدحت سامي', code: 'STD-2026-006', status: 'EXCUSED', note: 'عذر مرضي معتمد' }
  ]);

  readonly presentCount = computed(() => this.records().filter(r => r.status === 'PRESENT').length);
  readonly absentCount = computed(() => this.records().filter(r => r.status === 'ABSENT').length);
  readonly lateCount = computed(() => this.records().filter(r => r.status === 'LATE').length);
  readonly excusedCount = computed(() => this.records().filter(r => r.status === 'EXCUSED').length);

  readonly attendanceRate = computed(() => {
    const total = this.records().length;
    if (total === 0) return 0;
    return Math.round((this.presentCount() / total) * 100);
  });

  setStatus(studentId: string, status: AttendanceStatus): void {
    this.records.update(list =>
      list.map(r => r.studentId === studentId ? { ...r, status } : r)
    );
  }

  markAllPresent(): void {
    this.records.update(list => list.map(r => ({ ...r, status: 'PRESENT' })));
  }

  saveAttendance(): void {
    alert('تم حفظ واعتماد سجل الحضور والغياب بنجاح وتوثيق إحصائيات اليوم.');
  }
}


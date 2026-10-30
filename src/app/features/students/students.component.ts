import { ChangeDetectionStrategy, Component, signal, computed, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GRADE_LEVELS } from '../../core/constants/school.constants';

interface Student {
  id: string;
  code: string;
  nationalId: string;
  name: string;
  gradeLevel: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  status: 'منتظم' | 'موقوف' | 'منقول';
  gpa: number;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Page Title & Header Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">إدارة شؤون الطلاب</h2>
          <p class="text-xs text-slate-500 mt-1">سجلات الطلاب المقيدين، التوزيع على الفصول والمتابعة الأكاديمية</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            (click)="toggleAddModal()"
            type="button" 
            class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>تسجيل طالب جديد</span>
          </button>

          <button 
            type="button" 
            class="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">إجمالي المقيدين</span>
          <span class="text-xl font-black text-slate-800 mt-1 block">1,420</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">الطلاب المنتظمون</span>
          <span class="text-xl font-black text-emerald-600 mt-1 block">1,392</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">لوحة الشرف (متفوقون)</span>
          <span class="text-xl font-black text-amber-600 mt-1 block">245</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
          <span class="text-xs text-slate-500 block">حالات متابعة خاصة</span>
          <span class="text-xl font-black text-indigo-600 mt-1 block">28</span>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bg-white p-4 rounded-2xl shadow-soft border border-slate-100 flex flex-col md:flex-row items-center gap-4">
        <!-- Search bar -->
        <div class="relative flex-1 w-full">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="البحث باسم الطالب، كود القيد، أو الرقم القومي..."
            class="w-full h-10 pl-10 pr-4 rounded-[10px] border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600"
          />
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>

        <!-- Grade Selector -->
        <mat-form-field class="w-full md:w-56">
          <mat-label>الصف الدراسي</mat-label>
          <mat-select [(value)]="selectedGrade">
            <mat-option value="ALL">جميع الصفوف الدراسية</mat-option>
            @for (grade of grades; track grade.id) {
              <mat-option [value]="grade.label">{{ grade.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Status Filter -->
        <mat-form-field class="w-full md:w-44">
          <mat-label>حالة القيد</mat-label>
          <mat-select [(value)]="selectedStatus">
            <mat-option value="ALL">كل الحالات</mat-option>
            @for (status of studentStatuses; track status) {
              <mat-option [value]="status">{{ status }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Students Records Table -->
      <div class="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-sm">
            <thead class="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th class="py-3.5 px-4">الطالب</th>
                <th class="py-3.5 px-4">كود القيد</th>
                <th class="py-3.5 px-4">المرحلة والفصل</th>
                <th class="py-3.5 px-4">ولي الأمر</th>
                <th class="py-3.5 px-4">رقم الهاتف</th>
                <th class="py-3.5 px-4 text-center">المعدل (GPA)</th>
                <th class="py-3.5 px-4 text-center">الحالة</th>
                <th class="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (student of filteredStudents(); track student.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-xs">
                        {{ student.name.slice(0, 1) }}
                      </div>
                      <div>
                        <span class="font-bold text-slate-800 block">{{ student.name }}</span>
                        <span class="text-xs text-slate-400 block">{{ student.nationalId }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-xs font-semibold text-slate-600">
                    {{ student.code }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="block font-medium text-xs text-slate-800">{{ student.gradeLevel }}</span>
                    <span class="block text-[11px] text-slate-500">{{ student.className }}</span>
                  </td>
                  <td class="py-3.5 px-4 text-xs font-medium">{{ student.guardianName }}</td>
                  <td class="py-3.5 px-4 text-xs font-mono text-slate-600 dir-ltr text-right">{{ student.guardianPhone }}</td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs"
                      [class]="student.gpa >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'">
                      {{ student.gpa }}%
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      [class]="student.status === 'منتظم' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
                      {{ student.status }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button type="button" title="تفاصيل الطالب" class="p-1.5 rounded-lg text-slate-400 hover:text-primary-700 hover:bg-slate-100">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button type="button" title="تعديل" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center py-8 text-slate-400 text-xs">
                    لا توجد سجلات تطابق شروط البحث الحالية.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Student Modal Dialog -->
      @if (showAddModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="font-black text-slate-800 text-lg">تسجيل طالب جديد بالمنظومة</h3>
              <button (click)="toggleAddModal()" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">الاسم رباعي (باللغة العربية)</label>
                <input type="text" placeholder="مثال: يوسف أحمد محمد مصطفى" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">الرقم القومي (14 رقم)</label>
                  <input type="text" placeholder="30801011234567" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">كود الطالب</label>
                  <input type="text" placeholder="STD-2026-99" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-1">
                <mat-form-field class="w-full">
                  <mat-label>الصف الدراسي</mat-label>
                  <mat-select [(value)]="newStudentGradeId">
                    @for (grade of grades; track grade.id) {
                      <mat-option [value]="grade.id">{{ grade.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="w-full">
                  <mat-label>الفصل</mat-label>
                  <mat-select [(value)]="newStudentSection">
                    @for (section of newStudentSections(); track section) {
                      <mat-option [value]="section">فصل {{ section }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">هاتف ولي الأمر</label>
                <input type="tel" placeholder="01012345678" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button (click)="toggleAddModal()" type="button" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs">إلغاء</button>
              <button (click)="toggleAddModal()" type="button" class="px-5 py-2 rounded-xl bg-primary-800 text-white font-bold text-xs hover:bg-primary-900 shadow">حفظ القيد</button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class StudentsComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedGrade = signal<string>('ALL');
  readonly selectedStatus = signal<string>('ALL');
  readonly showAddModal = signal<boolean>(false);

  readonly grades = GRADE_LEVELS;
  readonly studentStatuses: Student['status'][] = ['منتظم', 'موقوف', 'منقول'];

  readonly newStudentGradeId = signal<string>(GRADE_LEVELS[0].id);
  readonly newStudentSections = computed(() =>
    GRADE_LEVELS.find(grade => grade.id === this.newStudentGradeId())?.sections ?? []
  );
  // Resets to the first section of the newly selected grade whenever the grade changes
  readonly newStudentSection = linkedSignal(() => this.newStudentSections()[0]);

  readonly students = signal<Student[]>([
    {
      id: '1',
      code: 'STD-2026-001',
      nationalId: '31001011234567',
      name: 'أحمد ياسين محمد إبراهيم',
      gradeLevel: 'الصف الأول الإعدادي',
      className: '1/3',
      guardianName: 'المهندس / ياسين محمد',
      guardianPhone: '01001234567',
      status: 'منتظم',
      gpa: 98.4
    },
    {
      id: '2',
      code: 'STD-2026-002',
      nationalId: '31002021234568',
      name: 'مازن شريف عبد المنعم',
      gradeLevel: 'الصف الأول الإعدادي',
      className: '1/1',
      guardianName: 'دكتور / شريف عبد المنعم',
      guardianPhone: '01112345678',
      status: 'منتظم',
      gpa: 96.2
    },
    {
      id: '3',
      code: 'STD-2026-003',
      nationalId: '31003031234569',
      name: 'كريم خالد مصطفى السعيد',
      gradeLevel: 'الصف الثاني الإعدادي',
      className: '2/1',
      guardianName: 'أ/ خالد مصطفى',
      guardianPhone: '01223456789',
      status: 'منتظم',
      gpa: 91.5
    },
    {
      id: '4',
      code: 'STD-2026-004',
      nationalId: '31004041234570',
      name: 'نور الدين حسام حسن رضوان',
      gradeLevel: 'الصف الثالث الإعدادي',
      className: '3/2',
      guardianName: 'المحامي / حسام حسن',
      guardianPhone: '01556789012',
      status: 'منتظم',
      gpa: 94.0
    },
    {
      id: '5',
      code: 'STD-2026-005',
      nationalId: '31005051234571',
      name: 'عمر طارق عبد الله خليل',
      gradeLevel: 'الصف الثالث الإعدادي',
      className: '3/3',
      guardianName: 'أ/ طارق عبد الله',
      guardianPhone: '01099887766',
      status: 'منتظم',
      gpa: 87.8
    }
  ]);

  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const grade = this.selectedGrade();
    const status = this.selectedStatus();

    return this.students().filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.nationalId.includes(q);
      const matchGrade = grade === 'ALL' || s.gradeLevel === grade;
      const matchStatus = status === 'ALL' || s.status === status;
      return matchSearch && matchGrade && matchStatus;
    });
  });

  toggleAddModal(): void {
    this.showAddModal.update(v => !v);
  }
}


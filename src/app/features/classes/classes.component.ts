import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { GRADE_LEVELS } from '../../core/constants/school.constants';

interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: string;
  roomNumber: string;
  capacity: number;
  enrolledStudents: number;
  classTeacher: string;
  shift: 'صباحي' | 'مسائي';
}

@Component({
  selector: 'app-classes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">إدارة الفصول والقاعات الدراسية</h2>
          <p class="text-xs text-slate-500 mt-1">توزيع الفصول، الكثافات الطلابية، وتعيين رواد الفصول</p>
        </div>

        <button 
          type="button" 
          class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>إنشاء فصل دراسي جديد</span>
        </button>
      </div>

      <!-- Grade Filter -->
      <div class="flex flex-wrap gap-2">
        @for (tab of gradeTabs; track tab.id) {
          <button 
            type="button"
            (click)="selectedTab.set(tab.id)"
            [class]="selectedTab() === tab.id ? 'bg-primary-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200/60">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Classes Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (cls of filteredClasses(); track cls.id) {
          <div class="bg-white rounded-2xl p-5 shadow-soft border border-slate-100/80 hover:shadow-md transition-all space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  {{ cls.gradeLevel }}
                </span>
                <h3 class="text-lg font-black text-slate-800">{{ cls.name }}</h3>
              </div>

              <div class="text-left font-mono text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                قاعة {{ cls.roomNumber }}
              </div>
            </div>

            <!-- Capacity Progress -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs text-slate-600">
                <span>الكثافة الطلابية:</span>
                <span class="font-bold text-slate-800">{{ cls.enrolledStudents }} / {{ cls.capacity }} طالب</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  [class]="(cls.enrolledStudents / cls.capacity) > 0.9 ? 'bg-amber-500' : 'bg-emerald-500'"
                  [style.width.%]="(cls.enrolledStudents / cls.capacity) * 100">
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                  رائد
                </div>
                <div>
                  <span class="block text-[10px] text-slate-400">رائد الفصل:</span>
                  <span class="font-bold text-slate-800">{{ cls.classTeacher }}</span>
                </div>
              </div>

              <span class="text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-md text-[11px]">
                {{ cls.shift }}
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ClassesComponent {
  readonly selectedTab = signal<string>('ALL');

  readonly gradeTabs = [
    { id: 'ALL', label: 'كافة الصفوف' },
    ...GRADE_LEVELS.map(g => ({ id: g.label, label: g.shortLabel }))
  ];

  readonly classes = signal<SchoolClass[]>([
    { id: 'c1', name: 'فصل 1/1', gradeLevel: 'الصف الأول الإعدادي', roomNumber: 'A-101', capacity: 45, enrolledStudents: 42, classTeacher: 'أ. كمال الشربيني', shift: 'صباحي' },
    { id: 'c2', name: 'فصل 1/2', gradeLevel: 'الصف الأول الإعدادي', roomNumber: 'A-102', capacity: 45, enrolledStudents: 41, classTeacher: 'أ. سامي نبيل', shift: 'صباحي' },
    { id: 'c3', name: 'فصل 1/3', gradeLevel: 'الصف الأول الإعدادي', roomNumber: 'A-103', capacity: 45, enrolledStudents: 40, classTeacher: 'أ. شريف فؤاد', shift: 'صباحي' },
    { id: 'c4', name: 'فصل 1/4', gradeLevel: 'الصف الأول الإعدادي', roomNumber: 'A-104', capacity: 45, enrolledStudents: 39, classTeacher: 'أ. وليد منصور', shift: 'صباحي' },
    { id: 'c5', name: 'فصل 2/1', gradeLevel: 'الصف الثاني الإعدادي', roomNumber: 'B-201', capacity: 45, enrolledStudents: 43, classTeacher: 'أ. محمود الشناوي', shift: 'صباحي' },
    { id: 'c6', name: 'فصل 2/2', gradeLevel: 'الصف الثاني الإعدادي', roomNumber: 'B-202', capacity: 45, enrolledStudents: 42, classTeacher: 'أ. حسن إبراهيم', shift: 'صباحي' },
    { id: 'c7', name: 'فصل 2/3', gradeLevel: 'الصف الثاني الإعدادي', roomNumber: 'B-203', capacity: 45, enrolledStudents: 40, classTeacher: 'أ. أحمد مصطفى', shift: 'صباحي' },
    { id: 'c8', name: 'فصل 2/4', gradeLevel: 'الصف الثاني الإعدادي', roomNumber: 'B-204', capacity: 45, enrolledStudents: 41, classTeacher: 'أ. طارق عبد الحميد', shift: 'صباحي' },
    { id: 'c9', name: 'فصل 3/1', gradeLevel: 'الصف الثالث الإعدادي', roomNumber: 'C-301', capacity: 45, enrolledStudents: 44, classTeacher: 'الشيخ عبد الرحمن طه', shift: 'صباحي' },
    { id: 'c10', name: 'فصل 3/2', gradeLevel: 'الصف الثالث الإعدادي', roomNumber: 'C-302', capacity: 45, enrolledStudents: 43, classTeacher: 'أ. خالد سعيد', shift: 'صباحي' },
    { id: 'c11', name: 'فصل 3/3', gradeLevel: 'الصف الثالث الإعدادي', roomNumber: 'C-303', capacity: 45, enrolledStudents: 41, classTeacher: 'أ. ياسر عادل', shift: 'صباحي' },
    { id: 'c12', name: 'فصل 3/4', gradeLevel: 'الصف الثالث الإعدادي', roomNumber: 'C-304', capacity: 45, enrolledStudents: 42, classTeacher: 'أ. إبراهيم سالم', shift: 'صباحي' }
  ]);

  readonly filteredClasses = computed(() => {
    const tab = this.selectedTab();
    if (tab === 'ALL') return this.classes();
    return this.classes().filter(c => c.gradeLevel === tab);
  });
}


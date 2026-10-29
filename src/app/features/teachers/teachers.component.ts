import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Teacher {
  id: string;
  name: string;
  title: string;
  specialization: string;
  email: string;
  phone: string;
  classesCount: number;
  assignedSubjects: string[];
  status: 'على رأس العمل' | 'إجازة اعتيادية' | 'منتدب';
}

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">هيئة التدريس والمشرفين الأكاديميين</h2>
          <p class="text-xs text-slate-500 mt-1">توزيع النصاب الأسبوعي، التخصصات، والمتابعة الإدارية للكادر التعليمي</p>
        </div>

        <button 
          type="button" 
          class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة معلم جديد</span>
        </button>
      </div>

      <!-- Search & Department Filter -->
      <div class="bg-white p-4 rounded-2xl shadow-soft border border-slate-100 flex flex-col md:flex-row items-center gap-4">
        <div class="relative flex-1 w-full">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="البحث باسم المعلم، التخصص، أو رقم الهاتف..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>

        <div class="w-full md:w-60">
          <select 
            [(ngModel)]="selectedDepartment"
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="ALL">جميع الأقسام والتخصصات</option>
            <option value="اللغة الإنجليزية">قسم اللغة الإنجليزية</option>
            <option value="الرياضيات">قسم الرياضيات (Math)</option>
            <option value="العلوم التجريبية">قسم العلوم (Science)</option>
            <option value="اللغة العربية">قسم اللغة العربية</option>
            <option value="الدراسات الاجتماعية">قسم الدراسات الاجتماعية</option>
          </select>
        </div>
      </div>

      <!-- Teachers Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (teacher of filteredTeachers(); track teacher.id) {
          <div class="bg-white rounded-2xl p-5 shadow-soft border border-slate-100 hover:border-primary-200 transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-800 to-primary-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-primary-900/10">
                    {{ teacher.name.slice(0, 1) }}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm leading-tight">{{ teacher.name }}</h3>
                    <p class="text-xs text-primary-700 font-semibold mt-0.5">{{ teacher.title }}</p>
                  </div>
                </div>

                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                  {{ teacher.status }}
                </span>
              </div>

              <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div class="flex items-center justify-between text-slate-600">
                  <span class="text-slate-400">التخصص الأكاديمي:</span>
                  <span class="font-semibold">{{ teacher.specialization }}</span>
                </div>
                <div class="flex items-center justify-between text-slate-600">
                  <span class="text-slate-400">الفصول المسندة:</span>
                  <span class="font-semibold text-primary-700">{{ teacher.classesCount }} فصول</span>
                </div>
                <div class="flex items-center justify-between text-slate-600">
                  <span class="text-slate-400">رقم الهاتف:</span>
                  <span class="font-mono text-slate-700 dir-ltr">{{ teacher.phone }}</span>
                </div>
              </div>

              <!-- Subjects Tags -->
              <div class="mt-3 flex flex-wrap gap-1.5">
                @for (sub of teacher.assignedSubjects; track sub) {
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                    {{ sub }}
                  </span>
                }
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button type="button" class="text-xs font-bold text-primary-700 hover:text-primary-900">
                عرض الجدول الأسبوعي ←
              </button>
              <button type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-800">
                تعديل البيانات
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TeachersComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedDepartment = signal<string>('ALL');

  readonly teachers = signal<Teacher[]>([
    {
      id: '1',
      name: 'أ. د. محمود عبد العزيز الشناوي',
      title: 'كبير معلمين - مدير التعليم الثانوي',
      specialization: 'الرياضيات',
      email: 'm.shinawy@school.edu.eg',
      phone: '01012340001',
      classesCount: 4,
      assignedSubjects: ['Math', 'Pure Mathematics'],
      status: 'على رأس العمل'
    },
    {
      id: '2',
      name: 'الأستاذة / نادية كمال الشربيني',
      title: 'معلم خبير لغة إنجليزية',
      specialization: 'اللغة الإنجليزية',
      email: 'nadia.sh@school.edu.eg',
      phone: '01122334455',
      classesCount: 5,
      assignedSubjects: ['Advanced English', 'English Literature'],
      status: 'على رأس العمل'
    },
    {
      id: '3',
      name: 'د. شريف فؤاد عبد الهادي',
      title: 'معلم أول أ - كيمياء وفيزياء',
      specialization: 'العلوم التجريبية',
      email: 'sherif.f@school.edu.eg',
      phone: '01234567890',
      classesCount: 6,
      assignedSubjects: ['Chemistry (لغات)', 'Physics (لغات)'],
      status: 'على رأس العمل'
    },
    {
      id: '4',
      name: 'أ/ سامية نبيل عبد العليم',
      title: 'معلم أول رياضيات',
      specialization: 'الرياضيات',
      email: 'samia.nabil@school.edu.eg',
      phone: '01098765432',
      classesCount: 5,
      assignedSubjects: ['Math', 'Geometry'],
      status: 'على رأس العمل'
    },
    {
      id: '5',
      name: 'الشيخ / عبد الرحمن طه إبراهيم',
      title: 'معلم خبير لغة عربية وتربية دينية',
      specialization: 'اللغة العربية',
      email: 'abdelrahman.t@school.edu.eg',
      phone: '01055566677',
      classesCount: 4,
      assignedSubjects: ['اللغة العربية', 'التربية الدينية الإسلامية'],
      status: 'على رأس العمل'
    }
  ]);

  readonly filteredTeachers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const dept = this.selectedDepartment();

    return this.teachers().filter(t => {
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q) || t.phone.includes(q);
      const matchDept = dept === 'ALL' || t.specialization.includes(dept);
      return matchSearch && matchDept;
    });
  });
}


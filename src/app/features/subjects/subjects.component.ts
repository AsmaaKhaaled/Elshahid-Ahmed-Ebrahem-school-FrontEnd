import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface SubjectItem {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  code: string;
  gradeLevel: string;
  weeklyHours: number;
  type: 'منهج لغات متقدم' | 'منهج وزاري موحد' | 'لغة أجنبية ثانية';
  totalMarks: number;
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">المناهج والمقررات الدراسية</h2>
          <p class="text-xs text-slate-500 mt-1">توصيف المواد الدراسية لمدارس اللغات الرسمية المتميزة وتوزيع الساعات المعتمدة</p>
        </div>

        <button 
          type="button" 
          class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة مقرر جديد</span>
        </button>
      </div>

      <!-- Subjects Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (subject of subjects(); track subject.id) {
          <div class="bg-white rounded-2xl p-5 shadow-soft border border-slate-100 hover:border-primary-200 transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between">
                <div>
                  <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block mb-1"
                    [class]="subject.type === 'منهج لغات متقدم' ? 'bg-primary-50 text-primary-700' : 'bg-emerald-50 text-emerald-700'">
                    {{ subject.type }}
                  </span>
                  <h3 class="text-base font-black text-slate-800">{{ subject.nameArabic }}</h3>
                  <p class="text-xs text-slate-400 font-medium dir-ltr text-right">{{ subject.nameEnglish }}</p>
                </div>
                <span class="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                  {{ subject.code }}
                </span>
              </div>

              <div class="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div class="flex justify-between">
                  <span class="text-slate-400">المرحلة الدراسية:</span>
                  <span class="font-semibold text-slate-800">{{ subject.gradeLevel }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">الساعات الأسبوعية:</span>
                  <span class="font-bold text-primary-700">{{ subject.weeklyHours }} حصص أسبوعياً</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">الدرجة الكلية (الامتحان والأنشطة):</span>
                  <span class="font-bold text-slate-800">{{ subject.totalMarks }} درجة</span>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button type="button" class="text-xs font-bold text-primary-700 hover:text-primary-900 flex items-center gap-1">
                <span>تصفح خطة المنهج (Syllabus)</span>
                <span>←</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class SubjectsComponent {
  readonly subjects = signal<SubjectItem[]>([
    {
      id: 'sub-1',
      nameArabic: 'اللغة الإنجليزية الرفيعة',
      nameEnglish: 'Advanced English (High Level)',
      code: 'ENG-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 6,
      type: 'منهج لغات متقدم',
      totalMarks: 100
    },
    {
      id: 'sub-2',
      nameArabic: 'الرياضيات باللغة الإنجليزية',
      nameEnglish: 'Pure & Applied Mathematics',
      code: 'MTH-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 5,
      type: 'منهج لغات متقدم',
      totalMarks: 100
    },
    {
      id: 'sub-3',
      nameArabic: 'الكيمياء والفيزياء (لغات)',
      nameEnglish: 'Integrated Sciences & Chemistry',
      code: 'SCI-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 5,
      type: 'منهج لغات متقدم',
      totalMarks: 100
    },
    {
      id: 'sub-4',
      nameArabic: 'اللغة العربية والخط والإملاء',
      nameEnglish: 'Arabic Language & Literature',
      code: 'ARB-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 4,
      type: 'منهج وزاري موحد',
      totalMarks: 80
    },
    {
      id: 'sub-5',
      nameArabic: 'اللغة الفرنسية (لغة أجنبية ثانية)',
      nameEnglish: 'French Language (Deuxième Langue)',
      code: 'FRN-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 3,
      type: 'لغة أجنبية ثانية',
      totalMarks: 40
    },
    {
      id: 'sub-6',
      nameArabic: 'تكنولوجيا المعلومات والبرمجة',
      nameEnglish: 'Computer Science & AI Basics',
      code: 'ICT-101',
      gradeLevel: 'الصف الأول الإعدادي',
      weeklyHours: 2,
      type: 'منهج وزاري موحد',
      totalMarks: 40
    }
  ]);
}


import { Component, signal } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';

interface Exam {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  date: string;
  durationMinutes: number;
  totalMarks: number;
  hallNumber: string;
  supervisor: string;
}

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [ArabicDatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">إدارة الاختبارات والتقييمات</h2>
          <p class="text-xs text-slate-500 mt-1">جداول الامتحانات الشهرية ونصف العام، توزيع لجان المراقبة، وأرقام الجلوس</p>
        </div>

        <button 
          type="button" 
          class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>إدراج امتحان جديد</span>
        </button>
      </div>

      <!-- Exams List -->
      <div class="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">جدول امتحانات الفصل الدراسي الحالي</h3>
          <span class="text-xs text-primary-700 bg-primary-50 px-3 py-1 rounded-full font-bold">
            امتحانات نصف العام 2026/2027
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-sm">
            <thead class="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th class="py-3.5 px-4">اسم الامتحان</th>
                <th class="py-3.5 px-4">المادة</th>
                <th class="py-3.5 px-4">المرحلة</th>
                <th class="py-3.5 px-4">تاريخ الانعقاد</th>
                <th class="py-3.5 px-4 text-center">المدة</th>
                <th class="py-3.5 px-4 text-center">الدرجة الكلية</th>
                <th class="py-3.5 px-4">اللجنة / القاعة</th>
                <th class="py-3.5 px-4">رئيس اللجنة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (exam of exams(); track exam.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 font-bold text-slate-800">{{ exam.name }}</td>
                  <td class="py-3.5 px-4 text-primary-700 font-semibold text-xs">{{ exam.subject }}</td>
                  <td class="py-3.5 px-4 text-xs font-medium">{{ exam.gradeLevel }}</td>
                  <td class="py-3.5 px-4 text-xs font-semibold">{{ exam.date | arabicDate:'full' }}</td>
                  <td class="py-3.5 px-4 text-center text-xs font-mono font-bold">{{ exam.durationMinutes }} دقيقة</td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="bg-slate-100 text-slate-800 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs">
                      {{ exam.totalMarks }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs font-semibold text-slate-600">{{ exam.hallNumber }}</td>
                  <td class="py-3.5 px-4 text-xs font-medium">{{ exam.supervisor }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ExamsComponent {
  readonly exams = signal<Exam[]>([
    {
      id: 'ex-1',
      name: 'امتحان نصف العام - Advanced English',
      subject: 'اللغة الإنجليزية الرفيعة',
      gradeLevel: 'الصف الأول الثانوي',
      date: new Date(Date.now() + 86400000 * 5).toISOString(),
      durationMinutes: 120,
      totalMarks: 100,
      hallNumber: 'مدرج الشهيد أحمد إبراهيم (أ)',
      supervisor: 'أ/ نادية الشربيني'
    },
    {
      id: 'ex-2',
      name: 'امتحان نصف العام - Pure Mathematics',
      subject: 'الرياضيات البحتة',
      gradeLevel: 'الصف الأول الثانوي',
      date: new Date(Date.now() + 86400000 * 7).toISOString(),
      durationMinutes: 120,
      totalMarks: 100,
      hallNumber: 'مدرج الشهيد أحمد إبراهيم (ب)',
      supervisor: 'أ. د. محمود الشناوي'
    },
    {
      id: 'ex-3',
      name: 'امتحان نصف العام - Integrated Chemistry',
      subject: 'الكيمياء لغات',
      gradeLevel: 'الصف الأول الثانوي',
      date: new Date(Date.now() + 86400000 * 9).toISOString(),
      durationMinutes: 90,
      totalMarks: 80,
      hallNumber: 'معمل الكيمياء الحديث',
      supervisor: 'د/ شريف فؤاد'
    }
  ]);
}


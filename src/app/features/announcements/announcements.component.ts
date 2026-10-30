import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'عاجل وهام' | 'إداري' | 'أولياء الأمور' | 'أنشطة وفعاليات';
  publishDate: string;
  author: string;
  targetAudience: string;
  isPinned?: boolean;
}

@Component({
  selector: 'app-announcements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArabicDatePipe],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">لوحة الإعلانات والتعميمات الرسمية</h2>
          <p class="text-xs text-slate-500 mt-1">البيانات الإدارية، مواعيد الفعاليات المدرسية والتعميمات العاجلة</p>
        </div>

        <button 
          type="button" 
          class="px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs shadow-md shadow-primary-900/10 flex items-center gap-2 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>نشر تعميم أو إعلان جديد</span>
        </button>
      </div>

      <!-- Categories Filter -->
      <div class="flex flex-wrap gap-2">
        @for (cat of categories; track cat) {
          <button 
            type="button"
            (click)="selectedCategory.set(cat)"
            [class]="selectedCategory() === cat ? 'bg-primary-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200/60">
            {{ cat }}
          </button>
        }
      </div>

      <!-- Announcements List -->
      <div class="space-y-4">
        @for (item of filteredAnnouncements(); track item.id) {
          <div 
            [class.border-r-4]="item.isPinned"
            [class.border-r-primary-700]="item.isPinned"
            class="bg-white rounded-2xl p-6 shadow-soft border border-slate-100 hover:shadow-md transition-shadow space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                @if (item.isPinned) {
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                    مثبت عاجل ★
                  </span>
                }
                <span 
                  [class]="getCategoryBadgeClass(item.category)"
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  {{ item.category }}
                </span>
                <span class="text-xs text-slate-400">
                  المستهدف: <strong class="text-slate-600">{{ item.targetAudience }}</strong>
                </span>
              </div>

              <span class="text-xs text-slate-400 font-medium">
                {{ item.publishDate | arabicDate:'full' }}
              </span>
            </div>

            <h3 class="text-lg font-black text-slate-800">{{ item.title }}</h3>
            <p class="text-sm text-slate-600 leading-relaxed">{{ item.content }}</p>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>صادر عن: <strong class="text-slate-700">{{ item.author }}</strong></span>
              <button type="button" class="text-primary-700 hover:text-primary-900 font-bold">
                تحميل المرفقات (PDF) 🗎
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AnnouncementsComponent {
  readonly categories = ['الكل', 'عاجل وهام', 'إداري', 'أولياء الأمور', 'أنشطة وفعاليات'];
  readonly selectedCategory = signal<string>('الكل');

  readonly announcements = signal<Announcement[]>([
    {
      id: 'anc-1',
      title: 'اعتماد جدول اختبارات منتصف العام الدراسي 2026/2027',
      content: 'تعلن إدارة المدرسة عن اعتماد ونشر جدول امتحانات الفصل الدراسي الأول لجميع صفوف المرحلة الإعدادية. يُرجى من جميع أبنائنا الطلاب الالتزام بالحضور بالزي المدرسي الموحد والالتزام بالتواجد بالقاعات قبل موعد الامتحان بنصف ساعة.',
      category: 'عاجل وهام',
      publishDate: new Date().toISOString(),
      author: 'إدارة شؤون الامتحانات والكنترول',
      targetAudience: 'الطلاب وأولياء الأمور',
      isPinned: true
    },
    {
      id: 'anc-2',
      title: 'انطلاق معرض العلوم والابتكارات والذكاء الاصطناعي السنوي',
      content: 'يسر قسم العلوم والتكنولوجيا بالمدرسة دعوة الطلاب المتميزين لتقديم نماذجهم ومشاريعهم العلمية لمعرض الابتكارات السنوي بمقر مسرح المدرسة تحت رعاية وزارة التربية والتعليم.',
      category: 'أنشطة وفعاليات',
      publishDate: new Date(Date.now() - 86400000).toISOString(),
      author: 'أسرة النشاط العلمي والابتكار',
      targetAudience: 'جميع المراحل الدراسية',
      isPinned: false
    },
    {
      id: 'anc-3',
      title: 'الجمعية العمومية لمجلس الآباء والمعلمين',
      content: 'تتشرف إدارة مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين بدعوة السادة أولياء الأمور الكرام لحضور الجمعية العمومية لمجلس الآباء والمعلمين لمناقشة الخطة الأكاديمية والتطويرية للعام الدراسي.',
      category: 'أولياء الأمور',
      publishDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      author: 'مكتب الأخصائي الاجتماعي',
      targetAudience: 'أولياء الأمور الكرام',
      isPinned: false
    }
  ]);

  readonly filteredAnnouncements = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'الكل') return this.announcements();
    return this.announcements().filter(a => a.category === cat);
  });

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'عاجل وهام':
        return 'bg-rose-50 text-rose-700';
      case 'إداري':
        return 'bg-primary-50 text-primary-700';
      case 'أولياء الأمور':
        return 'bg-amber-50 text-amber-700';
      case 'أنشطة وفعاليات':
      default:
        return 'bg-emerald-50 text-emerald-700';
    }
  }
}


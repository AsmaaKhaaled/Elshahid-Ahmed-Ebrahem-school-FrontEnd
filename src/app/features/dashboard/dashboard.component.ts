import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ArabicDatePipe } from '../../shared/pipes/arabic-date.pipe';
import { SCHOOL_INFO } from '../../core/constants/school.constants';

interface StatMetric {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  iconBg: string;
  iconColor: string;
  icon: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'EXAM' | 'ATTENDANCE' | 'ASSIGNMENT' | 'ANNOUNCEMENT';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ArabicDatePipe],
  template: `
    <div class="space-y-6">
      <!-- Welcome Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary-950 via-primary-900 to-slate-900 text-white p-6 md:p-8 shadow-card border border-primary-800/40">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2 max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-primary-200 border border-white/10">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>نظام المتابعة الأكاديمية اللحظية</span>
            </div>
            <h2 class="text-2xl md:text-3xl font-black tracking-tight">
              مرحباً بك مجدداً، {{ authService.userName() }}
            </h2>
            <p class="text-sm text-slate-300 leading-relaxed">
              تتابع الآن المؤشرات الأكاديمية وسير العملية التعليمية ب{{ school.fullName }} ({{ school.category }}). جميع الأنظمة تعمل بكفاءة.
            </p>
            <p class="text-xs text-primary-200 font-semibold">
              مدير المدرسة: {{ school.principal }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <a 
              routerLink="/attendance" 
              class="px-4 py-2.5 rounded-xl bg-white text-primary-900 hover:bg-primary-50 font-bold text-xs shadow-md transition-all flex items-center gap-2">
              <svg class="w-4 h-4 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>تسجيل حضور اليوم</span>
            </a>

            <a 
              routerLink="/announcements" 
              class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-all flex items-center gap-2">
              <span>إرسال تعميم جديد</span>
            </a>
          </div>
        </div>

        <!-- Geometric background shapes -->
        <div class="absolute -left-10 -bottom-10 w-60 h-60 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute right-1/3 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        @for (stat of stats(); track stat.title) {
          <div class="bg-white p-5 rounded-2xl shadow-soft border border-slate-100/80 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">{{ stat.title }}</span>
              <div [class]="stat.iconBg + ' ' + stat.iconColor" class="w-10 h-10 rounded-xl flex items-center justify-center p-2">
                <span class="w-6 h-6 flex items-center justify-center" [innerHTML]="stat.icon"></span>
              </div>
            </div>
            
            <div class="mt-4 flex items-baseline justify-between">
              <span class="text-2xl font-black text-slate-800">{{ stat.value }}</span>
              <span [class]="stat.isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'" class="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                @if (stat.isPositive) { ↑ } @else { ↓ } {{ stat.change }}
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Middle Content Grid: Schedule & Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Today's Schedule and Periods -->
        <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-soft border border-slate-100/80 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="font-bold text-slate-800 text-base">جدول الحصص المدرسية اليوم</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ today | arabicDate:'dateOnly' }} - الفترة الصباحية</p>
            </div>
            <a routerLink="/lessons" class="text-xs font-bold text-primary-700 hover:text-primary-900">عرض الجدول كاملاً ←</a>
          </div>

          <div class="space-y-3">
            @for (period of todaySchedule(); track period.id) {
              <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs shrink-0">
                    {{ period.periodNumber }}
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-slate-800">{{ period.subject }}</h4>
                    <p class="text-xs text-slate-500">{{ period.teacher }} | {{ period.className }}</p>
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-3 text-xs">
                  <span class="text-slate-500 font-medium dir-ltr">{{ period.time }}</span>
                  <span [class]="period.statusBadgeClass" class="px-2.5 py-1 rounded-full font-semibold text-[11px]">
                    {{ period.status }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Recent Notices and Activity -->
        <div class="bg-white rounded-2xl p-6 shadow-soft border border-slate-100/80 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="font-bold text-slate-800 text-base">أحدث التعميمات والأنشطة</h3>
            <span class="text-xs text-slate-400">مباشر</span>
          </div>

          <div class="space-y-4">
            @for (item of activities(); track item.id) {
              <div class="flex items-start gap-3 text-right">
                <div class="w-2 h-2 rounded-full bg-primary-600 mt-2 shrink-0"></div>
                <div class="flex-1">
                  <h4 class="text-xs font-bold text-slate-800">{{ item.title }}</h4>
                  <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{{ item.description }}</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">{{ item.time }}</span>
                </div>
              </div>
            }
          </div>

          <div class="pt-2">
            <a 
              routerLink="/announcements" 
              class="w-full block py-2.5 text-center text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors">
              عرض أرشيف الإعلانات
            </a>
          </div>
        </div>
      </div>

      <!-- Quick Action Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <a routerLink="/students" class="p-4 rounded-2xl bg-white hover:bg-primary-50 border border-slate-100 text-center transition-all group">
          <div class="w-10 h-10 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          </div>
          <span class="text-xs font-bold text-slate-700">شؤون الطلاب</span>
        </a>

        <a routerLink="/teachers" class="p-4 rounded-2xl bg-white hover:bg-primary-50 border border-slate-100 text-center transition-all group">
          <div class="w-10 h-10 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
          </div>
          <span class="text-xs font-bold text-slate-700">المعلمين</span>
        </a>

        <a routerLink="/classes" class="p-4 rounded-2xl bg-white hover:bg-primary-50 border border-slate-100 text-center transition-all group">
          <div class="w-10 h-10 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <span class="text-xs font-bold text-slate-700">الفصول</span>
        </a>

        <a routerLink="/assignments" class="p-4 rounded-2xl bg-white hover:bg-primary-50 border border-slate-100 text-center transition-all group">
          <div class="w-10 h-10 mx-auto rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <span class="text-xs font-bold text-slate-700">الواجبات</span>
        </a>

        <a routerLink="/exams" class="p-4 rounded-2xl bg-white hover:bg-primary-50 border border-slate-100 text-center transition-all group">
          <div class="w-10 h-10 mx-auto rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <span class="text-xs font-bold text-slate-700">الاختبارات</span>
        </a>

        <a routerLink="/grades" class="p-4 rounded-2xl bg-white hover:bg-primary-50 border border-slate-100 text-center transition-all group">
          <div class="w-10 h-10 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/></svg>
          </div>
          <span class="text-xs font-bold text-slate-700">كشوف الدرجات</span>
        </a>
      </div>
    </div>
  `
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  readonly school = SCHOOL_INFO;
  readonly today = new Date();

  readonly stats = signal<StatMetric[]>([
    {
      title: 'إجمالي الطلاب المقيدين',
      value: '1,420',
      change: '+4.2%',
      isPositive: true,
      iconBg: 'bg-blue-50',
      iconColor: 'text-primary-700',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
    },
    {
      title: 'هيئة التدريس والمشرفين',
      value: '84',
      change: '+2 معلم',
      isPositive: true,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2"/></svg>`
    },
    {
      title: 'نسبة الحضور اليومي',
      value: '96.8%',
      change: '+1.5%',
      isPositive: true,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    },
    {
      title: 'متوسط الأداء والتقييم',
      value: '89.4%',
      change: '+3.1%',
      isPositive: true,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
      icon: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/></svg>`
    }
  ]);

  readonly todaySchedule = signal([
    {
      id: '1',
      periodNumber: '1',
      subject: 'اللغة الإنجليزية',
      teacher: 'مستر أحمد عبد السلام',
      className: 'فصل 1/1',
      time: '08:00 - 08:45 AM',
      status: 'جارية الآن',
      statusBadgeClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: '2',
      periodNumber: '2',
      subject: 'الرياضيات',
      teacher: 'أ/ سامي نبيل',
      className: 'فصل 2/2',
      time: '08:50 - 09:35 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      id: '3',
      periodNumber: '3',
      subject: 'العلوم',
      teacher: 'د/ شريف فؤاد',
      className: 'فصل 3/1',
      time: '09:40 - 10:25 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      id: '4',
      periodNumber: '4',
      subject: 'اللغة العربية والتربية الإسلامية',
      teacher: 'الشيخ عبد الرحمن طه',
      className: 'فصل 1/2',
      time: '10:50 - 11:35 AM',
      status: 'قادمة',
      statusBadgeClass: 'bg-slate-100 text-slate-700'
    }
  ]);

  readonly activities = signal<ActivityItem[]>([
    {
      id: 'a1',
      title: 'إعلان جدول امتحانات نصف العام 2026/2027',
      description: 'تم اعتماد جدول امتحانات الفصل الدراسي الأول من قِبل إدارة المدرسة والكنترول.',
      time: 'منذ 15 دقيقة',
      type: 'ANNOUNCEMENT'
    },
    {
      id: 'a2',
      title: 'اكتمال حصر غياب الطابور الصباحي',
      description: 'تم توثيق حضور 96.8% من الطلاب في كافة المراحل التعليمية بنجاح.',
      time: 'منذ ساعة',
      type: 'ATTENDANCE'
    },
    {
      id: 'a3',
      title: 'طرح واجب العلوم',
      description: 'أضاف قسم العلوم واجباً لطلاب الصف الثاني الإعدادي.',
      time: 'منذ ساعتين',
      type: 'ASSIGNMENT'
    }
  ]);
}


import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';

const NAME_TITLES = new Set(['أ', 'د', 'م', 'الأستاذ', 'الأستاذة', 'الشيخ', 'المهندس', 'الدكتور']);

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, ArabicDatePipe, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-30 h-18 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between transition-all">
      <!-- Right Side: Sidebar Toggle & Breadcrumbs / Title -->
      <div class="flex items-center gap-4">
        @if (showSidebarToggle()) {
          <button
            (click)="toggleSidebar.emit()"
            type="button"
            class="p-2 rounded-xl text-slate-500 hover:text-primary-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            title="القائمة الجانبية">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        }

        <div>
          <h1 class="text-xl font-bold text-slate-800 tracking-tight">{{ title() }}</h1>
          <p class="text-xs text-slate-600 hidden sm:block">
            {{ today | arabicDate:'full' }}
          </p>
        </div>
      </div>

      <!-- Left Side: Search, Quick Stats, Notifications & User Menu -->
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- School Tag Badge -->
        <div class="hidden xl:flex items-center gap-2 ps-1 pe-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-xs text-primary-800 font-semibold">
          <img [ngSrc]="school.logoUrl" width="26" height="26" alt="" class="rounded-full" />
          <span>{{ school.fullName }}</span>
        </div>

        <!-- Notification Bell -->
        <div class="relative">
          <button 
            (click)="toggleNotifications()"
            type="button" 
            class="relative p-2.5 rounded-xl text-slate-500 hover:text-primary-700 hover:bg-slate-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          <!-- Notifications Popup Menu -->
          @if (isNotificationsOpen()) {
            <div class="absolute left-0 mt-2 w-80 rounded-2xl bg-white shadow-elevated border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div class="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span class="font-bold text-sm text-slate-800">التنبيهات المدرسية</span>
                <span class="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full font-medium">3 جديدة</span>
              </div>
              <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <div class="p-3 hover:bg-slate-50 transition-colors text-right cursor-pointer">
                  <p class="text-xs font-semibold text-slate-800">إعلان جدول امتحانات نصف العام</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">تم نشر جدول امتحانات الفصل الدراسي الأول لجميع المراحل.</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">منذ 25 دقيقة</span>
                </div>
                <div class="p-3 hover:bg-slate-50 transition-colors text-right cursor-pointer">
                  <p class="text-xs font-semibold text-slate-800">تسجيل درجات اختبار الرياضيات</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">قام أستاذ الرياضيات برفع نتائج الاختبار الأسبوعي.</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">منذ ساعتين</span>
                </div>
              </div>
              <div class="pt-2 px-3 border-t border-slate-100 text-center">
                <a routerLink="/announcements" class="text-xs font-semibold text-primary-600 hover:text-primary-800">
                  عرض جميع الإعلانات والتنبيهات
                </a>
              </div>
            </div>
          }
        </div>

        <!-- User Profile Dropdown -->
        <div class="relative">
          <button 
            (click)="toggleProfileMenu()"
            type="button" 
            class="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100 transition-colors focus:outline-none">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-800 to-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary-900/10">
              {{ userInitials() }}
            </div>
            <div class="text-right hidden md:block">
              <span class="block text-xs font-bold text-slate-800 leading-tight">{{ authService.userName() }}</span>
              <span class="block text-[11px] text-slate-600 font-medium">{{ roleLabel() }}</span>
            </div>
            <svg class="w-4 h-4 text-slate-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- User Popup Menu -->
          @if (isProfileMenuOpen()) {
            <div class="absolute left-0 mt-2 w-56 rounded-2xl bg-white shadow-elevated border border-slate-100 py-2 z-50">
              <div class="px-4 py-2 border-b border-slate-100 md:hidden">
                <p class="text-sm font-bold text-slate-800">{{ authService.userName() }}</p>
                <p class="text-xs text-slate-500">{{ roleLabel() }}</p>
              </div>

              <a 
                routerLink="/auth/set-initial-password" 
                (click)="isProfileMenuOpen.set(false)"
                class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors">
                <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>تغيير كلمة المرور</span>
              </a>

              <button 
                (click)="handleLogout()" 
                type="button" 
                class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-right">
                <svg class="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>تسجيل الخروج</span>
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  readonly authService = inject(AuthService);

  readonly school = SCHOOL_INFO;

  readonly title = input<string>('لوحة التحكم');
  readonly showSidebarToggle = input<boolean>(true);
  readonly toggleSidebar = output<void>();

  readonly today = new Date();
  readonly isProfileMenuOpen = signal<boolean>(false);
  readonly isNotificationsOpen = signal<boolean>(false);

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(v => !v);
    if (this.isProfileMenuOpen()) {
      this.isNotificationsOpen.set(false);
    }
  }

  toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  // Initials of the logged-in user's real name, skipping titles like "أ." / "د." / "الأستاذ"
  readonly userInitials = computed(() => {
    const nameParts = this.authService.userName()
      .split(/\s+/)
      .filter(part => part && !NAME_TITLES.has(part.replace(/[./]/g, '')));
    return nameParts.slice(0, 2).map(part => part[0]).join(' ');
  });

  readonly roleLabel = computed(() => {
    switch (this.authService.userRole()) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return this.authService.userName() === SCHOOL_INFO.principal ? 'مدير المدرسة' : 'إدارة المدرسة';
      case 'TEACHER':
        return 'هيئة التدريس';
      case 'STUDENT':
        return 'طالب مقيد';
      case 'PARENT':
        return 'ولي أمر';
      default:
        return 'مستخدم النظام';
    }
  });

  handleLogout(): void {
    this.isProfileMenuOpen.set(false);
    this.authService.logout();
  }
}


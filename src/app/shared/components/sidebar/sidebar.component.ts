import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';
import { UserRole } from '../../../core/models/user.model';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  roles: UserRole[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Mobile Backdrop -->
    @if (!pinned() && !isCollapsed()) {
      <div
        (click)="closeSidebar()"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity">
      </div>
    }

    <!-- Sidebar Container -->
    <aside
      [class.translate-x-full]="!pinned() && isCollapsed()"
      [class]="pinned()
        ? 'static shrink-0 h-screen w-64 lg:w-72 bg-slate-900 text-white flex flex-col border-l border-slate-800'
        : 'fixed lg:static top-0 right-0 z-50 h-screen w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none border-l border-slate-800'">
      
      <!-- Brand Header -->
      <div class="h-20 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
        <div class="flex items-center gap-3">
          <img
            [ngSrc]="school.logoUrl"
            width="48"
            height="48"
            priority
            [alt]="'شعار ' + school.fullName"
            class="shrink-0 rounded-full ring-2 ring-white/15 shadow-lg shadow-primary-900/40" />
          <div class="flex flex-col">
            <span class="font-bold text-sm tracking-tight text-white leading-tight">{{ school.name }}</span>
            <span class="text-[11px] text-primary-400 font-medium">{{ school.type }} - {{ school.category }}</span>
          </div>
        </div>

        <!-- Mobile Close Button -->
        @if (!pinned()) {
        <button
          (click)="closeSidebar()"
          type="button" 
          class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        }
      </div>

      <!-- User Role Pill Indicator -->
      <div class="px-6 py-3 bg-slate-950/20 border-b border-slate-800/40 flex items-center justify-between text-xs">
        <span class="text-slate-400">بوابة الدخول:</span>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-950 text-primary-300 border border-primary-800/60">
          {{ roleTitle() }}
        </span>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin">
        @for (item of visibleNavItems(); track item.route) {
          <a
            [routerLink]="basePath() + item.route"
            routerLinkActive
            #rla="routerLinkActive"
            [attr.aria-current]="rla.isActive ? 'page' : null"
            [class]="rla.isActive
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/40 font-bold ring-1 ring-primary-400/40 border-r-4 border-sky-300'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium border-r-4 border-transparent'"
            (click)="onNavigate()"
            class="group flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm">
            <div class="flex items-center gap-3">
              <span
                [class]="rla.isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-300'"
                class="w-5 h-5 flex items-center justify-center transition-colors" [innerHTML]="item.icon"></span>
              <span>{{ item.label }}</span>
            </div>
            @if (item.badge) {
              <span [class]="item.badgeColor || 'bg-slate-800 text-slate-300'" class="text-[10px] px-2 py-0.5 rounded-full font-bold">
                {{ item.badge }}
              </span>
            }
          </a>
        }
      </nav>

      <!-- Sidebar Footer -->
      <div class="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div class="flex items-center justify-between px-2 text-[11px] text-slate-400">
          <span>نظام الإدارة المدرسية</span>
          <span class="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">v1.0.0</span>
        </div>
        <button 
          (click)="logout()"
          type="button" 
          class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 border border-rose-900/20 text-xs font-semibold transition-colors">
          <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  readonly school = SCHOOL_INFO;

  readonly role = input<UserRole>('ADMIN');
  readonly isCollapsed = model<boolean>(false);
  // Pinned: always visible, no toggle/backdrop (used by the admin layout)
  readonly pinned = input<boolean>(false);

  private readonly activeRole = computed<UserRole>(() => this.role() || this.authService.userRole() || 'ADMIN');

  // Each layout mounts its children under its own prefix (/admin, /teacher, /student),
  // so links must target that prefix for routerLinkActive to match the current URL.
  readonly basePath = computed(() => {
    switch (this.activeRole()) {
      case 'TEACHER':
        return '/teacher';
      case 'STUDENT':
      case 'PARENT':
        return '/student';
      default:
        return '/admin';
    }
  });

  readonly allNavItems: NavItem[] = [
    {
      label: 'الرئيسية (لوحة التحكم)',
      route: '/dashboard',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']
    },
    {
      label: 'شؤون الطلاب',
      route: '/students',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'هيئة التدريس',
      route: '/teachers',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'الفصول والقاعات',
      route: '/classes',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER']
    },
    {
      label: 'المناهج والمواد الدراسية',
      route: '/subjects',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER']
    },
    {
      label: 'الدروس والجدول المدرسي',
      route: '/lessons',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'الواجبات والتكليفات',
      route: '/assignments',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
      badge: 'مهمة',
      badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'الاختبارات والتقييم',
      route: '/exams',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'دفتر الحضور والغياب',
      route: '/attendance',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'إحصائية حضور وغياب الطلاب',
      route: '/attendance-stats',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'دفتر حضور وغياب المعلمين',
      route: '/teacher-attendance',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253M15 10l1.5 1.5L19 9"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'النتائج وكشوف الدرجات',
      route: '/grades',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'لوحة الإعلانات والتعميمات',
      route: '/announcements',
      icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>`,
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']
    }
  ];

  // Computed once per role change instead of being re-evaluated on every change detection
  readonly visibleNavItems = computed<NavItem[]>(() =>
    this.allNavItems.filter(item => item.roles.includes(this.activeRole()))
  );

  readonly roleTitle = computed(() => {
    switch (this.activeRole()) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'إدارة النظام والكنترول';
      case 'TEACHER':
        return 'بوابة المعلمين والتدريس';
      case 'STUDENT':
        return 'بوابة الطالب والأنشطة';
      case 'PARENT':
        return 'بوابة أولياء الأمور';
      default:
        return 'نظام المدرسة';
    }
  });

  closeSidebar(): void {
    this.isCollapsed.set(true);
  }

  onNavigate(): void {
    // Auto-close on mobile upon navigation
    if (!this.pinned() && window.innerWidth < 1024) {
      this.closeSidebar();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}


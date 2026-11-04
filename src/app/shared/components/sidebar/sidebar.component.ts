import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarDrawer } from './sidebar-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';
import { UserRole } from '../../../core/models/user.model';
import { AdminRouteAccess, SUPER_ADMIN_ONLY } from '../../../core/admin/admin-permissions';

/** Class sets for the sidebar's parts */
interface SidebarTheme {
  aside: string;
  brand: string;
  brandName: string;
  brandSub: string;
  close: string;
  roleRow: string;
  roleLabel: string;
  rolePill: string;
  linkActive: string;
  linkIdle: string;
  iconActive: string;
  iconIdle: string;
  disabled: string;
  disabledIcon: string;
  soonBadge: string;
  badge: string;
  footer: string;
  footerText: string;
  version: string;
  logout: string;
}

const DARK: SidebarTheme = {
  aside: 'bg-slate-900 text-white border-slate-800',
  brand: 'border-slate-800/80 bg-slate-950/40',
  brandName: 'text-white',
  brandSub: 'text-primary-400',
  close: 'text-slate-400 hover:text-white hover:bg-slate-800',
  roleRow: 'bg-slate-950/20 border-slate-800/40',
  roleLabel: 'text-slate-400',
  rolePill: 'bg-primary-950 text-primary-300 border-primary-800/60',
  linkActive: 'bg-primary-600 text-white shadow-lg shadow-primary-950/40 font-bold ring-1 ring-primary-400/40 border-sky-300',
  linkIdle: 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium border-transparent',
  iconActive: 'text-white',
  iconIdle: 'text-slate-400 group-hover:text-primary-300',
  disabled: 'text-slate-500',
  disabledIcon: 'text-slate-600',
  soonBadge: 'bg-slate-800 text-slate-400',
  badge: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
  footer: 'border-slate-800/80 bg-slate-950/40',
  footerText: 'text-slate-400',
  version: 'bg-slate-800',
  logout: 'text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 border-rose-900/20'
};

/**
 * Teachers & students: below lg the drawer is white like the public site's menu
 * (public-header), and from lg up it's the same dark sidebar as the admin's (the lg: half).
 */
const LIGHT_ON_MOBILE: SidebarTheme = {
  aside: 'bg-white text-slate-800 border-slate-200 lg:bg-slate-900 lg:text-white lg:border-slate-800',
  brand: 'border-slate-100 bg-slate-50 lg:border-slate-800/80 lg:bg-slate-950/40',
  brandName: 'text-slate-900 lg:text-white',
  brandSub: 'text-slate-500 lg:text-primary-400',
  close: 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60',
  roleRow: 'bg-slate-50/50 border-slate-100 lg:bg-slate-950/20 lg:border-slate-800/40',
  roleLabel: 'text-slate-500 lg:text-slate-400',
  rolePill: 'bg-portal-navy/10 text-portal-navy border-portal-navy/20 lg:bg-primary-950 lg:text-primary-300 lg:border-primary-800/60',
  linkActive: 'bg-portal-navy text-white shadow-sm font-bold border-transparent lg:bg-primary-600 lg:shadow-lg lg:shadow-primary-950/40 lg:ring-1 lg:ring-primary-400/40 lg:border-sky-300',
  linkIdle: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold border-transparent lg:font-medium lg:text-slate-300 lg:hover:text-white lg:hover:bg-slate-800/70',
  iconActive: 'text-white',
  iconIdle: 'text-portal-navy lg:text-slate-400 lg:group-hover:text-primary-300',
  disabled: 'text-slate-400 lg:text-slate-500',
  disabledIcon: 'text-slate-400 lg:text-slate-600',
  soonBadge: 'bg-slate-100 text-slate-500 lg:bg-slate-800 lg:text-slate-400',
  badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 lg:bg-emerald-900/60 lg:text-emerald-300 lg:border-emerald-700/50',
  footer: 'border-slate-100 bg-slate-50 lg:border-slate-800/80 lg:bg-slate-950/40',
  footerText: 'text-slate-500 lg:text-slate-400',
  version: 'bg-slate-200 lg:bg-slate-800',
  logout: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-transparent lg:bg-transparent lg:text-rose-300 lg:hover:text-rose-200 lg:hover:bg-rose-950/30 lg:border-rose-900/20'
};

interface NavItem {
  label: string;
  route: string;
  // SVG path data, drawn in the template (no [innerHTML], so Angular keeps it)

  iconPaths: string[];
  badge?: string;
  roles: UserRole[];
  // Shown but not clickable for these roles (feature temporarily disabled)
  disabledFor?: UserRole[];
  // Admin section permission; admins only see the sections they were granted
  access?: AdminRouteAccess;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  host: { '(document:keydown.escape)': 'drawer.close()' }
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  readonly drawer = inject(SidebarDrawer);

  constructor() {
    // On phones the drawer covers the page, so it closes once a page is picked
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.drawer.close());
  }

  readonly school = SCHOOL_INFO;

  readonly role = input<UserRole>('ADMIN');

  private readonly activeRole = computed<UserRole>(() => this.role() || this.authService.userRole() || 'ADMIN');

  readonly theme = computed<SidebarTheme>(() =>
    ['TEACHER', 'STUDENT', 'PARENT'].includes(this.activeRole()) ? LIGHT_ON_MOBILE : DARK
  );

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
      iconPaths: ['M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']
    },
    {
      label: 'شؤون الطلاب',
      route: '/students',
      access: 'students',
      iconPaths: ['M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'هيئة التدريس',
      route: '/teachers',
      access: 'teachers',
      iconPaths: ['M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'الجدول المدرسي',
      route: '/school-timetable',
      // Built from the teachers' schedules, so it shares their permission
      access: 'teachers',
      iconPaths: ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'الفصول الدراسية',
      route: '/classes',
      access: 'classes',
      iconPaths: ['M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'],
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER']
    },
    {
      label: 'المناهج والمواد الدراسية',
      route: '/subjects',
      iconPaths: ['M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'],
      // Each teacher keeps their own subjects' curriculum; students follow their class's;
      // the admin views every teacher's, with the plan & objectives
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'الدروس والجدول المدرسي',
      route: '/lessons',
      iconPaths: ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
      // Admins manage schedules from each teacher's weekly schedule (هيئة التدريس)
      roles: ['TEACHER', 'STUDENT']
    },
    {
      label: 'الواجبات والتكليفات',
      route: '/assignments',
      iconPaths: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'],
      badge: 'مهمة',
      // Assignments are the teachers' own work; the admin panel doesn't follow them
      roles: ['TEACHER', 'STUDENT']
    },
    {
      label: 'المواد التعليمية والملفات',
      route: '/materials',
      iconPaths: ['M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', 'M12 11v6m0 0l-3-3m3 3l3-3'],
      // Teachers upload, students download; admins see the uploads in "نشاط المستخدمين على المنصة"
      roles: ['TEACHER', 'STUDENT']
    },
    {
      label: 'فيديوهات الشرح',
      route: '/videos',
      iconPaths: ['M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'],
      // Coming soon: hosting & streaming videos needs storage on the server first.
      // Until then teachers share video links (YouTube, Drive) in المواد التعليمية.
      roles: ['TEACHER', 'STUDENT'],
      disabledFor: ['TEACHER', 'STUDENT']
    },
    {
      label: 'الكويزات والاختبارات القصيرة',
      route: '/quizzes',
      iconPaths: ['M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
      roles: ['TEACHER', 'STUDENT']
    },
    {
      label: 'جدول الاختبارات والتقييمات',
      route: '/exams',
      access: 'exams',
      iconPaths: ['M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'],
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT']
    },
    {
      label: 'دفتر الحضور والغياب',
      route: '/attendance',
      iconPaths: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'],
      // Taking attendance is the teacher's job; admins follow "إحصائية حضور وغياب الطلاب"
      roles: ['TEACHER', 'STUDENT']
    },
    {
      label: 'إحصائية حضور وغياب الطلاب',
      route: '/attendance-stats',
      access: 'attendance-stats',
      iconPaths: ['M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'دفتر حضور وغياب المعلمين',
      route: '/teacher-attendance',
      access: 'teacher-attendance',
      iconPaths: ['M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253M15 10l1.5 1.5L19 9'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'نشاط المستخدمين على المنصة',
      route: '/platform-activity',
      access: 'platform-activity',
      iconPaths: ['M13 10V3L4 14h7v7l9-11h-7z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'سجل رصد الدرجات',
      route: '/grades',
      iconPaths: ['M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', 'M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z'],
      roles: ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT'],
      disabledFor: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'العام والفصل الدراسي',
      route: '/academic-year',
      access: 'academic-year',
      iconPaths: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'لوحة الشرف',
      route: '/honor-roll',
      access: 'honor-roll',
      iconPaths: ['M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'المسؤولون والصلاحيات',
      route: '/admins',
      access: SUPER_ADMIN_ONLY,
      iconPaths: ['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      label: 'لوحة الإعلانات والتعميمات',
      route: '/announcements',
      access: 'announcements',
      iconPaths: ['M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'],
      roles: ['ADMIN', 'SUPER_ADMIN']
    }
  ];

  // Computed once per role change instead of being re-evaluated on every change detection
  readonly visibleNavItems = computed<NavItem[]>(() => {
    const role = this.activeRole();
    const isAdminPanel = role === 'ADMIN' || role === 'SUPER_ADMIN';
    return this.allNavItems.filter(item =>
      item.roles.includes(role) &&
      // Inside the admin panel, hide the sections this admin wasn't granted
      (!isAdminPanel || !item.access || this.authService.canAccessAdminSection(item.access))
    );
  });

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

  isDisabled(item: NavItem): boolean {
    return !!item.disabledFor?.includes(this.activeRole());
  }

  logout(): void {
    this.authService.logout();
  }
}


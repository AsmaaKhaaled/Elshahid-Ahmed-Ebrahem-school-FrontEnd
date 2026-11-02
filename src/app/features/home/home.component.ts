import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { HonorAvatarComponent } from '../honor-roll/honor-avatar.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { HonorRollStore } from '../honor-roll/honor-roll.store';
import { TEACHER_HONORIFIC } from '../teachers/teacher.model';
import { SCHOOL_INFO } from '../../core/constants/school.constants';

interface SchoolNotice {
  day: string;
  month: string;
  tag: string;
  title: string;
  description: string;
}

interface AcademicPillar {
  id: 'smart-class' | 'labs' | 'monitoring' | 'activities';
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, HonorAvatarComponent, PublicHeaderComponent, PublicFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  readonly authService = inject(AuthService);
  readonly academicYear = inject(AcademicCalendarStore).currentYear;
  readonly academicTerm = inject(AcademicCalendarStore).currentTerm;
  private readonly router = inject(Router);

  readonly schoolLogo = SCHOOL_INFO.logoUrl;
  readonly isUserMenuOpen = signal<boolean>(false);

  readonly userFirstName = computed(() => {
    const fullName = this.authService.userName()?.trim();
    if (!fullName) return 'المستخدم';
    return fullName.split(/\s+/)[0] || fullName;
  });

  readonly userAvatarUrl = computed(() => {
    const user = this.authService.currentUser();
    return user?.avatarUrl || null;
  });

  readonly userRoleArabic = computed(() => {
    const role = this.authService.userRole();
    switch (role) {
      case 'SUPER_ADMIN':
        return 'المشرف العام';
      case 'ADMIN':
        return 'إدارة المدرسة';
      case 'TEACHER':
        return 'عضو هيئة التدريس';
      case 'STUDENT':
        return 'طالب مقيد';
      default:
        return 'مستخدم مسجل';
    }
  });

  readonly dashboardTitle = computed(() => {
    const role = this.authService.userRole();
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'لوحة إدارة المدرسة';
      case 'TEACHER':
        return 'مساحة المعلم';
      case 'STUDENT':
        return 'بوابة الطالب';
      default:
        return 'لوحة التحكم';
    }
  });

  // Modal & Drawer Control Signals
  readonly isStudentModalOpen = signal<boolean>(false);
  readonly isTeacherModalOpen = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  // Student Form Model Signals
  readonly studentCode = signal<string>('STU-2026-001');
  readonly studentPassword = signal<string>('Student@2026');
  readonly studentShowPassword = signal<boolean>(false);
  readonly studentRememberMe = signal<boolean>(true);
  readonly studentErrorMessage = signal<string | null>(null);
  readonly studentIsLoading = signal<boolean>(false);

  // Teacher Form Model Signals
  readonly teacherNationalId = signal<string>('28901222800962');
  readonly teacherPassword = signal<string>('Teacher@2026');
  readonly teacherShowPassword = signal<boolean>(false);
  readonly teacherRememberMe = signal<boolean>(true);
  readonly teacherErrorMessage = signal<string | null>(null);
  readonly teacherIsLoading = signal<boolean>(false);

  // Core Pillars / Highlights Replacing Duplicates
  readonly pillars: AcademicPillar[] = [
    {
      id: 'smart-class',
      title: 'الفصول والقاعات الذكية',
      description: 'فصول تفاعلية وقاعات دراسية مجهزة بأحدث الشاشات والوسائل التعليمية الرقمية المتطورة.',
      iconBg: 'bg-blue-50',
      iconColor: 'text-portal-navy'
    },
    {
      id: 'labs',
      title: 'معامل التجارب واللغات',
      description: 'معامل علمية وبحثية مجهزة لتطبيق التجارب الكيميائية والفيزيائية والبرمجية عملياً.',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-portal-teal'
    },
    {
      id: 'monitoring',
      title: 'المتابعة والرصد اللحظي',
      description: 'منظومة رصد إلكترونية معتمدة للغياب اليومي ودرجات أعمال السنة وإشعارات فورية لولي الأمر.',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700'
    },
    {
      id: 'activities',
      title: 'رعاية الموهوبين والأنشطة',
      description: 'برامج متخصصة لرعاية الطلاب الفائقين والمبدعين في مسابقات العلوم والذكاء الاصطناعي.',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700'
    }
  ];

  // Honor roll (لوحة الشرف) - managed by the admins from /admin/honor-roll
  private readonly honorRoll = inject(HonorRollStore);
  readonly honorTeachers = this.honorRoll.teachers;
  readonly honorStudents = this.honorRoll.students;
  readonly teacherHonorific = TEACHER_HONORIFIC;

  // School Notices Matching Screenshot
  readonly notices: SchoolNotice[] = [
    {
      day: '12',
      month: 'مايو',
      tag: 'هام لجميع المعلمين • منذ يومين',
      title: 'فتح باب إدخال درجات التقويم الشامل والأنشطة الصفية',
      description: 'يُرجى من السادة معلمي المواد الأساسية الانتهاء من مراجعة بنوك الأسئلة ورصد درجات أعمال السنة عبر مساحة المعلم قبل نهاية الأسبوع الجاري.'
    },
    {
      day: '08',
      month: 'مايو',
      tag: 'للطلاب وأولياء الأمور • منذ 5 أيام',
      title: 'جدول المراجعات النهائية لطلاب الصفين الأول والثاني الإعدادي',
      description: 'تم رفع المذكرات التوجيهية ونماذج اختبارات الأعوام السابقة على منصة الطالب بصيغة PDF قابلة للتحميل مع الحل النموذجي.'
    },
    {
      day: '01',
      month: 'مايو',
      tag: 'النشاط الرياضي والعلمي • أول الشهر',
      title: 'فوز فريق المدرسة بالمركز الأول في مسابقة الابتكارات العلمية',
      description: 'تهنئ إدارة المدرسة أبناءنا الطلاب ومعلم مادة العلوم المشرف على مشروع توليد الطاقة النظيفة والتكريم على مستوى المحافظة.'
    }
  ];

  openStudentModal(): void {
    this.isStudentModalOpen.set(true);
    this.isTeacherModalOpen.set(false);
  }

  openTeacherModal(): void {
    this.isTeacherModalOpen.set(true);
    this.isStudentModalOpen.set(false);
  }

  closeModals(): void {
    this.isStudentModalOpen.set(false);
    this.isTeacherModalOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.isUserMenuOpen.set(false);
    this.authService.logout();
  }

  handleDirectDashboard(): void {
    const role = this.authService.userRole();
    if (role) {
      this.authService.navigateToRoleDashboard(role);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  fillStudentDemo(): void {
    this.studentCode.set('STU-2026-001');
    this.studentPassword.set('Student@2026');
    this.studentErrorMessage.set(null);
  }

  fillTeacherDemo(): void {
    this.teacherNationalId.set('28901222800962');
    this.teacherPassword.set('Teacher@2026');
    this.teacherErrorMessage.set(null);
  }

  submitStudentLogin(): void {
    const code = this.studentCode()?.trim();
    const pass = this.studentPassword();

    if (!code || !pass) {
      this.studentErrorMessage.set('يرجى إدخال كود الطالب المدرسي وكلمة المرور');
      return;
    }

    this.studentIsLoading.set(true);
    this.studentErrorMessage.set(null);

    this.authService.login({
      identifier: code,
      password: pass,
      rememberMe: this.studentRememberMe()
    }).subscribe({
      next: () => {
        this.studentIsLoading.set(false);
        this.closeModals();
      },
      error: (err) => {
        this.studentIsLoading.set(false);
        this.studentErrorMessage.set(
          err?.error?.message || 'تعذر تسجيل الدخول. يرجى التأكد من كود الطالب أو الاتصال بإدارة المدرسة.'
        );
      }
    });
  }

  submitTeacherLogin(): void {
    const nid = this.teacherNationalId()?.trim();
    const pass = this.teacherPassword();

    if (!nid || !pass) {
      this.teacherErrorMessage.set('يرجى إدخال الرقم القومي للمعلم (14 رقماً) وكلمة المرور');
      return;
    }

    this.teacherIsLoading.set(true);
    this.teacherErrorMessage.set(null);

    this.authService.login({
      identifier: nid,
      password: pass,
      rememberMe: this.teacherRememberMe()
    }).subscribe({
      next: () => {
        this.teacherIsLoading.set(false);
        this.closeModals();
      },
      error: (err) => {
        this.teacherIsLoading.set(false);
        this.teacherErrorMessage.set(
          err?.error?.message || 'تعذر تسجيل الدخول. يرجى التأكد من الرقم القومي وكلمة المرور.'
        );
      }
    });
  }
}

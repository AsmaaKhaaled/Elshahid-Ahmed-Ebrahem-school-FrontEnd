import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { HonorAvatarComponent } from '../honor-roll/honor-avatar.component';
import { HonorRollStore } from '../honor-roll/honor-roll.store';
import { TEACHER_HONORIFIC } from '../teachers/teacher.model';

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
  imports: [RouterLink, FormsModule, HonorAvatarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  readonly authService = inject(AuthService);
  readonly academicYear = inject(AcademicCalendarStore).currentYear;
  readonly academicTerm = inject(AcademicCalendarStore).currentTerm;
  private readonly router = inject(Router);

  // Modal & Drawer Control Signals
  readonly isStudentModalOpen = signal<boolean>(false);
  readonly isTeacherModalOpen = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  // Student Form Model Signals
  readonly studentEmail = signal<string>('omar.ahmed@alshaheed.edu.eg');
  readonly studentCode = signal<string>('STU-1001');
  readonly studentRememberMe = signal<boolean>(true);

  // Teacher Form Model Signals
  readonly teacherNationalId = signal<string>('28904151234567');
  readonly teacherPassword = signal<string>('Academic#2026');
  readonly teacherShowPassword = signal<boolean>(false);
  readonly teacherRememberMe = signal<boolean>(true);

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

  handleDirectDashboard(): void {
    const role = this.authService.userRole();
    if (role) {
      this.authService.navigateToRoleDashboard(role);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  submitStudentLogin(): void {
    this.closeModals();
    this.authService.quickLoginAs('STUDENT', {
      email: this.studentEmail(),
      fullName: 'عمر أحمد محمود',
      gradeLevel: 'الصف الثاني الإعدادي',
      className: 'فصل 2/3'
    });
  }

  submitTeacherLogin(): void {
    this.closeModals();
    this.authService.quickLoginAs('TEACHER', {
      nationalId: this.teacherNationalId(),
      fullName: 'أ. طارق عبد الحميد'
    });
  }
}

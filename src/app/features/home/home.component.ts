import { Component, inject, signal, computed, ElementRef, viewChild, WritableSignal, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../core/academic/academic-calendar.store';
import { HonorAvatarComponent } from '../honor-roll/honor-avatar.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { HonorRollStore } from '../honor-roll/honor-roll.store';
import { TEACHER_HONORIFIC } from '../teachers/teacher.model';
import { SCHOOL_INFO } from '../../core/constants/school.constants';
import { AnnouncementsStore, audienceLabel } from '../announcements/announcements.store';
import { HomeContentStore } from '../home-content/home-content.store';
import { SchoolGalleryComponent } from './school-gallery.component';

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
  imports: [RouterLink, HonorAvatarComponent, PublicHeaderComponent, PublicFooterComponent, SchoolGalleryComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor() {
    this.startTeacherAutoplay();
    this.startStudentAutoplay();
    this.destroyRef.onDestroy(() => {
      this.stopTeacherAutoplay();
      this.stopStudentAutoplay();
    });
  }
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

  readonly isMobileMenuOpen = signal<boolean>(false);

  // كلمة مدير المدرسة & من حياة المدرسة - managed by the admins from /admin/home-content
  private readonly homeContent = inject(HomeContentStore);
  readonly principal = this.homeContent.principal;
  readonly galleryPhotos = this.homeContent.visibleSlides;

  // رؤية ورسالة المدرسة - as written on the school's own vision & mission board
  readonly schoolValues = ['تربية', 'تنمية', 'انتماء'];
  readonly foundedYear = SCHOOL_INFO.foundedYear;

  // تاريخ المدرسة واليوبيل الماسي (75 years since 1948), beside the jubilee banner photo
  readonly jubileeYears = 75;
  readonly jubileePhoto = 'images/diamond-jubilee.jpg';
  readonly schoolHistory = [
    'نقف اليوم فخرًا واعتزازًا أمام صرح تعليمي شامخ، يُضيء سماء العلم والمعرفة منذ عقود؛ مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين. إن الاحتفال باليوبيل الماسي ومرور أكثر من 75 عامًا على التأسيس (1948 - 2027) ليس مجرد احتساب للأيام والسنين، بل هو احتفاء بمسيرة ممتدة من العطاء والتميز، وتخريج أجيال ساهمت في بناء المجتمع ورفعة الوطن.',
    'تحت شعار "تربية، تنمية، انتماء"، نجحت المدرسة عبر تاريخها العريق في ترسيخ القيم الأخلاقية والوطنية في نفوس أبنائها الطلاب، بالتوازي مع تقديم تعليم متميز يبني العقول ويهيئ الشباب للمستقبل.',
    'إن هذا الإنجاز التاريخي هو ثمرة جهود مخلصة وتعاون مستمر بين الإدارات المتعاقبة، والمعلمين الأجلاء الذين لم يبخلوا بجهد، وأولياء الأمور الداعمين، والطلاب الشغوفين بالعلم. نتوجه بتحية إعزاز وتقدير لكل من ترك بصمة في هذا الصرح العريق، متمنين للمدرسة دوام التقدم والازدهار لتظل دائمًا منارة للعلم والتربية والانتماء.'
  ];
  readonly vision = 'إعداد طالب متميز محب لوطنه، متمسك بقيمه، قادر على مواجهة التحديات، في مؤسسة تعليمية آمنة متطورة.';
  readonly mission = [
    'تفعيل الأنشطة الطلابية في كل المجالات.',
    'تفعيل دور وحدة التدريب والجودة وتنمية المعلمين مهنياً.',
    'الاهتمام بتكنولوجيا التعليم والتعلم وتنويع مصادره.',
    'الاهتمام بالطلاب وتنمية قدراتهم ومهاراتهم.',
    'تفعيل دور المشاركة المجتمعية بالمؤسسة.',
    'تنمية السلوكيات المرتبطة بالقيم والأخلاق، وتعزيز قيم الولاء والانتماء والمواطنة.'
  ];

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

  private readonly announcementsStore = inject(AnnouncementsStore);
  readonly homeNotices = computed<SchoolNotice[]>(() => {
    const list = this.announcementsStore.visible();
    if (list && list.length > 0) {
      const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return list.slice(0, 3).map(item => {
        const d = new Date(item.publishedAt);
        const day = isNaN(d.getDate()) ? '01' : String(d.getDate()).padStart(2, '0');
        const month = isNaN(d.getMonth()) ? 'نوفمبر' : arabicMonths[d.getMonth()];
        return {
          day,
          month,
          tag: `${item.category} • موجه إلى: ${audienceLabel(item.audiences)}`,
          title: item.title,
          description: item.content
        };
      });
    }
    return this.notices;
  });

  // Honor roll (لوحة الشرف) - managed by the admins from /admin/honor-roll
  private readonly honorRoll = inject(HonorRollStore);
  readonly honorTeachers = this.honorRoll.teachers;
  readonly honorStudents = this.honorRoll.students;
  readonly teacherHonorific = TEACHER_HONORIFIC;

  // Carousel View Children & State (Activated when items > 3)
  readonly teachersCarousel = viewChild<ElementRef<HTMLElement>>('teachersCarousel');
  readonly studentsCarousel = viewChild<ElementRef<HTMLElement>>('studentsCarousel');
  readonly teacherCarouselIndex = signal<number>(0);
  readonly studentCarouselIndex = signal<number>(0);

  private readonly destroyRef = inject(DestroyRef);

  // Autoplay intervals & hover pause state
  private teacherAutoplayInterval?: ReturnType<typeof setInterval>;
  private studentAutoplayInterval?: ReturnType<typeof setInterval>;
  readonly isTeacherHovered = signal<boolean>(false);
  readonly isStudentHovered = signal<boolean>(false);

  private isElementInViewport(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < windowHeight && rect.bottom > 0;
  }

  startTeacherAutoplay(): void {
    this.stopTeacherAutoplay();
    this.teacherAutoplayInterval = setInterval(() => {
      const el = this.teachersCarousel()?.nativeElement;
      if (!el) return;
      // Only autoplay if carousel is currently visible on the screen and not hovered
      if (!this.isTeacherHovered() && this.honorTeachers().length > 3 && this.isElementInViewport(el)) {
        this.nextTeacher();
      }
    }, 4000);
  }

  stopTeacherAutoplay(): void {
    if (this.teacherAutoplayInterval) {
      clearInterval(this.teacherAutoplayInterval);
      this.teacherAutoplayInterval = undefined;
    }
  }

  onTeacherMouseEnter(): void {
    this.isTeacherHovered.set(true);
  }

  onTeacherMouseLeave(): void {
    this.isTeacherHovered.set(false);
  }

  startStudentAutoplay(): void {
    this.stopStudentAutoplay();
    this.studentAutoplayInterval = setInterval(() => {
      const el = this.studentsCarousel()?.nativeElement;
      if (!el) return;
      // Only autoplay if carousel is currently visible on the screen and not hovered
      if (!this.isStudentHovered() && this.honorStudents().length > 3 && this.isElementInViewport(el)) {
        this.nextStudent();
      }
    }, 4000);
  }

  stopStudentAutoplay(): void {
    if (this.studentAutoplayInterval) {
      clearInterval(this.studentAutoplayInterval);
      this.studentAutoplayInterval = undefined;
    }
  }

  onStudentMouseEnter(): void {
    this.isStudentHovered.set(true);
  }

  onStudentMouseLeave(): void {
    this.isStudentHovered.set(false);
  }

  goToTeacher(index: number): void {
    const el = this.teachersCarousel()?.nativeElement;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-card-index]');
    const targetCard = cards[index];
    if (targetCard) {
      // Scroll the container horizontally ONLY - NEVER scroll the window vertically!
      const containerRect = el.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();
      const deltaX = cardRect.right - containerRect.right;
      el.scrollBy({ left: deltaX, behavior: 'smooth' });
      this.teacherCarouselIndex.set(index);
    }
  }

  nextTeacher(): void {
    const total = this.honorTeachers().length;
    if (total <= 1) return;
    const nextIdx = (this.teacherCarouselIndex() + 1) % total;
    this.goToTeacher(nextIdx);
  }

  prevTeacher(): void {
    const total = this.honorTeachers().length;
    if (total <= 1) return;
    const prevIdx = (this.teacherCarouselIndex() - 1 + total) % total;
    this.goToTeacher(prevIdx);
  }

  onTeachersScroll(): void {
    const el = this.teachersCarousel()?.nativeElement;
    if (!el) return;
    this.updateActiveIndexOnScroll(el, this.teacherCarouselIndex);
  }

  goToStudent(index: number): void {
    const el = this.studentsCarousel()?.nativeElement;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-card-index]');
    const targetCard = cards[index];
    if (targetCard) {
      // Scroll the container horizontally ONLY - NEVER scroll the window vertically!
      const containerRect = el.getBoundingClientRect();
      const cardRect = targetCard.getBoundingClientRect();
      const deltaX = cardRect.right - containerRect.right;
      el.scrollBy({ left: deltaX, behavior: 'smooth' });
      this.studentCarouselIndex.set(index);
    }
  }

  nextStudent(): void {
    const total = this.honorStudents().length;
    if (total <= 1) return;
    const nextIdx = (this.studentCarouselIndex() + 1) % total;
    this.goToStudent(nextIdx);
  }

  prevStudent(): void {
    const total = this.honorStudents().length;
    if (total <= 1) return;
    const prevIdx = (this.studentCarouselIndex() - 1 + total) % total;
    this.goToStudent(prevIdx);
  }

  onStudentsScroll(): void {
    const el = this.studentsCarousel()?.nativeElement;
    if (!el) return;
    this.updateActiveIndexOnScroll(el, this.studentCarouselIndex);
  }

  private updateActiveIndexOnScroll(container: HTMLElement, targetSignal: WritableSignal<number>): void {
    const cards = container.querySelectorAll<HTMLElement>('[data-card-index]');
    if (!cards.length) return;
    const containerRect = container.getBoundingClientRect();
    // In RTL, the "start" alignment is the container's right edge
    const startX = containerRect.right;
    let closestIndex = 0;
    let minDiff = Infinity;
    cards.forEach((card, idx) => {
      const cardRect = card.getBoundingClientRect();
      const diff = Math.abs(cardRect.right - startX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    if (targetSignal() !== closestIndex) {
      targetSignal.set(closestIndex);
    }
  }

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
      tag: 'للطلاب والزوار • منذ 5 أيام',
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
}

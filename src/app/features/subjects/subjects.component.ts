import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';

export interface SubjectItem {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  code: string;
  gradeLevel: 'الصف الأول الإعدادي' | 'الصف الثاني الإعدادي' | 'الصف الثالث الإعدادي';
  gradeId: 'G1' | 'G2' | 'G3';
  weeklyHours: number;
  totalMarks: number;
  type: 'مواد أساسية مضافة للمجموع' | 'لغات ومستوى رفيع' | 'أنشطة وتكنولوجيا';
  description: string;
  topics: string[];
  termUnits: { unitNumber: number; title: string; lessonsCount: number }[];
}

export type GradeFilter = 'الكل' | 'الصف الأول الإعدادي' | 'الصف الثاني الإعدادي' | 'الصف الثالث الإعدادي';
export type SubjectTypeFilter = 'الكل' | 'مواد أساسية مضافة للمجموع' | 'لغات ومستوى رفيع' | 'أنشطة وتكنولوجيا';

@Component({
  selector: 'app-subjects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    PublicHeaderComponent,
    PublicFooterComponent
  ],
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.css'
})
export class SubjectsComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly userRole = this.authService.userRole;
  readonly isTeacher = computed(() => this.userRole() === 'TEACHER');
  readonly isStudent = computed(() => this.userRole() === 'STUDENT');
  readonly isAdmin = this.authService.isAdmin;
  readonly isPublicPage = computed(() => this.router.url === '/subjects' || this.router.url.startsWith('/subjects?'));

  readonly studentProfile = this.authService.studentProfile;
  readonly teacherProfile = this.authService.teacherProfile;

  readonly selectedGrade = signal<GradeFilter>('الكل');
  readonly selectedType = signal<SubjectTypeFilter>('الكل');
  readonly searchQuery = signal<string>('');
  readonly activeSyllabusModal = signal<SubjectItem | null>(null);

  readonly allSubjects = signal<SubjectItem[]>([
    // === الصف الأول الإعدادي ===
    {
      id: 'sub-g1-arb',
      nameArabic: 'اللغة العربية والخط العربي',
      nameEnglish: 'Arabic Language & Literature',
      code: 'ARB-G1',
      gradeLevel: 'الصف الأول الإعدادي',
      gradeId: 'G1',
      weeklyHours: 5,
      totalMarks: 80,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'دراسة النصوص الأدبية، القراءة التفاعلية، النحو الإعرابي (الفعل اللازم والمتعدي وظن وأخواتها)، وقواعد الإملاء والخط العربي.',
      topics: ['النصوص الشعرية والنثرية', 'النحو والصرف', 'قصة عقبة بن نافع', 'الإملاء والتعبير'],
      termUnits: [
        { unitNumber: 1, title: 'قيم وشمائل إنسانية', lessonsCount: 4 },
        { unitNumber: 2, title: 'العلم والعمل وحب الوطن', lessonsCount: 4 },
        { unitNumber: 3, title: 'مكارم الأخلاق وسماحة الدين', lessonsCount: 4 }
      ]
    },
    {
      id: 'sub-g1-eng',
      nameArabic: 'اللغة الإنجليزية (English)',
      nameEnglish: 'English Language (New Hello)',
      code: 'ENG-G1',
      gradeLevel: 'الصف الأول الإعدادي',
      gradeId: 'G1',
      weeklyHours: 5,
      totalMarks: 60,
      type: 'لغات ومستوى رفيع',
      description: 'تنمية المهارات اللغوية الأربع: المحادثة، الاستماع، القراءة والكتابة، مع دراسة القواعد اللغوية والمفردات العصرية.',
      topics: ['Grammar & Structure', 'Reading Comprehension', 'Creative Writing', 'Listening & Dialogue'],
      termUnits: [
        { unitNumber: 1, title: 'My Family and Friends', lessonsCount: 6 },
        { unitNumber: 2, title: 'My Favorite School Subjects', lessonsCount: 6 },
        { unitNumber: 3, title: 'Different People & Cultures', lessonsCount: 6 }
      ]
    },
    {
      id: 'sub-g1-mth',
      nameArabic: 'الرياضيات (الجبر والهندسة)',
      nameEnglish: 'Mathematics (Algebra & Geometry)',
      code: 'MTH-G1',
      gradeLevel: 'الصف الأول الإعدادي',
      gradeId: 'G1',
      weeklyHours: 5,
      totalMarks: 60,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'دراسة الأعداد النسبية والعمليات عليها، الحدود والمقادير الجبرية، مفاهيم الهندسة والتطابق والإنشاءات الهندسية.',
      topics: ['الأعداد النسبية', 'الحدود والمقادير الجبرية', 'الإحصاء والاحتمال', 'التطابق والتوازي'],
      termUnits: [
        { unitNumber: 1, title: 'الأعداد النسبية وتطبيقاتها', lessonsCount: 8 },
        { unitNumber: 2, title: 'الجبر والمقادير والمعادلات', lessonsCount: 7 },
        { unitNumber: 3, title: 'الهندسة والقياس والتطابق', lessonsCount: 9 }
      ]
    },
    {
      id: 'sub-g1-sci',
      nameArabic: 'العلوم والتجارب المعملية',
      nameEnglish: 'Integrated General Science',
      code: 'SCI-G1',
      gradeLevel: 'الصف الأول الإعدادي',
      gradeId: 'G1',
      weeklyHours: 4,
      totalMarks: 40,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'المادة وتركيبها الذري والخواص الفيزيائية والكيميائية، صور الطاقة وتحولاتها، وتنوع الكائنات الحية والتكيف.',
      topics: ['المادة وتركيبها', 'الطاقة وتحولاتها', 'تنوع الكائنات الحية', 'التكيف في البيئة'],
      termUnits: [
        { unitNumber: 1, title: 'المادة وتركيبها وخصائصها', lessonsCount: 5 },
        { unitNumber: 2, title: 'الطاقة ومصادرها وتحولاتها', lessonsCount: 4 },
        { unitNumber: 3, title: 'تنوع الكائنات الحية وتكيفها', lessonsCount: 5 }
      ]
    },
    {
      id: 'sub-g1-soc',
      nameArabic: 'الدراسات الاجتماعية',
      nameEnglish: 'Social Studies (History & Geography)',
      code: 'SOC-G1',
      gradeLevel: 'الصف الأول الإعدادي',
      gradeId: 'G1',
      weeklyHours: 3,
      totalMarks: 40,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'الجغرافيا الفلكية والمجموعة الشمسية ورحلة عبر كوكب الأرض، مع دراسة تاريخ مصر الفرعونية وعصر بناة الأهرام.',
      topics: ['رحلة عبر الفضاء والمجموعة الشمسية', 'كوكب الأرض وتضاريسه', 'مصر الفرعونية', 'حضارة مصر القديمة'],
      termUnits: [
        { unitNumber: 1, title: 'رحلة عبر الفضاء وكواكب المجموعة', lessonsCount: 4 },
        { unitNumber: 2, title: 'شكل الأرض وحركاتها ومناخها', lessonsCount: 4 },
        { unitNumber: 3, title: 'عصور ما قبل الأسرات والدولة القديمة', lessonsCount: 5 }
      ]
    },
    {
      id: 'sub-g1-ict',
      nameArabic: 'تكنولوجيا المعلومات والاتصالات والذكاء الاصطناعي',
      nameEnglish: 'Computer Science, ICT & AI Basics',
      code: 'ICT-G1',
      gradeLevel: 'الصف الأول الإعدادي',
      gradeId: 'G1',
      weeklyHours: 2,
      totalMarks: 40,
      type: 'أنشطة وتكنولوجيا',
      description: 'مبادئ أنظمة التشغيل، أمن المعلومات والشبكات، معالجة الصور الرقمية، ومقدمة تفاعلية في خوارزميات التفكير الحاسوبي.',
      topics: ['أساسيات الحاسب والشبكات', 'الأمن السيبراني', 'معالجة الرسومات والصور', 'التفكير الخوارزمي'],
      termUnits: [
        { unitNumber: 1, title: 'أساسيات نظام الكمبيوتر والشبكات', lessonsCount: 4 },
        { unitNumber: 2, title: 'برمجيات التصميم ومعالجة الصور', lessonsCount: 4 }
      ]
    },

    // === الصف الثاني الإعدادي ===
    {
      id: 'sub-g2-arb',
      nameArabic: 'اللغة العربية وقواعد النحو',
      nameEnglish: 'Arabic Language (Intermediate)',
      code: 'ARB-G2',
      gradeLevel: 'الصف الثاني الإعدادي',
      gradeId: 'G2',
      weeklyHours: 5,
      totalMarks: 80,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'الإعراب والبناء، النعت والمعطوف، التوكيد والحال، مع نصوص أدبية رفيعة وقصة كفاح شعب مصر الوطني.',
      topics: ['المعرب والمبني', 'العطف والتوكيد والحال', 'كفاح شعب مصر', 'النصوص والتعبير'],
      termUnits: [
        { unitNumber: 1, title: 'شخصيات ملهمة وقيم خالدة', lessonsCount: 4 },
        { unitNumber: 2, title: 'الوطن في وجدان المصريين', lessonsCount: 4 },
        { unitNumber: 3, title: 'جيش مصر وتاريخ الاستبسال', lessonsCount: 4 }
      ]
    },
    {
      id: 'sub-g2-mth',
      nameArabic: 'الرياضيات (الجبر والتحليل والهندسة)',
      nameEnglish: 'Mathematics (Algebra & Geometry G2)',
      code: 'MTH-G2',
      gradeLevel: 'الصف الثاني الإعدادي',
      gradeId: 'G2',
      weeklyHours: 5,
      totalMarks: 60,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'الجذور التكعيبية، مجموعة الأعداد الحقيقية، الفترات والعمليات عليها، متوسطات المثلث، والمثلث المتساوي الساقين.',
      topics: ['الأعداد الحقيقية والفترات', 'العمليات على الجذور', 'متوسطات المثلث', 'نظريات المثلث المتساوي الساقين'],
      termUnits: [
        { unitNumber: 1, title: 'الأعداد الحقيقية والعمليات عليها', lessonsCount: 8 },
        { unitNumber: 2, title: 'العلاقة بين متغيرين والإحصاء', lessonsCount: 6 },
        { unitNumber: 3, title: 'الهندسة والتباين ومتوسطات المثلث', lessonsCount: 8 }
      ]
    },
    {
      id: 'sub-g2-sci',
      nameArabic: 'العلوم الفيزيائية والكيميائية',
      nameEnglish: 'General Science G2',
      code: 'SCI-G2',
      gradeLevel: 'الصف الثاني الإعدادي',
      gradeId: 'G2',
      weeklyHours: 4,
      totalMarks: 40,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'الجدول الدوري الحديث وتدرج الخواص، الغلاف الجوي وطبقاته وحمايته لكوكب الأرض، الحفريات وحماية الأنواع من الانقراض.',
      topics: ['الجدول الدوري وتدرج الخواص', 'طبقات الغلاف الجوي', 'تآكل الأوزون والاحتباس الحراري', 'الحفريات والانقراض'],
      termUnits: [
        { unitNumber: 1, title: 'دورية العناصر وخواصها', lessonsCount: 5 },
        { unitNumber: 2, title: 'الغلاف الجوي وحماية كوكب الأرض', lessonsCount: 4 },
        { unitNumber: 3, title: 'الحفريات وحماية الأنواع من الانقراض', lessonsCount: 4 }
      ]
    },

    // === الصف الثالث الإعدادي (الشهادة الإعدادية) ===
    {
      id: 'sub-g3-arb',
      nameArabic: 'اللغة العربية والشهادة الإعدادية',
      nameEnglish: 'Arabic Language (Certificate G3)',
      code: 'ARB-G3',
      gradeLevel: 'الصف الثالث الإعدادي',
      gradeId: 'G3',
      weeklyHours: 5,
      totalMarks: 80,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'المنادى، البدل، أسلوبا المدح والذم، الممنوع من الصرف، مع تحليل نصوص عباد الرحمن، رحمة ومحبة، وقصة طموح جارية.',
      topics: ['المنادى والبدل', 'المدح والذم والممنوع من الصرف', 'طموح جارية (شجر الدر)', 'بلاغة ونصوص الشهادة'],
      termUnits: [
        { unitNumber: 1, title: 'إنسانيات وبلاغة القرآن والسنة', lessonsCount: 4 },
        { unitNumber: 2, title: 'قضايا وطنية وعلمية معاصرة', lessonsCount: 4 },
        { unitNumber: 3, title: 'الفنون والأدب والقدوة الحسنة', lessonsCount: 4 }
      ]
    },
    {
      id: 'sub-g3-mth',
      nameArabic: 'الرياضيات المتقدمة (جبر وحساب مثلثات وهندسة تحليلية)',
      nameEnglish: 'Advanced Mathematics (Trigonometry & Analytics)',
      code: 'MTH-G3',
      gradeLevel: 'الصف الثالث الإعدادي',
      gradeId: 'G3',
      weeklyHours: 5,
      totalMarks: 60,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'حاصل الضرب الديكارتي، الدوال والنسبة والتناسب، حساب المثلثات والنسب المثلثية الأساسية، والهندسة التحليلية ومعادلة الخط المستقيم.',
      topics: ['حاصل الضرب الديكارتي والدوال', 'النسبة والتناسب والتغير', 'النسب المثلثية الأساسية', 'الهندسة التحليلية والخط المستقيم'],
      termUnits: [
        { unitNumber: 1, title: 'العلاقات والدوال والتناسب', lessonsCount: 7 },
        { unitNumber: 2, title: 'حساب المثلثات والهندسة التحليلية', lessonsCount: 8 },
        { unitNumber: 3, title: 'الإحصاء والانحراف المعياري', lessonsCount: 4 }
      ]
    },
    {
      id: 'sub-g3-sci',
      nameArabic: 'العلوم المتكاملة (الشهادة الإعدادية)',
      nameEnglish: 'Integrated Physical Sciences G3',
      code: 'SCI-G3',
      gradeLevel: 'الصف الثالث الإعدادي',
      gradeId: 'G3',
      weeklyHours: 4,
      totalMarks: 40,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'الحركة والسرعة والعجلة، الكميات القياسية والمتجهة، الضوء والمرايا والعدسات، الكون والنظام الشمسي، والتكاثر واستمرار النوع.',
      topics: ['الحركة في اتجاه واحد والسرعة والعجلة', 'المرايا والعدسات الكرية', 'الكون والمجرة والنظام الشمسي', 'الانقسام الخلوي والتكاثر'],
      termUnits: [
        { unitNumber: 1, title: 'القوى والحركة والسرعة', lessonsCount: 5 },
        { unitNumber: 2, title: 'الطاقة الضوئية والمرايا والعدسات', lessonsCount: 4 },
        { unitNumber: 3, title: 'الكون والنظام الشمسي', lessonsCount: 3 },
        { unitNumber: 4, title: 'التكاثر واستمرار النوع والانقسام', lessonsCount: 4 }
      ]
    },
    {
      id: 'sub-g3-eng',
      nameArabic: 'اللغة الإنجليزية للشهادة الإعدادية',
      nameEnglish: 'English Prep 3 (New Hello Certificate)',
      code: 'ENG-G3',
      gradeLevel: 'الصف الثالث الإعدادي',
      gradeId: 'G3',
      weeklyHours: 5,
      totalMarks: 60,
      type: 'لغات ومستوى رفيع',
      description: 'تأهيل متقدم لاختبارات الشهادة الإعدادية، دراسة القواعد المتقدمة، كتابة المقالات، والمحادثة في السياقات الحياتية والمستقبلية.',
      topics: ['Advanced Grammar', 'Vocabulary & Collocations', 'Paragraph & Essay Writing', 'Dialogue Completion'],
      termUnits: [
        { unitNumber: 1, title: 'Around Town', lessonsCount: 6 },
        { unitNumber: 2, title: 'Let’s Go Shopping', lessonsCount: 6 },
        { unitNumber: 3, title: 'My Community', lessonsCount: 6 }
      ]
    },
    {
      id: 'sub-g3-soc',
      nameArabic: 'الدراسات الاجتماعية للشهادة الإعدادية',
      nameEnglish: 'Social Studies & Geography G3',
      code: 'SOC-G3',
      gradeLevel: 'الصف الثالث الإعدادي',
      gradeId: 'G3',
      weeklyHours: 3,
      totalMarks: 40,
      type: 'مواد أساسية مضافة للمجموع',
      description: 'جغرافيا العالم الطبيعية (قارات العالم وتضاريسها ومناخها وسلالاتها)، وتاريخ مصر الحديث وبناء الدولة العصرية وثورة 1919.',
      topics: ['قارات العالم والتضاريس', 'المناخ والنبات الطبيعي في العالم', 'سلالات البشر في العالم', 'تاريخ مصر وبناء الدولة الحديثة'],
      termUnits: [
        { unitNumber: 1, title: 'الجغرافيا الطبيعية للعالم', lessonsCount: 5 },
        { unitNumber: 2, title: 'السكان في قارات العالم وتوزيعهم', lessonsCount: 4 },
        { unitNumber: 3, title: 'مصر تحت الحكم العثماني وبناء الدولة الحديثة', lessonsCount: 6 }
      ]
    }
  ]);

  readonly filteredSubjects = computed(() => {
    const grade = this.selectedGrade();
    const type = this.selectedType();
    const query = this.searchQuery().trim().toLowerCase();

    return this.allSubjects().filter(sub => {
      const matchGrade = grade === 'الكل' || sub.gradeLevel === grade;
      const matchType = type === 'الكل' || sub.type === type;
      const matchQuery = !query ||
        sub.nameArabic.toLowerCase().includes(query) ||
        sub.nameEnglish.toLowerCase().includes(query) ||
        sub.code.toLowerCase().includes(query) ||
        sub.description.toLowerCase().includes(query);

      return matchGrade && matchType && matchQuery;
    });
  });

  ngOnInit(): void {
    // If student is logged in, default the view to their enrolled grade!
    if (this.isStudent()) {
      const grade = this.studentProfile()?.gradeLevel;
      if (grade && (grade.includes('الأول') || grade.includes('G1'))) {
        this.selectedGrade.set('الصف الأول الإعدادي');
      } else if (grade && (grade.includes('الثاني') || grade.includes('G2'))) {
        this.selectedGrade.set('الصف الثاني الإعدادي');
      } else if (grade && (grade.includes('الثالث') || grade.includes('G3'))) {
        this.selectedGrade.set('الصف الثالث الإعدادي');
      }
    }
  }

  isTeacherAssignedSubject(subject: SubjectItem): boolean {
    if (!this.isTeacher()) return false;
    const spec = this.teacherProfile()?.specialization?.trim() || '';
    if (!spec) return false;
    return subject.nameArabic.includes(spec) || spec.includes(subject.nameArabic.split(' ')[0]);
  }

  openSyllabusModal(subject: SubjectItem): void {
    this.activeSyllabusModal.set(subject);
  }

  closeSyllabusModal(): void {
    this.activeSyllabusModal.set(null);
  }
}

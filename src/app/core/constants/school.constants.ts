export const SCHOOL_INFO = {
  name: 'مدرسة الشهيد أحمد إبراهيم حسب الله',
  type: 'الإعدادية بنين',
  fullName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
  category: 'مدرسة حكومية',
  principal: 'أ. عبدالله أحمد علي',
  foundedYear: 1948,
  logoUrl: 'images/school-logo.webp'
} as const;

export interface GradeLevel {
  id: string;
  label: string;
  shortLabel: string;
  sections: string[];
}

// الصفوف الدراسية للمرحلة الإعدادية وفصول كل صف
export const GRADE_LEVELS: GradeLevel[] = [
  { id: 'G1', label: 'الصف الأول الإعدادي', shortLabel: 'الأول الإعدادي', sections: ['1/1', '1/2', '1/3', '1/4'] },
  { id: 'G2', label: 'الصف الثاني الإعدادي', shortLabel: 'الثاني الإعدادي', sections: ['2/1', '2/2', '2/3', '2/4'] },
  { id: 'G3', label: 'الصف الثالث الإعدادي', shortLabel: 'الثالث الإعدادي', sections: ['3/1', '3/2', '3/3', '3/4'] }
];

// أقصى كثافة مسموحة للفصل الواحد
export const MAX_CLASS_CAPACITY = 45;

// السنوات والفصول الدراسية يديرها الأدمن من صفحة "العام والفصل الدراسي" - راجع AcademicCalendarStore

// أيام الدراسة وعدد الحصص اليومية للجدول الأسبوعي
export const SCHOOL_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const DAILY_PERIODS = 7;

export const TEACHING_DEPARTMENTS = [
  { value: 'اللغة العربية', label: 'قسم اللغة العربية' },
  { value: 'اللغة الإنجليزية', label: 'قسم اللغة الإنجليزية' },
  { value: 'الرياضيات', label: 'قسم الرياضيات' },
  { value: 'العلوم', label: 'قسم العلوم' },
  { value: 'الدراسات الاجتماعية', label: 'قسم الدراسات الاجتماعية' },
  { value: 'التربية الدينية', label: 'قسم التربية الدينية' },
  { value: 'الحاسب الآلي', label: 'قسم الحاسب الآلي' },
  { value: 'الأنشطة', label: 'قسم الأنشطة (فنية / رياضية)' }
];

export const SCHOOL_SUBJECTS = [
  'اللغة العربية',
  'اللغة الإنجليزية',
  'الرياضيات',
  'العلوم',
  'الدراسات الاجتماعية',
  'التربية الدينية الإسلامية',
  'التربية الدينية المسيحية',
  'الحاسب الآلي',
  'التربية الفنية',
  'التربية الرياضية'
];

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

// الصفوف الدراسية للمرحلة الإعدادية بفصولها الافتراضية (4 لكل صف).
// عدد الفصول الفعلي لكل صف يتغير كل عام - اقرأه من SchoolStructureStore وليس من هنا.
export const GRADE_LEVELS: GradeLevel[] = [
  { id: 'G1', label: 'الصف الأول الإعدادي', shortLabel: 'الأول الإعدادي', sections: ['1/1', '1/2', '1/3', '1/4'] },
  { id: 'G2', label: 'الصف الثاني الإعدادي', shortLabel: 'الثاني الإعدادي', sections: ['2/1', '2/2', '2/3', '2/4'] },
  { id: 'G3', label: 'الصف الثالث الإعدادي', shortLabel: 'الثالث الإعدادي', sections: ['3/1', '3/2', '3/3', '3/4'] }
];

// أقصى كثافة ممكنة للفصل الواحد (الكثافة الفعلية لكل صف يحددها الأدمن، بحد أقصى 50)
export const MAX_CLASS_CAPACITY = 50;
// كثافة الفصل الافتراضية إلى أن يحددها الأدمن
export const DEFAULT_CLASS_CAPACITY = 40;
// أقصى عدد فصول للصف الواحد
export const MAX_SECTIONS_PER_GRADE = 10;

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

const RELIGION_PERIODS = {
  'التربية الدينية': 3,
  'التربية الدينية الإسلامية': 3,
  'التربية الدينية المسيحية': 3
};

/**
 * Most periods a class may have per week in each subject, by grade (same as the backend's WEEKLY_PERIOD_LIMITS).
 * Muslim and Christian students study religion at the same time, so each religion has its own limit.
 */
export const WEEKLY_PERIOD_LIMITS: Record<string, Record<string, number>> = {
  '1': { 'اللغة العربية': 8, 'الرياضيات': 6, 'اللغة الإنجليزية': 5, 'الدراسات الاجتماعية': 4, 'العلوم': 4, ...RELIGION_PERIODS, 'الحاسب الآلي': 1, 'التربية الفنية': 1, 'التربية الرياضية': 1 },
  '2': { 'اللغة العربية': 8, 'الرياضيات': 6, 'اللغة الإنجليزية': 6, 'الدراسات الاجتماعية': 4, 'العلوم': 4, ...RELIGION_PERIODS, 'الحاسب الآلي': 1, 'التربية الفنية': 1, 'التربية الرياضية': 1 },
  '3': { 'اللغة العربية': 8, 'الرياضيات': 6, 'اللغة الإنجليزية': 6, 'الدراسات الاجتماعية': 4, 'العلوم': 4, ...RELIGION_PERIODS, 'الحاسب الآلي': 1, 'التربية الفنية': 1, 'التربية الرياضية': 0 }
};

/** The weekly limit of a subject in a class named like "2/3"; undefined when the school set none. */
export function weeklyPeriodLimit(section: string, subject: string): number | undefined {
  return WEEKLY_PERIOD_LIMITS[section.split('/')[0]]?.[subject];
}

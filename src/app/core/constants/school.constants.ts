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

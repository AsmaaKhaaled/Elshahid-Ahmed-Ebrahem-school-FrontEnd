export type HonorKind = 'TEACHER' | 'STUDENT';

export const HONOR_KINDS: { id: HonorKind; label: string }[] = [
  { id: 'TEACHER', label: 'المعلمون المتميزون' },
  { id: 'STUDENT', label: 'الطلاب المتفوقون' }
];

/** One person on the honor roll, shown on the home page. */
export interface HonorEntry {
  id: string;
  kind: HonorKind;
  // Teachers are stored without the honorific (see TEACHER_HONORIFIC)
  name: string;
  // Resized data URL or remote URL; empty = initial-letter avatar
  photoUrl: string;
  // Teachers only
  subject: string;
  // Students only, e.g. "2/3"
  section: string;
  // Short reason, e.g. "الأول على الصف الثالث الإعدادي"
  achievement: string;
}

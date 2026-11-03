import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { compareArabic } from '../../shared/utils/arabic-sort';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { StudentsStore } from './students.store';

export interface RosterStudent {
  id: string;
  name: string;
  code: string;
}

// The demo data has one or two students per class; a class sheet needs a real-looking list.
// Until the backend serves the students of each class, every class is topped up to this size.
const DEMO_CLASS_SIZE = 10;
const DEMO_NAMES = [
  'يوسف محمود عبد الحميد', 'عبد الرحمن سامح فؤاد', 'آدم وليد إبراهيم', 'زياد هشام السيد', 'مروان أشرف عادل',
  'حمزة إيهاب صلاح', 'سيف الدين رامي حسن', 'مالك عمرو شوقي', 'أنس تامر فتحي', 'بلال جمال عبد العزيز',
  'إسماعيل أحمد رشاد', 'محمد رجب حسبو'
];

/** The students of a class, A→Z: who a teacher takes attendance for and grades. */
@Injectable({ providedIn: 'root' })
export class ClassRoster {
  private readonly studentsStore = inject(StudentsStore);
  private readonly auth = inject(AuthService);
  private readonly scope = inject(TeachingScope);

  studentsOf(section: string): RosterStudent[] {
    const enrolled = this.studentsStore
      .students()
      .filter(s => s.className === section)
      .map(s => ({ id: s.id, name: s.name, code: s.code }));
    const demo = DEMO_NAMES.slice(0, Math.max(0, DEMO_CLASS_SIZE - enrolled.length)).map((name, i) => ({
      id: `demo-${section}-${i + 1}`,
      name,
      code: `STD-${section.replace('/', '')}-${String(i + 1).padStart(2, '0')}`
    }));
    return [...enrolled, ...demo].sort((a, b) => compareArabic(a.name, b.name));
  }

  /**
   * The signed-in student's row in their class. Demo accounts aren't enrolled in the
   * students list, so they see the first student of their class instead.
   */
  me(): RosterStudent | null {
    const user = this.auth.currentUser();
    const roster = this.studentsOf(this.scope.studentSection());
    const enrolled = this.studentsStore
      .students()
      .find(s => s.id === user?.id || (!!user?.nationalId && s.nationalId === user.nationalId));
    return roster.find(s => s.id === enrolled?.id) ?? roster[0] ?? null;
  }
}

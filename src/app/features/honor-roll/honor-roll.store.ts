import { Injectable, computed, signal } from '@angular/core';
import { HonorEntry } from './honor-roll.model';

/**
 * Honor roll (لوحة الشرف): distinguished teachers & students.
 * Managed from the admin panel, displayed on the public home page.
 */
@Injectable({ providedIn: 'root' })
export class HonorRollStore {
  readonly entries = signal<HonorEntry[]>([
    {
      id: 'hon-t1',
      kind: 'TEACHER',
      name: 'طارق عبد الحميد',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
      subject: 'العلوم',
      section: '',
      achievement: 'المعلم المثالي على مستوى الإدارة التعليمية'
    },
    {
      id: 'hon-t2',
      kind: 'TEACHER',
      name: 'محمود رضوان',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop',
      subject: 'الرياضيات',
      section: '',
      achievement: 'أعلى نسبة نجاح في الشهادة الإعدادية'
    },
    {
      id: 'hon-t3',
      kind: 'TEACHER',
      name: 'عبد الرحمن مصطفى',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop',
      subject: 'اللغة العربية',
      section: '',
      achievement: 'مشرف فريق المدرسة الفائز في مسابقة القراءة'
    },
    {
      id: 'hon-s1',
      kind: 'STUDENT',
      name: 'يوسف أحمد عبد الله',
      photoUrl: '',
      subject: '',
      section: '3/1',
      achievement: 'الأول على الصف الثالث الإعدادي'
    },
    {
      id: 'hon-s2',
      kind: 'STUDENT',
      name: 'عمر أحمد محمود',
      photoUrl: '',
      subject: '',
      section: '2/3',
      achievement: 'المركز الأول في مسابقة الابتكارات العلمية'
    },
    {
      id: 'hon-s3',
      kind: 'STUDENT',
      name: 'زياد محمد فتحي',
      photoUrl: '',
      subject: '',
      section: '1/2',
      achievement: 'الأول على الصف الأول الإعدادي'
    }
  ]);

  readonly teachers = computed(() => this.entries().filter(e => e.kind === 'TEACHER'));
  readonly students = computed(() => this.entries().filter(e => e.kind === 'STUDENT'));

  saveEntry(entry: HonorEntry): void {
    this.entries.update(list =>
      list.some(e => e.id === entry.id)
        ? list.map(e => (e.id === entry.id ? entry : e))
        : [...list, entry]
    );
  }

  deleteEntry(entryId: string): void {
    this.entries.update(list => list.filter(e => e.id !== entryId));
  }
}

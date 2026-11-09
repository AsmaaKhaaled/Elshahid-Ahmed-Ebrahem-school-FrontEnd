import { Injectable, computed, inject, signal } from '@angular/core';
import { HonorRollApiService, HonorEntryDto } from '../../core/services/honor-roll.service';
import { HonorEntry } from './honor-roll.model';

const INITIAL_FALLBACK_ENTRIES: HonorEntry[] = [
  {
    id: 'hon-t1',
    kind: 'TEACHER',
    name: 'طارق عبد الحميد',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
    subjects: ['العلوم'],
    subject: 'العلوم',
    section: '',
    achievement: 'المعلم المثالي على مستوى الإدارة التعليمية'
  },
  {
    id: 'hon-t2',
    kind: 'TEACHER',
    name: 'محمود رضوان',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop',
    subjects: ['الرياضيات'],
    subject: 'الرياضيات',
    section: '',
    achievement: 'أعلى نسبة نجاح في الشهادة الإعدادية'
  },
  {
    id: 'hon-t3',
    kind: 'TEACHER',
    name: 'عبد الرحمن مصطفى',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop',
    subjects: ['اللغة العربية'],
    subject: 'اللغة العربية',
    section: '',
    achievement: 'مشرف فريق المدرسة الفائز في مسابقة القراءة'
  },
  {
    id: 'hon-t4',
    kind: 'TEACHER',
    name: 'إيمان جمال زكي',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop',
    subjects: ['التربية الفنية'],
    subject: 'التربية الفنية',
    section: '',
    achievement: 'رائدة المعرض الفني السنوي وحاصلة على درع التميز'
  },
  {
    id: 'hon-s1',
    kind: 'STUDENT',
    name: 'يوسف أحمد عبد الله',
    photoUrl: '',
    subjects: [],
    subject: '',
    section: '3/1',
    achievement: 'الأول على الصف الثالث الإعدادي'
  },
  {
    id: 'hon-s2',
    kind: 'STUDENT',
    name: 'عمر أحمد محمود',
    photoUrl: '',
    subjects: [],
    subject: '',
    section: '2/3',
    achievement: 'المركز الأول في مسابقة الابتكارات العلمية'
  },
  {
    id: 'hon-s3',
    kind: 'STUDENT',
    name: 'زياد محمد فتحي',
    photoUrl: '',
    subjects: [],
    subject: '',
    section: '1/2',
    achievement: 'الأول على الصف الأول الإعدادي'
  },
  {
    id: 'hon-s4',
    kind: 'STUDENT',
    name: 'محمد علي منصف',
    photoUrl: '',
    subjects: [],
    subject: '',
    section: '1/1',
    achievement: 'المركز الأول في مسابقة حفظ القرآن الكريم'
  }
];

/**
 * Honor roll (لوحة الشرف): distinguished teachers & students.
 * Managed from the admin panel, displayed on the public home page.
 */
@Injectable({ providedIn: 'root' })
export class HonorRollStore {
  private readonly api = inject(HonorRollApiService);

  readonly entries = signal<HonorEntry[]>(INITIAL_FALLBACK_ENTRIES);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly teachers = computed(() => this.entries().filter(e => e.kind === 'TEACHER'));
  readonly students = computed(() => this.entries().filter(e => e.kind === 'STUDENT'));

  constructor() {
    this.loadEntries();
  }

  loadEntries(params?: { academicYear?: string; term?: string }): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.api.getHonorRoll(params).subscribe({
      next: res => {
        this.isLoading.set(false);
        if (res.data) {
          const teachers = (res.data.teachers || []).map(t => this.mapDtoToEntry(t));
          const students = (res.data.students || []).map(s => this.mapDtoToEntry(s));
          const combined = [...teachers, ...students];
          if (combined.length > 0) {
            this.entries.set(combined);
          }
        }
      },
      error: err => {
        this.isLoading.set(false);
        // Retain fallback data on network/connection failure
        console.warn('[HonorRollStore] Failed to fetch honor roll list from API, using fallback data.', err?.message);
      }
    });
  }

  saveEntry(entry: HonorEntry): void {
    const isUpdate = !!entry.id && !entry.id.startsWith('hon-') && this.entries().some(e => e.id === entry.id);

    const subjects = entry.subjects && entry.subjects.length > 0
      ? entry.subjects
      : (entry.subject ? [entry.subject] : []);

    const payload: Partial<HonorEntryDto> = {
      kind: entry.kind,
      name: entry.name.trim(),
      photoUrl: entry.photoUrl || null,
      teacherId: entry.teacherId || null,
      studentId: entry.studentId || null,
      subjects: entry.kind === 'TEACHER' ? subjects : [],
      section: entry.kind === 'STUDENT' ? (entry.section || null) : null,
      achievement: entry.achievement?.trim() || null,
      academicYear: entry.academicYear || '2026/2027',
      term: entry.term || 'الفصل الدراسي الأول'
    };

    if (isUpdate) {
      // Optimistic local update
      this.entries.update(list => list.map(e => (e.id === entry.id ? entry : e)));

      this.api.update(entry.id, payload).subscribe({
        next: res => {
          if (res.data) {
            const mapped = this.mapDtoToEntry(res.data);
            this.entries.update(list => list.map(e => (e.id === mapped.id ? mapped : e)));
          }
        },
        error: err => {
          console.error('[HonorRollStore] Failed to update entry', err);
        }
      });
    } else {
      // Generate temporary ID for optimistic UI feedback
      const tempId = entry.id || crypto.randomUUID();
      const optimisticEntry: HonorEntry = { ...entry, id: tempId, subjects, subject: subjects.join('، ') || entry.subject };
      this.entries.update(list => [...list, optimisticEntry]);

      this.api.create(payload).subscribe({
        next: res => {
          if (res.data) {
            const mapped = this.mapDtoToEntry(res.data);
            this.entries.update(list => list.map(e => (e.id === tempId ? mapped : e)));
          }
        },
        error: err => {
          console.error('[HonorRollStore] Failed to create entry', err);
        }
      });
    }
  }

  deleteEntry(entryId: string): void {
    const previous = this.entries();
    this.entries.update(list => list.filter(e => e.id !== entryId));

    if (!entryId.startsWith('hon-')) {
      this.api.delete(entryId).subscribe({
        error: err => {
          console.error('[HonorRollStore] Failed to delete entry on server', err);
          this.entries.set(previous);
        }
      });
    }
  }

  private mapDtoToEntry(dto: HonorEntryDto): HonorEntry {
    const subjects = Array.isArray(dto.subjects) && dto.subjects.length > 0
      ? dto.subjects
      : ((dto as any).subject ? [(dto as any).subject] : []);
    const subject = subjects.join('، ') || (dto as any).subject || '';

    return {
      id: dto.id,
      kind: dto.kind,
      name: dto.name,
      photoUrl: dto.photoUrl || '',
      subjects,
      subject,
      section: dto.section || '',
      achievement: dto.achievement || '',
      teacherId: dto.teacherId,
      studentId: dto.studentId,
      academicYear: dto.academicYear,
      term: dto.term,
      order: dto.order,
      isActive: dto.isActive !== false
    };
  }
}

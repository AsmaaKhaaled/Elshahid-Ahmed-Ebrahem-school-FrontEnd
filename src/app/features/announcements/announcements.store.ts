import { Injectable, computed, inject, signal } from '@angular/core';
import { today } from '../../core/academic/academic-calendar.store';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/user.model';

export const ANNOUNCEMENT_CATEGORIES = ['عاجل وهام', 'إداري', 'أولياء الأمور', 'أنشطة وفعاليات'] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export type Audience = 'TEACHER' | 'STUDENT' | 'PARENT';
export const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'TEACHER', label: 'المعلمون' },
  { id: 'STUDENT', label: 'الطلاب' },
  { id: 'PARENT', label: 'أولياء الأمور' }
];

export interface Attachment {
  name: string;
  // Object URL of the picked file (valid for this session only, until the backend stores files)
  url: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  audiences: Audience[];
  author: string;
  publishedAt: string;
  // Last day it's shown (YYYY-MM-DD); empty = no expiry
  expiresAt?: string;
  pinned: boolean;
  attachment?: Attachment;
}

export function audienceLabel(audiences: Audience[]): string {
  if (audiences.length === AUDIENCES.length) return 'الجميع';
  return AUDIENCES.filter(a => audiences.includes(a.id)).map(a => a.label).join(' و');
}

export function isExpired(announcement: Announcement): boolean {
  return !!announcement.expiresAt && announcement.expiresAt < today();
}

const DAY = 86400000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** Announcements published by the school administration, shown to each role it targets. */
@Injectable({ providedIn: 'root' })
export class AnnouncementsStore {
  private readonly authService = inject(AuthService);

  readonly announcements = signal<Announcement[]>([
    {
      id: 'anc-1',
      title: 'اعتماد جدول امتحانات نصف الترم الأول 2026/2027',
      content: 'تعلن إدارة المدرسة عن اعتماد ونشر جدول امتحانات نصف الترم الأول لطلاب الصف الثالث الإعدادي. يُرجى من جميع أبنائنا الطلاب الالتزام بالحضور بالزي المدرسي الموحد والتواجد باللجان قبل موعد الامتحان بنصف ساعة.',
      category: 'عاجل وهام',
      audiences: ['TEACHER', 'STUDENT', 'PARENT'],
      author: 'إدارة شؤون الامتحانات والكنترول',
      publishedAt: ago(2 * 3600000),
      expiresAt: '2026-11-18',
      pinned: true
    },
    {
      id: 'anc-2',
      title: 'انطلاق معرض العلوم والابتكارات السنوي',
      content: 'يسر قسم العلوم بالمدرسة دعوة الطلاب المتميزين لتقديم نماذجهم ومشاريعهم العلمية لمعرض الابتكارات السنوي بمسرح المدرسة تحت رعاية وزارة التربية والتعليم.',
      category: 'أنشطة وفعاليات',
      audiences: ['TEACHER', 'STUDENT'],
      author: 'أسرة النشاط العلمي',
      publishedAt: ago(1 * DAY),
      pinned: false
    },
    {
      id: 'anc-3',
      title: 'الجمعية العمومية لمجلس الآباء والمعلمين',
      content: 'تتشرف إدارة المدرسة بدعوة السادة أولياء الأمور الكرام لحضور الجمعية العمومية لمجلس الآباء والمعلمين لمناقشة الخطة الأكاديمية للعام الدراسي.',
      category: 'أولياء الأمور',
      audiences: ['TEACHER', 'PARENT'],
      author: 'مكتب الأخصائي الاجتماعي',
      publishedAt: ago(3 * DAY),
      pinned: false
    },
    {
      id: 'anc-4',
      title: 'تسليم كشوف رصد درجات تقييم أكتوبر',
      content: 'على السادة المعلمين تسليم كشوف رصد درجات تقييم شهر أكتوبر إلى الكنترول في موعد أقصاه نهاية الأسبوع.',
      category: 'إداري',
      audiences: ['TEACHER'],
      author: 'إدارة المدرسة',
      publishedAt: ago(5 * DAY),
      pinned: false
    }
  ]);

  readonly isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  // Admins see everything; others only see active announcements addressed to their role
  readonly visible = computed(() => {
    const role = this.authService.userRole();
    const list = this.isAdmin()
      ? this.announcements(): this.announcements().filter(a => {
          if (isExpired(a)) return false;
          if (!role) return true;
          return a.audiences.includes(role as Audience) || a.audiences.length === AUDIENCES.length;
        });
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
  });

  // Latest active announcements for the navbar bell
  readonly latest = computed(() =>
    this.visible()
      .filter(a => !isExpired(a))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 3)
  );

  save(announcement: Announcement): void {
    this.announcements.update(list =>
      list.some(a => a.id === announcement.id)
        ? list.map(a => (a.id === announcement.id ? announcement : a))
        : [announcement, ...list]
    );
  }

  togglePinned(id: string): void {
    this.announcements.update(list => list.map(a => (a.id === id ? { ...a, pinned: !a.pinned } : a)));
  }

  delete(id: string): void {
    const removed = this.announcements().find(a => a.id === id);
    if (removed?.attachment) URL.revokeObjectURL(removed.attachment.url);
    this.announcements.update(list => list.filter(a => a.id !== id));
  }
}

export function announcementsPath(role: UserRole | null): string {
  switch (role) {
    case 'TEACHER':
      return '/teacher/announcements';
    case 'STUDENT':
    case 'PARENT':
      return '/student/announcements';
    default:
      return '/admin/announcements';
  }
}

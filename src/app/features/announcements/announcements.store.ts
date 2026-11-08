import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { today } from '../../core/academic/academic-calendar.store';
import { AuthService } from '../../core/auth/auth.service';
import { AnnouncementsService, CreateAnnouncementPayload } from '../../core/services/announcements.service';
import { SocketService } from '../../core/services/socket.service';
import { UserRole } from '../../core/models/user.model';

export const ANNOUNCEMENT_CATEGORIES = ['عاجل وهام', 'إداري', 'الزوار', 'أنشطة وفعاليات'] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export type Audience = 'TEACHER' | 'STUDENT' | 'PARENT';
export const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'TEACHER', label: 'المعلمون' },
  { id: 'STUDENT', label: 'الطلاب' },
  { id: 'PARENT', label: 'الزوار' }
];

export interface Attachment {
  name: string;
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
  expiresAt?: string;
  pinned: boolean;
  attachment?: Attachment;
  isRead?: boolean;
}

export function audienceLabel(audiences: Audience[]): string {
  if (!audiences || audiences.length === AUDIENCES.length) return 'الجميع';
  return AUDIENCES.filter(a => audiences.includes(a.id)).map(a => a.label).join(' و');
}

export function isExpired(announcement: Announcement): boolean {
  return !!announcement.expiresAt && announcement.expiresAt < today();
}

function playChimeSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio playback blocked by browser user gesture policy
  }
}

const DAY = 86400000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const INITIAL_FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'anc-1',
    title: 'اعتماد جدول امتحانات نصف الترم الأول 2026/2027',
    content: 'تعلن إدارة المدرسة عن اعتماد ونشر جدول امتحانات نصف الترم الأول لطلاب الصف الثالث الإعدادي. يُرجى من جميع أبنائنا الطلاب الالتزام بالحضور بالزي المدرسي الموحد والتواجد باللجان قبل موعد الامتحان بنصف ساعة.',
    category: 'عاجل وهام',
    audiences: ['TEACHER', 'STUDENT', 'PARENT'],
    author: 'إدارة شؤون الامتحانات والكنترول',
    publishedAt: ago(2 * 3600000),
    expiresAt: '2026-11-18',
    pinned: true,
    isRead: false
  },
  {
    id: 'anc-2',
    title: 'انطلاق معرض العلوم والابتكارات السنوي',
    content: 'يسر قسم العلوم بالمدرسة دعوة الطلاب المتميزين لتقديم نماذجهم ومشاريعهم العلمية لمعرض الابتكارات السنوي بمسرح المدرسة تحت رعاية وزارة التربية والتعليم.',
    category: 'أنشطة وفعاليات',
    audiences: ['TEACHER', 'STUDENT'],
    author: 'أسرة النشاط العلمي',
    publishedAt: ago(1 * DAY),
    pinned: false,
    isRead: false
  },
  {
    id: 'anc-3',
    title: 'الجمعية العمومية ومواعيد استقبال الزوار',
    content: 'تتشرف إدارة المدرسة بدعوة السادة الزوار الكرام للاطلاع على الأنشطة المدرسية والفعاليات المفتوحة لمناقشة الخطة الأكاديمية للعام الدراسي.',
    category: 'الزوار',
    audiences: ['TEACHER', 'PARENT'],
    author: 'مكتب الأخصائي الاجتماعي',
    publishedAt: ago(3 * DAY),
    pinned: false,
    isRead: true
  },
  {
    id: 'anc-4',
    title: 'تسليم كشوف رصد درجات تقييم أكتوبر',
    content: 'على السادة المعلمين تسليم كشوف رصد درجات تقييم شهر أكتوبر إلى الكنترول في موعد أقصاه نهاية الأسبوع.',
    category: 'إداري',
    audiences: ['TEACHER'],
    author: 'إدارة المدرسة',
    publishedAt: ago(5 * DAY),
    pinned: false,
    isRead: true
  }
];

@Injectable({ providedIn: 'root' })
export class AnnouncementsStore {
  private readonly authService = inject(AuthService);
  private readonly announcementsService = inject(AnnouncementsService);
  private readonly socketService = inject(SocketService);

  readonly announcements = signal<Announcement[]>(INITIAL_FALLBACK_ANNOUNCEMENTS);
  readonly unreadCount = signal<number>(0);
  readonly latestToast = signal<{ title: string; content: string; category: string } | null>(null);
  readonly isLoading = signal<boolean>(false);

  private toastTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.initSocketListener();

    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.loadUnreadCount();
        this.loadAnnouncements();
      } else {
        this.loadPublicAnnouncements();
      }
    });
  }

  private initSocketListener(): void {
    try {
      this.socketService.onAnnouncement((incoming: any) => {
        if (!incoming || !incoming.id) return;

        const newAnnouncement: Announcement = {
          id: incoming.id,
          title: incoming.title || 'إعلان جديد',
          content: incoming.content || incoming.message || '',
          category: incoming.category || 'إداري',
          audiences: incoming.audiences || ['TEACHER', 'STUDENT', 'PARENT'],
          author: incoming.author || 'إدارة المدرسة',
          publishedAt: incoming.publishedAt || incoming.createdAt || new Date().toISOString(),
          expiresAt: incoming.expiresAt,
          pinned: !!incoming.pinned,
          attachment: incoming.attachment,
          isRead: false
        };

        this.addAnnouncement(newAnnouncement);

        // Visitors have NO notifications (no chime, no unread count, no floating toast)
        if (this.authService.isAuthenticated()) {
          this.unreadCount.update(c => c + 1);
          playChimeSound();

          // Show floating toast alert for authenticated users
          clearTimeout(this.toastTimeout);
          this.latestToast.set({
            title: newAnnouncement.title,
            content: newAnnouncement.content,
            category: newAnnouncement.category
          });
          this.toastTimeout = setTimeout(() => this.latestToast.set(null), 6000);
        }
      });
    } catch {
      // Non-blocking socket listener
    }
  }

  readonly isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  // Admins see everything; others only see active announcements addressed to their role.
  // Visitors (unauthenticated) only see announcements on the public Home page addressed to 'PARENT' (الزوار) or everyone.
  readonly visible = computed(() => {
    const role = this.authService.userRole();
    const isAuth = this.authService.isAuthenticated();
    const list = this.isAdmin()
      ? this.announcements()
      : this.announcements().filter(a => {
          if (isExpired(a)) return false;
          if (!isAuth) {
            return a.audiences.includes('PARENT') || a.audiences.length === AUDIENCES.length;
          }
          if (!role) return true;
          return a.audiences.includes(role as Audience) || a.audiences.length === AUDIENCES.length;
        });
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  });

  // Latest active announcements for the navbar bell (authenticated users only)
  readonly latest = computed(() =>
    this.visible()
      .filter(a => !isExpired(a))
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 5)
  );

  loadAnnouncements(): void {
    this.isLoading.set(true);
    this.announcementsService.getAll().subscribe({
      next: res => {
        this.isLoading.set(false);
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Announcement[] = res.data.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            category: item.category as AnnouncementCategory,
            audiences: item.audiences as Audience[],
            author: item.author,
            publishedAt: item.publishedAt,
            expiresAt: item.expiresAt,
            pinned: item.pinned,
            attachment: item.attachment,
            isRead: item.isRead ?? false
          }));
          this.announcements.set(mapped);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  /** Visitors (not signed in): only what the school published to الزوار - even when that's nothing. */
  loadPublicAnnouncements(): void {
    this.isLoading.set(true);
    this.announcementsService.getPublic().subscribe({
      next: res => {
        this.isLoading.set(false);
        if (Array.isArray(res.data)) {
          this.announcements.set(res.data.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            category: item.category as AnnouncementCategory,
            audiences: item.audiences as Audience[],
            author: item.author,
            publishedAt: item.publishedAt,
            expiresAt: item.expiresAt,
            pinned: item.pinned,
            attachment: item.attachment,
            isRead: true
          })));
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadUnreadCount(): void {
    if (!this.authService.isAuthenticated()) return;
    this.announcementsService.getUnreadCount().subscribe({
      next: res => {
        if (typeof res.data?.unreadCount === 'number') {
          this.unreadCount.set(res.data.unreadCount);
        }
      },
      error: () => {}
    });
  }

  addAnnouncement(announcement: Announcement): void {
    this.announcements.update(list => [
      announcement,
      ...list.filter(a => a.id !== announcement.id)
    ]);
  }

  save(announcement: Announcement): void {
    this.addAnnouncement(announcement);
  }

  markAsRead(id: string): void {
    const item = this.announcements().find(a => a.id === id);
    if (item && !item.isRead) {
      this.announcements.update(list =>
        list.map(a => (a.id === id ? { ...a, isRead: true } : a))
      );
      this.unreadCount.update(c => Math.max(0, c - 1));

      if (this.authService.isAuthenticated()) {
        this.announcementsService.markAsRead(id).subscribe({ error: () => {} });
      }
    }
  }

  markAllAsRead(): void {
    this.announcements.update(list => list.map(a => ({ ...a, isRead: true })));
    this.unreadCount.set(0);

    if (this.authService.isAuthenticated()) {
      this.announcementsService.markAllAsRead().subscribe({ error: () => {} });
    }
  }

  togglePinned(id: string): void {
    this.announcements.update(list =>
      list.map(a => (a.id === id ? { ...a, pinned: !a.pinned } : a))
    );

    if (this.authService.isAuthenticated() && this.isAdmin()) {
      this.announcementsService.togglePinned(id).subscribe({ error: () => {} });
    }
  }

  delete(id: string): void {
    const removed = this.announcements().find(a => a.id === id);
    if (removed?.attachment && removed.attachment.url.startsWith('blob:')) {
      URL.revokeObjectURL(removed.attachment.url);
    }
    this.announcements.update(list => list.filter(a => a.id !== id));

    if (this.authService.isAuthenticated() && this.isAdmin()) {
      this.announcementsService.delete(id).subscribe({ error: () => {} });
    }
  }

  dismissToast(): void {
    this.latestToast.set(null);
  }
}

export function announcementsPath(role: UserRole | null): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin/announcements';
    default:
      return '/announcements';
  }
}

import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';
import { Announcement, AUDIENCES, AnnouncementsStore, isExpired, announcementsPath } from '../../../features/announcements/announcements.store';
import { getArabicTwoPartName, getArabicInitial } from '../../../core/utils/arabic-name.util';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TimeAgoPipe],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.css',
  host: {
    class: 'sticky top-0 z-50 block w-full bg-white shadow-xs'
  }
})
export class PublicHeaderComponent {
  readonly authService = inject(AuthService);
  readonly academicYear = inject(AcademicCalendarStore).currentYear;
  readonly academicTerm = inject(AcademicCalendarStore).currentTerm;
  private readonly router = inject(Router);
  private readonly announcementsStore = inject(AnnouncementsStore);

  readonly unreadCount = this.announcementsStore.unreadCount;
  readonly latestAnnouncements = this.announcementsStore.latest;
  readonly announcementsLink = computed(() => announcementsPath(this.authService.userRole()));
  readonly isNotificationsOpen = signal<boolean>(false);

  /**
   * The top-bar ticker: active announcements addressed to everyone (it's a public page),
   * pinned first. Comes from the announcements store, so it follows the API once that's wired.
   */
  readonly tickerItems = computed(() =>
    this.announcementsStore.announcements()
      .filter(a => !isExpired(a) && a.audiences.length === AUDIENCES.length)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, 5)
  );

  /** Longer text gets more time, so the speed stays readable (~4 characters a second). */
  readonly tickerDuration = computed(() => {
    const chars = this.tickerItems().reduce((sum, a) => sum + a.title.length + 10, 0);
    return `${Math.max(15, Math.round(chars / 4))}s`;
  });

  readonly schoolLogo = SCHOOL_INFO.logoUrl;
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isUserMenuOpen = signal<boolean>(false);

  readonly userTwoPartName = computed(() => {
    return getArabicTwoPartName(this.authService.userName());
  });

  // Alias for backward compatibility
  readonly userFirstName = this.userTwoPartName;

  readonly userInitial = computed(() => {
    return getArabicInitial(this.authService.userName());
  });

  readonly userAvatarUrl = computed(() => {
    const user = this.authService.currentUser();
    return user?.avatarUrl || null;
  });

  readonly userRoleArabic = computed(() => {
    const role = this.authService.userRole();
    switch (role) {
      case 'SUPER_ADMIN':
        return 'المشرف العام';
      case 'ADMIN':
        return 'إدارة المدرسة';
      case 'TEACHER':
        return 'عضو هيئة التدريس';
      case 'STUDENT':
        return 'طالب مقيد';
      default:
        return 'مستخدم مسجل';
    }
  });

  readonly dashboardTitle = computed(() => {
    const role = this.authService.userRole();
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'لوحة إدارة المدرسة';
      case 'TEACHER':
        return 'مساحة المعلم';
      case 'STUDENT':
        return 'بوابة الطالب';
      default:
        return 'لوحة التحكم';
    }
  });

  toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) {
      this.isUserMenuOpen.set(false);
    }
  }

  onNotificationClick(item: Announcement): void {
    this.isNotificationsOpen.set(false);
    this.announcementsStore.markAsRead(item.id);
  }

  markAllAsRead(): void {
    this.announcementsStore.markAllAsRead();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
    if (this.isUserMenuOpen()) {
      this.isNotificationsOpen.set(false);
    }
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  handleDirectDashboard(): void {
    const role = this.authService.userRole();
    if (role) {
      this.authService.navigateToRoleDashboard(role);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  logout(): void {
    this.isUserMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.authService.logout();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';
import { TimeAgoPipe, arabicCount } from '../../pipes/time-ago.pipe';
import { AnnouncementsStore, announcementsPath } from '../../../features/announcements/announcements.store';

const NAME_TITLES = new Set(['أ', 'د', 'م', 'الأستاذ', 'الأستاذة', 'الشيخ', 'المهندس', 'الدكتور']);

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, ArabicDatePipe, NgOptimizedImage, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  readonly authService = inject(AuthService);

  readonly school = SCHOOL_INFO;
  private readonly calendar = inject(AcademicCalendarStore);
  readonly currentTerm = this.calendar.currentTerm;
  readonly termReminder = this.calendar.endReminder;

  private readonly announcementsStore = inject(AnnouncementsStore);
  readonly latestAnnouncements = this.announcementsStore.latest;
  // "New" = published within the last 3 days
  readonly newAnnouncementsCount = computed(() =>
    this.latestAnnouncements().filter(a => Date.now() - Date.parse(a.publishedAt) < 3 * 86400000).length
  );
  readonly announcementsLink = computed(() => announcementsPath(this.authService.userRole()));

  daysText(days: number): string {
    return arabicCount(days, 'يوم', 'يومين', 'أيام');
  }
  readonly isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN'].includes(this.authService.userRole() ?? ''));

  readonly title = input<string>('لوحة التحكم');
  readonly showSidebarToggle = input<boolean>(true);
  readonly toggleSidebar = output<void>();

  readonly today = new Date();
  readonly isProfileMenuOpen = signal<boolean>(false);
  readonly isNotificationsOpen = signal<boolean>(false);

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(v => !v);
    if (this.isProfileMenuOpen()) {
      this.isNotificationsOpen.set(false);
    }
  }

  toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  // Initials of the logged-in user's real name, skipping titles like "أ." / "د." / "الأستاذ"
  readonly userInitials = computed(() => {
    const nameParts = this.authService.userName()
      .split(/\s+/)
      .filter(part => part && !NAME_TITLES.has(part.replace(/[./]/g, '')));
    return nameParts.slice(0, 2).map(part => part[0]).join(' ');
  });

  readonly roleLabel = computed(() => {
    switch (this.authService.userRole()) {
      case 'SUPER_ADMIN':
        return this.authService.userName() === SCHOOL_INFO.principal ? 'مدير المدرسة' : 'المسؤول الرئيسي';
      case 'ADMIN':
        return 'مسؤول إداري';
      case 'TEACHER':
        return 'هيئة التدريس';
      case 'STUDENT':
        return 'طالب مقيد';
      case 'PARENT':
        return 'ولي أمر';
      default:
        return 'مستخدم النظام';
    }
  });

  handleLogout(): void {
    this.isProfileMenuOpen.set(false);
    this.authService.logout();
  }
}


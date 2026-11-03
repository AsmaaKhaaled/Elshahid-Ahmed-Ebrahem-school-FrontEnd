import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademicCalendarStore } from '../../../core/academic/academic-calendar.store';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';
import { getArabicTwoPartName, getArabicInitial } from '../../../core/utils/arabic-name.util';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
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

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
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
    this.authService.logout();
  }
}

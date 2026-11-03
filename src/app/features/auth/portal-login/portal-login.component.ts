import { ChangeDetectionStrategy, Component, inject, isDevMode, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthBrandPanelComponent } from '../../../shared/components/auth-brand-panel/auth-brand-panel.component';

type PortalRole = 'student' | 'teacher';

interface PortalConfig {
  label: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierMaxLength: number | null;
  missingMessage: string;
  failedMessage: string;
  demo: { identifier: string; password: string; label: string };
}

const PORTALS: Record<PortalRole, PortalConfig> = {
  student: {
    label: 'الطالب',
    identifierLabel: 'كود الطالب المدرسي',
    identifierPlaceholder: 'مثال: STU-2026-001',
    identifierMaxLength: null,
    missingMessage: 'يرجى إدخال كود الطالب المدرسي وكلمة المرور',
    failedMessage: 'تعذر تسجيل الدخول. يرجى التأكد من كود الطالب أو الاتصال بإدارة المدرسة.',
    demo: { identifier: 'STU-2026-001', password: 'Student@2026', label: 'STU-2026-001' }
  },
  teacher: {
    label: 'المعلم',
    identifierLabel: 'الرقم القومي للمعلم (14 رقماً)',
    identifierPlaceholder: 'مثال: 28901222800962',
    identifierMaxLength: 14,
    missingMessage: 'يرجى إدخال الرقم القومي للمعلم (14 رقماً) وكلمة المرور',
    failedMessage: 'تعذر تسجيل الدخول. يرجى التأكد من الرقم القومي وكلمة المرور.',
    demo: { identifier: '28901222800962', password: 'Teacher@2026', label: 'أ/ نشوه' }
  }
};

/** The system's landing page: student & teacher sign-in. Admins use /admin/login. */
@Component({
  selector: 'app-portal-login',
  standalone: true,
  imports: [RouterLink, FormsModule, AuthBrandPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-login.component.html',
  styleUrl: './portal-login.component.css'
})
export class PortalLoginComponent {
  private readonly authService = inject(AuthService);

  readonly showDemo = isDevMode();
  readonly sessionExpired = inject(ActivatedRoute).snapshot.queryParamMap.has('sessionExpired');

  readonly role = signal<PortalRole>('student');
  readonly identifier = signal<string>('');
  readonly password = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly rememberMe = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  portal(): PortalConfig {
    return PORTALS[this.role()];
  }

  selectRole(role: PortalRole): void {
    if (role === this.role()) return;
    this.role.set(role);
    this.identifier.set('');
    this.password.set('');
    this.errorMessage.set(null);
  }

  fillDemo(): void {
    const { identifier, password } = this.portal().demo;
    this.identifier.set(identifier);
    this.password.set(password);
    this.errorMessage.set(null);
  }

  submit(): void {
    const identifier = this.identifier().trim();
    const password = this.password();

    if (!identifier || !password) {
      this.errorMessage.set(this.portal().missingMessage);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // On success AuthService routes to the role's dashboard (or the initial password page)
    this.authService.login({ identifier, password, rememberMe: this.rememberMe() }).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || this.portal().failedMessage);
      }
    });
  }
}

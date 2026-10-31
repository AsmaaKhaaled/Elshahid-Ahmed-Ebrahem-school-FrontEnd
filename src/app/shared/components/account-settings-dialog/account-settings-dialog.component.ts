import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ADMIN_PASSWORD_PATTERN } from '../../../core/admin/admin-account.model';
import { ADMIN_ROLES, AuthService, ProfileUpdate } from '../../../core/auth/auth.service';
import { User } from '../../../core/models/user.model';
import { PortalToBodyDirective } from '../../directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../directives/submit-lock.directive';

type Tab = 'profile' | 'password';

/**
 * "بيانات الحساب" from the header's user menu: admins edit their own details,
 * and every signed-in user can change their password.
 * Closes itself once a change is saved, emitting the confirmation for the header to show.
 */
@Component({
  selector: 'app-account-settings-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-settings-dialog.component.html',
  styleUrl: './account-settings-dialog.component.css'
})
export class AccountSettingsDialogComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly saved = output<string>();
  readonly closed = output<void>();

  readonly passwordPattern = ADMIN_PASSWORD_PATTERN;
  // Teachers & students only get the password tab - their records are managed by the admins
  readonly canEditProfile = computed(() => ADMIN_ROLES.includes(this.authService.userRole()!));
  readonly tab = signal<Tab>(this.canEditProfile() ? 'profile' : 'password');

  readonly loadingProfile = signal(false);
  readonly lock = submitLock();
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  // Values loaded from the server, to know when a sign-in identifier changes
  private original: Pick<User, 'nationalId' | 'email'> = {};

  profile: ProfileUpdate = { fullName: '', nationalId: '', email: '', phone: '', jobTitle: '', currentPassword: '' };
  passwords = { currentPassword: '', newPassword: '', confirmPassword: '' };

  ngOnInit(): void {
    if (!this.canEditProfile()) return;
    this.fillProfile(this.authService.currentUser());

    // The stored session may predate the latest details (phone, job title...) - refresh them
    this.loadingProfile.set(true);
    this.authService.fetchCurrentUser().subscribe({
      next: res => {
        this.loadingProfile.set(false);
        this.fillProfile(res.user);
      },
      error: () => this.loadingProfile.set(false)
    });
  }

  // Changing what the account signs in with needs the current password
  get identifierChanged(): boolean {
    return this.profile.nationalId !== (this.original.nationalId ?? '') || this.profile.email.trim().toLowerCase() !== (this.original.email ?? '');
  }

  switchTab(tab: Tab): void {
    this.tab.set(tab);
    this.error.set(null);
  }

  saveProfile(form: NgForm): void {
    if (this.lock.busy()) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const { currentPassword, ...details } = this.profile;
    this.submit(
      this.authService.updateProfile({ ...details, fullName: details.fullName.trim(), ...(this.identifierChanged && { currentPassword }) }),
      'تم حفظ بيانات الحساب.'
    );
  }

  changePassword(form: NgForm): void {
    if (this.lock.busy()) return;
    const confirm = form.controls['confirmPassword'];
    if (confirm && this.passwords.confirmPassword !== this.passwords.newPassword) {
      confirm.setErrors({ ...confirm.errors, mismatch: true });
    }
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submit(this.authService.changePassword(this.passwords), 'تم تغيير كلمة المرور. استخدمها من أول تسجيل دخول جاي.');
  }

  private submit(request$: Observable<unknown>, message: string): void {
    this.lock.run(() => {
      this.error.set(null);
      request$.subscribe({
        // Done - the header closes the dialog and shows the confirmation
        next: () => this.saved.emit(message),
        error: err => {
          this.lock.release();
          this.error.set(errorMessage(err));
        }
      });
    });
  }

  private fillProfile(user: User | null): void {
    if (!user) return;
    this.original = { nationalId: user.nationalId ?? '', email: user.email ?? '' };
    this.profile = {
      fullName: user.fullName ?? '',
      nationalId: user.nationalId ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      jobTitle: user.jobTitle ?? '',
      currentPassword: ''
    };
  }
}

// Wrong current password (400) and duplicates (409) come from the backend in Arabic
function errorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'حصل خطأ غير متوقع، حاول مرة أخرى.';
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  if ((err.status === 400 || err.status === 409) && err.error?.message) return err.error.message;
  if (err.status === 422) return 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.';
  return 'تعذر حفظ التغييرات، حاول مرة أخرى.';
}

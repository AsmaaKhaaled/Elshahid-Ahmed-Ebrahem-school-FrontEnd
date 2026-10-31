import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordMatchValidator } from '../../../shared/validators/password-match.validator';

// Validator to disallow default unified passwords
export function notDefaultPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const forbidden = ['Student@2026', 'Teacher@2026', 'Admin@2026'];
  return forbidden.includes(value.trim()) ? { defaultPasswordForbidden: true } : null;
}

@Component({
  selector: 'app-set-initial-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './set-initial-password.component.html',
  styleUrl: './set-initial-password.component.css'
})
export class SetInitialPasswordComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form: FormGroup = this.fb.group({
    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/),
        notDefaultPasswordValidator
      ]
    ],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: passwordMatchValidator('newPassword', 'confirmPassword')
  });

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const newPassCtrl = this.form.get('newPassword');
      if (newPassCtrl?.hasError('defaultPasswordForbidden')) {
        this.errorMessage.set('لا يُسمح باستخدام كلمة المرور الافتراضية الموحدة (Student@2026 أو Teacher@2026)، يرجى اختيار كلمة مرور جديدة خاصة بك.');
      } else if (newPassCtrl?.hasError('pattern')) {
        this.errorMessage.set('كلمة المرور يجب أن تتكون من 8 خانات على الأقل وتحتوي على حرف واحد ورقم واحد على الأقل.');
      } else if (this.form.hasError('passwordMismatch')) {
        this.errorMessage.set('كلمتا المرور غير متطابقتين، يرجى التأكد من كتابتهما بدقة.');
      }
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { newPassword, confirmPassword } = this.form.value;

    this.authService.setInitialPassword({ newPassword, confirmPassword }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res?.message || 'تم تحديث كلمة المرور وتفعيل الحساب بنجاح! جاري تحويلك إلى لوحة التحكم...');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'تعذر تعيين كلمة المرور، يرجى التأكد من صلاحية الرابط والمحاولة مجدداً.');
      }
    });
  }
}


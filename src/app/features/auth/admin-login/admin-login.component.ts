import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ADMIN_ROLES, AuthService, NotAdminAccountError } from '../../../core/auth/auth.service';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
const LOCK_STORAGE_KEY = 'sch_admin_login_lock';
// 14-digit national ID, or an email address
const NATIONAL_ID_OR_EMAIL = /^(\d{14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

interface LockState {
  failures: number;
  // Epoch ms until which the form is locked
  lockedUntil: number | null;
}

/**
 * School administration login (/auth/admin): national ID (or email) + password, generic error messages,
 * temporary lock after repeated failures, and rejection of non-admin accounts.
 * The lock here is a UX courtesy only - the backend must enforce its own rate limit.
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgOptimizedImage, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly school = SCHOOL_INFO;
  readonly maxAttempts = MAX_ATTEMPTS;
  readonly lockMinutes = LOCK_MINUTES;

  // 'forgot' explains how admin passwords are reset (by the principal - there's no self-service reset yet)
  readonly mode = signal<'login' | 'forgot'>('login');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  private readonly lock = signal<LockState>(loadLock());
  private readonly now = signal(Date.now());
  private readonly lockRemainingMs = computed(() => {
    const until = this.lock().lockedUntil;
    return until ? Math.max(0, until - this.now()) : 0;
  });
  readonly isLocked = computed(() => this.lockRemainingMs() > 0);
  readonly lockCountdown = computed(() => {
    const seconds = Math.ceil(this.lockRemainingMs() / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });
  readonly attemptsLeft = computed(() => MAX_ATTEMPTS - this.lock().failures);

  readonly loginForm = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.pattern(NATIONAL_ID_OR_EMAIL)]],
    password: ['', [Validators.required]]
  });

  constructor() {
    // Already signed in as an admin -> straight to the dashboard
    const role = this.authService.userRole();
    if (role && ADMIN_ROLES.includes(role) && this.authService.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard']);
    }

    // Ticks the lock countdown
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  invalid(control: 'identifier' | 'password'): boolean {
    const ctrl = this.loginForm.controls[control];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  onSubmit(): void {
    if (this.isLocked() || this.isLoading()) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // A lock that has run out starts a fresh set of attempts
    if (this.lock().lockedUntil) {
      this.saveLock({ failures: 0, lockedUntil: null });
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.adminLogin(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.saveLock({ failures: 0, lockedUntil: null });
      },
      error: err => {
        this.isLoading.set(false);
        this.loginForm.controls.password.reset();
        this.handleLoginError(err);
      }
    });
  }

  openForgot(): void {
    this.errorMessage.set(null);
    this.mode.set('forgot');
  }

  backToLogin(): void {
    this.errorMessage.set(null);
    this.mode.set('login');
  }

  private handleLoginError(err: unknown): void {
    if (err instanceof NotAdminAccountError) {
      this.errorMessage.set('هذا الحساب ليس من حسابات إدارة المدرسة. ادخل من بوابة المعلم أو الطالب في الصفحة الرئيسية.');
      return;
    }

    const status = err instanceof HttpErrorResponse ? err.status : 0;

    // Correct credentials, but the SUPER_ADMIN suspended this account
    if (status === 403) {
      this.saveLock({ failures: 0, lockedUntil: null });
      this.errorMessage.set('تم إيقاف هذا الحساب. تواصل مع مدير المدرسة لإعادة تفعيله.');
      return;
    }

    // The server decided to lock the account (rate limit)
    if (status === 429) {
      const retryAfter = Number((err as HttpErrorResponse).headers?.get('Retry-After')) || LOCK_MINUTES * 60;
      this.saveLock({ failures: MAX_ATTEMPTS, lockedUntil: Date.now() + retryAfter * 1000 });
      this.errorMessage.set(null);
      return;
    }

    // 422 = the backend's validation rejected the identifier/password
    if (status === 401 || status === 400 || status === 422) {
      const failures = this.lock().failures + 1;
      if (failures >= MAX_ATTEMPTS) {
        this.saveLock({ failures, lockedUntil: Date.now() + LOCK_MINUTES * 60000 });
        this.errorMessage.set(null);
      } else {
        this.saveLock({ failures, lockedUntil: null });
        // Never say which of the two was wrong
        this.errorMessage.set('بيانات الدخول أو كلمة المرور غير صحيحة.');
      }
      return;
    }

    this.errorMessage.set('تعذر الاتصال بالخادم. حاول مرة أخرى بعد قليل.');
  }

  private saveLock(state: LockState): void {
    this.lock.set(state);
    this.now.set(Date.now());
    try {
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable - the lock still applies for this page visit
    }
  }
}

function loadLock(): LockState {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCK_STORAGE_KEY) ?? 'null');
    if (saved && typeof saved.failures === 'number') return saved;
  } catch {
    // Corrupted value - start clean
  }
  return { failures: 0, lockedUntil: null };
}

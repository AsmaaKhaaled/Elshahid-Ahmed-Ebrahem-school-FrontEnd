import { Injectable, inject, signal, computed, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { TokenService } from './token.service';
import { DEV_SUPER_ADMIN, mockAdminLogin, mockForgotPassword } from './dev-auth.mock';
import { ADMIN_PERMISSIONS, AdminRouteAccess, SUPER_ADMIN_ONLY } from '../admin/admin-permissions';
import { User, UserRole } from '../models/user.model';
import { AdminLoginCredentials, AuthResponse, LoginCredentials, SetInitialPasswordRequest } from '../models/auth-response.model';

export const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

export class NotAdminAccountError extends Error {
  constructor() {
    super('NOT_ADMIN_ACCOUNT');
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  private readonly USER_STORAGE_KEY = 'sch_user_profile';

  // Signals for state management
  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly isLoading = signal<boolean>(false);
  readonly authError = signal<string | null>(null);

  // Computed signals
  readonly isAuthenticated = computed(() => !!this.currentUser() && this.tokenService.hasTokenSignal());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  readonly mustChangePassword = computed(() => this.currentUser()?.mustChangePassword ?? false);
  readonly userName = computed(() => this.currentUser()?.fullName ?? 'المستخدم');
  readonly isSuperAdmin = computed(() => this.userRole() === 'SUPER_ADMIN');

  constructor() {
    // If token exists but no user in memory, try parsing from token payload or storage
    if (this.tokenService.hasValidToken() && !this.currentUser()) {
      const stored = this.getStoredUser();
      if (stored) {
        this.currentUser.set(stored);
      }
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.authError.set(null);

    return this.api.post<AuthResponse>('auth/login', credentials).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        this.currentUser.set(res.user);
        this.storeUser(res.user);
        
        if (res.user.mustChangePassword) {
          this.router.navigate(['/auth/set-initial-password']);
        } else {
          this.navigateToRoleDashboard(res.user.role);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'فشل تسجيل الدخول. يرجى التحقق من الرقم القومي وكلمة المرور.';
        this.authError.set(msg);
        return throwError(() => err);
      })
    );
  }

  /**
   * Login for the school administration page (/auth/admin).
   * Accounts that aren't admins are rejected with NotAdminAccountError, even with valid credentials,
   * and no session is stored for them.
   */
  adminLogin(credentials: AdminLoginCredentials): Observable<AuthResponse> {
    const request$ = isDevMode()
      ? mockAdminLogin(credentials)
      : this.api.post<AuthResponse>('auth/admin/login', credentials);

    return request$.pipe(
      tap(res => {
        if (!ADMIN_ROLES.includes(res.user.role)) {
          throw new NotAdminAccountError();
        }
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        this.currentUser.set(res.user);
        this.storeUser(res.user);
        this.navigateToRoleDashboard(res.user.role);
      })
    );
  }

  // Always resolves the same way whether or not the email exists, so accounts can't be discovered
  requestAdminPasswordReset(email: string): Observable<void> {
    return isDevMode() ? mockForgotPassword() : this.api.post<void>('auth/admin/forgot-password', { email });
  }

  setInitialPassword(req: SetInitialPasswordRequest): Observable<{ success: boolean; message: string }> {
    this.isLoading.set(true);
    return this.api.post<{ success: boolean; message: string }>('auth/set-initial-password', req).pipe(
      tap(() => {
        this.isLoading.set(false);
        // Update user mustChangePassword status locally
        const current = this.currentUser();
        if (current) {
          const updated: User = { ...current, mustChangePassword: false };
          this.currentUser.set(updated);
          this.storeUser(updated);
          this.navigateToRoleDashboard(updated.role);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.tokenService.clearTokens();
    localStorage.removeItem(this.USER_STORAGE_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(roles: UserRole | UserRole[]): boolean {
    const current = this.currentUser();
    if (!current) return false;
    if (Array.isArray(roles)) {
      return roles.includes(current.role);
    }
    return current.role === roles;
  }

  /**
   * Whether the signed-in user may open an admin section.
   * SUPER_ADMIN: everything. ADMIN: only the sections granted to them. Others: nothing.
   * Reads signals, so it can be used inside computed().
   */
  canAccessAdminSection(access: AdminRouteAccess): boolean {
    const user = this.currentUser();
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role !== 'ADMIN' || access === SUPER_ADMIN_ONLY) return false;
    return user.permissions?.includes(access) ?? false;
  }

  quickLoginAs(role: UserRole, customUser?: Partial<User>): void {
    const demoUsers: Record<UserRole, User> = {
      ADMIN: {
        id: 'adm-001',
        nationalId: '28001011234567',
        fullName: 'أ. د. محمود عبد العزيز الشناوي',
        email: 'admin@alshaheed.edu.eg',
        role: 'ADMIN',
        permissions: ADMIN_PERMISSIONS.map(p => p.key),
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      },
      SUPER_ADMIN: {
        id: 'sup-001',
        nationalId: '27501011234567',
        fullName: 'إدارة تكنولوجيا التعليم والكنترول',
        email: 'superadmin@alshaheed.edu.eg',
        role: 'SUPER_ADMIN',
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      },
      TEACHER: {
        id: 'tch-2001',
        nationalId: '28904151234567',
        fullName: 'أ. طارق عبد الحميد',
        email: 'tarek.teacher@alshaheed.edu.eg',
        role: 'TEACHER',
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        subjects: ['العلوم العامة', 'مسؤول معمل العلوم'],
        createdAt: new Date().toISOString()
      },
      STUDENT: {
        id: 'stu-1001',
        nationalId: '31001011234567',
        fullName: 'عمر أحمد محمود',
        email: 'omar.ahmed@alshaheed.edu.eg',
        role: 'STUDENT',
        mustChangePassword: false,
        status: 'ACTIVE',
        gradeLevel: 'الصف الثاني الإعدادي',
        className: 'فصل 2/3',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      },
      PARENT: {
        id: 'prn-001',
        nationalId: '27001011234567',
        fullName: 'السيد / أحمد محمود',
        email: 'ahmed.parent@alshaheed.edu.eg',
        role: 'PARENT',
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      }
    };

    const user: User = { ...demoUsers[role], ...customUser };
    this.startMockSession(user);
    this.navigateToRoleDashboard(user.role);
  }

  /**
   * Development only: opens the admin panel as the SUPER_ADMIN without the login screen
   * (see devSuperAdminGuard). Production builds always go through /auth/admin.
   */
  startDevSuperAdminSession(): void {
    if (isDevMode()) {
      this.startMockSession(DEV_SUPER_ADMIN);
    }
  }

  private startMockSession(user: User): void {
    const mockToken = `header.${btoa(JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 }))}.signature`;
    this.tokenService.setTokens(mockToken);
    this.currentUser.set(user);
    this.storeUser(user);
  }

  navigateToRoleDashboard(role: UserRole): void {
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'TEACHER':
        this.router.navigate(['/teacher/dashboard']);
        break;
      case 'STUDENT':
      case 'PARENT':
        this.router.navigate(['/student/dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
  }

  private getStoredUser(): User | null {
    try {
      const data = localStorage.getItem(this.USER_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}


import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { ApiService } from '../services/api.service';
import { TokenService } from './token.service';
import { AdminRouteAccess, SUPER_ADMIN_ONLY } from '../admin/admin-permissions';
import { User, UserRole, TeacherProfile, StudentProfile } from '../models/user.model';
import {
  AdminLoginCredentials,
  LoginCredentials,
  LoginResponse,
  SetInitialPasswordRequest,
  SetInitialPasswordResponse,
  GetMeResponse
} from '../models/auth-response.model';

export const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

export interface ProfileUpdate {
  fullName: string;
  nationalId: string;
  email: string;
  phone: string;
  jobTitle: string;
  currentPassword?: string;
}

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
  readonly requirePasswordChange = signal<boolean>(
    this.tokenService.hasTempToken() || (this.getStoredUser()?.forcePasswordChange ?? false)
  );

  // Computed signals
  readonly isAuthenticated = computed(() => !!this.currentUser() && this.tokenService.hasValidToken());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  readonly mustChangePassword = computed(() => this.requirePasswordChange() || (this.currentUser()?.mustChangePassword ?? false));
  readonly userName = computed(() => this.currentUser()?.fullName ?? 'المستخدم');
  readonly isSuperAdmin = computed(() => this.userRole() === 'SUPER_ADMIN');
  readonly isAdmin = computed(() => this.userRole() === 'ADMIN' || this.userRole() === 'SUPER_ADMIN');

  readonly teacherProfile = computed<TeacherProfile | null>(() => {
    const user = this.currentUser();
    if (user?.role === 'TEACHER') {
      return (user.profile || user.teacherProfile) as TeacherProfile ?? null;
    }
    return null;
  });

  readonly studentProfile = computed<StudentProfile | null>(() => {
    const user = this.currentUser();
    if (user?.role === 'STUDENT') {
      return (user.profile || user.studentProfile) as StudentProfile ?? null;
    }
    return null;
  });

  constructor() {
    // Session introspection on initialization if user has valid full token
    if (this.tokenService.hasValidToken()) {
      this.fetchCurrentUser().subscribe({
        error: () => {
          // If session is invalid, clear storage
          this.tokenService.clearTokens();
          localStorage.removeItem(this.USER_STORAGE_KEY);
          this.currentUser.set(null);
        }
      });
    }
  }

  /**
   * Unified Login Endpoint (POST /api/v1/auth/login)
   * Supports nationalId (14 digits) for teachers, studentCode for students, email for admins.
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    this.isLoading.set(true);
    this.authError.set(null);

    return this.api.post<LoginResponse>('auth/login', {
      identifier: credentials.identifier.trim(),
      password: credentials.password
    }).pipe(
      tap((res) => {
        this.isLoading.set(false);

        // Normalize profile if embedded in root or teacherProfile/studentProfile
        const user: User = {
          ...res.user,
          profile: res.user.profile || (res.user as any).teacherProfile || (res.user as any).studentProfile || null
        };

        if (res.requirePasswordChange || (res as any).forcePasswordChange || user.forcePasswordChange) {
          // Phase 1: Force password change on first login
          this.requirePasswordChange.set(true);
          user.forcePasswordChange = true;
          user.mustChangePassword = true;

          if (res.tempToken) {
            this.tokenService.setTempToken(res.tempToken);
          }
          this.currentUser.set(user);
          this.storeUser(user);
          this.router.navigate(['/auth/set-initial-password']);
        } else {
          // Phase 2: Active account with standard full JWT
          this.requirePasswordChange.set(false);
          user.forcePasswordChange = false;
          user.mustChangePassword = false;

          const jwt = res.token || res.accessToken;
          if (jwt) {
            this.tokenService.setTokens(jwt);
          }
          this.currentUser.set(user);
          this.storeUser(user);
          this.navigateToRoleDashboard(user.role);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'فشل تسجيل الدخول. يرجى التحقق من صحة المعرّف وكلمة المرور.';
        this.authError.set(msg);
        return throwError(() => err);
      })
    );
  }

  /**
   * Set Initial Password Endpoint (PATCH /api/v1/auth/set-initial-password)
   * Uses tempToken via Authorization: Bearer <tempToken>
   */
  setInitialPassword(req: { newPassword: string; confirmPassword: string }): Observable<SetInitialPasswordResponse> {
    this.isLoading.set(true);
    this.authError.set(null);

    return this.api.patch<SetInitialPasswordResponse>('auth/set-initial-password', req).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.requirePasswordChange.set(false);

        if (res.token) {
          this.tokenService.setTokens(res.token);
        }

        const user: User = {
          ...res.user,
          forcePasswordChange: false,
          mustChangePassword: false,
          profile: res.user.profile || (res.user as any).teacherProfile || (res.user as any).studentProfile || null
        };

        this.currentUser.set(user);
        this.storeUser(user);
        this.navigateToRoleDashboard(user.role);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'تعذر تعيين كلمة المرور، يرجى المحاولة مرة أخرى.';
        this.authError.set(msg);
        return throwError(() => err);
      })
    );
  }

  /**
   * Session Introspection Endpoint (GET /api/v1/auth/me)
   */
  fetchCurrentUser(): Observable<GetMeResponse> {
    return this.api.get<GetMeResponse>('auth/me').pipe(
      tap((res) => {
        if (res?.user) {
          const user: User = {
            ...res.user,
            profile: res.user.profile || (res.user as any).teacherProfile || (res.user as any).studentProfile || null
          };
          this.currentUser.set(user);
          this.storeUser(user);
        }
      })
    );
  }

  /**
   * Login for the school administration page (/auth/admin), via the unified POST /api/v1/auth/login.
   * Accounts that aren't ADMIN / SUPER_ADMIN are refused before anything is stored.
   */
  adminLogin(credentials: AdminLoginCredentials): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', {
      identifier: credentials.identifier.trim(),
      password: credentials.password
    }).pipe(
      tap(res => {
        if (!ADMIN_ROLES.includes(res.user.role)) {
          throw new NotAdminAccountError();
        }

        const user: User = {
          ...res.user,
          mustChangePassword: !!res.requirePasswordChange,
          createdAt: res.user.createdAt ?? ''
        };

        if (res.requirePasswordChange) {
          // An admin account created with a temporary password: set a personal one first
          this.requirePasswordChange.set(true);
          user.forcePasswordChange = true;
          if (res.tempToken) {
            this.tokenService.setTempToken(res.tempToken);
          }
          this.currentUser.set(user);
          this.storeUser(user);
          this.router.navigate(['/auth/set-initial-password']);
          return;
        }

        const jwt = res.token || res.accessToken;
        if (jwt) {
          this.tokenService.setTokens(jwt);
        }
        this.requirePasswordChange.set(false);
        this.currentUser.set(user);
        this.storeUser(user);
        this.navigateToRoleDashboard(user.role);
      })
    );
  }

  /**
   * Own account details (PATCH /api/v1/auth/me) - school administration accounts only.
   * currentPassword is required by the backend when the national ID or email changes.
   */
  updateProfile(data: ProfileUpdate): Observable<User> {
    return this.api.patch<GetMeResponse>('auth/me', data).pipe(
      map(res => {
        const user: User = { ...this.currentUser()!, ...res.user };
        this.currentUser.set(user);
        this.storeUser(user);
        return user;
      })
    );
  }

  /** Change own password (PATCH /api/v1/auth/change-password), needs the current one. */
  changePassword(body: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<void> {
    return this.api.patch<unknown>('auth/change-password', body).pipe(map(() => undefined));
  }

  logout(): void {
    // Admins go back to the administration login, everyone else to the main login
    const wasAdmin = this.isAdmin();
    this.tokenService.clearTokens();
    localStorage.removeItem(this.USER_STORAGE_KEY);
    this.currentUser.set(null);
    this.requirePasswordChange.set(false);
    this.router.navigate([wasAdmin ? '/auth/admin' : '/auth/login']);
  }

  hasRole(roles: UserRole | UserRole[]): boolean {
    const current = this.currentUser();
    if (!current) return false;
    if (Array.isArray(roles)) {
      return roles.includes(current.role);
    }
    return current.role === roles;
  }

  canAccessAdminSection(access: AdminRouteAccess): boolean {
    const user = this.currentUser();
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role !== 'ADMIN' || access === SUPER_ADMIN_ONLY) return false;
    return user.permissions?.includes(access) ?? false;
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
        this.router.navigate(['/admin/dashboard']);
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


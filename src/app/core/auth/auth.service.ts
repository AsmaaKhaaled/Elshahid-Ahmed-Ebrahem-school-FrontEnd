import { Injectable, inject, signal, computed, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { TokenService } from './token.service';
import { DEV_SUPER_ADMIN, mockAdminLogin, mockForgotPassword } from './dev-auth.mock';
import { ADMIN_PERMISSIONS, AdminRouteAccess, SUPER_ADMIN_ONLY } from '../admin/admin-permissions';
import { User, UserRole, TeacherProfile, StudentProfile } from '../models/user.model';
import { 
  AdminLoginCredentials, 
  AuthResponse, 
  LoginCredentials, 
  LoginResponse,
  SetInitialPasswordRequest, 
  SetInitialPasswordResponse,
  GetMeResponse 
} from '../models/auth-response.model';

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
   * Login for the school administration page (/auth/admin).
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
        const jwt = res.token || res.accessToken;
        if (jwt) {
          this.tokenService.setTokens(jwt, res.refreshToken);
        }
        this.currentUser.set(res.user);
        this.storeUser(res.user);
        this.navigateToRoleDashboard(res.user.role);
      })
    );
  }

  requestAdminPasswordReset(email: string): Observable<void> {
    return isDevMode() ? mockForgotPassword() : this.api.post<void>('auth/admin/forgot-password', { email });
  }

  logout(): void {
    this.tokenService.clearTokens();
    localStorage.removeItem(this.USER_STORAGE_KEY);
    this.currentUser.set(null);
    this.requirePasswordChange.set(false);
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

  canAccessAdminSection(access: AdminRouteAccess): boolean {
    const user = this.currentUser();
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role !== 'ADMIN' || access === SUPER_ADMIN_ONLY) return false;
    return user.permissions?.includes(access) ?? false;
  }

  /**
   * Test/Demo Session Helper with teacher (أ/ نشوه) and admin/super-admin profiles
   */
  quickLoginAs(role: UserRole, customUser?: Partial<User>): void {
    const demoUsers: Record<UserRole, User> = {
      TEACHER: {
        id: 'tch-001',
        nationalId: '28901222800962',
        fullName: 'نشوه يوسف محمد يوسف',
        email: 'nashwa.teacher@school.edu.eg',
        role: 'TEACHER',
        forcePasswordChange: false,
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        profile: {
          teacherCode: 'TCH-001',
          specialization: 'رياضيات',
          classes: [
            {
              id: 'class_id_1',
              name: '3/2',
              displayNameArabic: 'الصف الثالث الإعدادي - فصل 3/2',
              gradeLevel: '3rd Preparatory',
              roomNumber: '302'
            },
            {
              id: 'class_id_2',
              name: '3/3',
              displayNameArabic: 'الصف الثالث الإعدادي - فصل 3/3',
              gradeLevel: '3rd Preparatory',
              roomNumber: '303'
            },
            {
              id: 'class_id_3',
              name: '3/4',
              displayNameArabic: 'الصف الثالث الإعدادي - فصل 3/4',
              gradeLevel: '3rd Preparatory',
              roomNumber: '304'
            }
          ],
          subjects: [
            {
              code: 'MTH-PREP3',
              nameArabic: 'رياضيات'
            }
          ]
        },
        createdAt: new Date().toISOString()
      },
      STUDENT: {
        id: 'stu-1001',
        studentCode: 'STU-2026-001',
        nationalId: '31001011234567',
        fullName: 'عمر طارق',
        email: 'omar.tareq@school.edu.eg',
        role: 'STUDENT',
        forcePasswordChange: false,
        mustChangePassword: false,
        status: 'ACTIVE',
        gradeLevel: 'الصف الثالث الإعدادي',
        className: 'فصل 3/2',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        profile: {
          studentCode: 'STU-2026-001',
          gradeLevel: 'الصف الثالث الإعدادي',
          className: 'فصل 3/2'
        },
        createdAt: new Date().toISOString()
      },
      ADMIN: {
        id: 'adm-001',
        nationalId: '28001011234567',
        fullName: 'أ. د. محمود عبد العزيز الشناوي',
        email: 'admin@school.com',
        role: 'ADMIN',
        permissions: ADMIN_PERMISSIONS.map(p => p.key),
        forcePasswordChange: false,
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      },
      SUPER_ADMIN: {
        id: 'sup-001',
        nationalId: '27501011234567',
        fullName: 'إدارة تكنولوجيا التعليم والكنترول',
        email: 'superadmin@school.com',
        role: 'SUPER_ADMIN',
        forcePasswordChange: false,
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      },
      PARENT: {
        id: 'prn-001',
        nationalId: '27001011234567',
        fullName: 'السيد / طارق أحمد',
        email: 'tareq.parent@school.edu.eg',
        role: 'PARENT',
        forcePasswordChange: false,
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: 'مدرسة الشهيد أحمد إبراهيم حسب الله الإعدادية بنين',
        createdAt: new Date().toISOString()
      }
    };

    const user: User = { ...demoUsers[role], ...customUser };
    const mockToken = `header.${btoa(JSON.stringify({ id: user.id, role: user.role, isTemp: false, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }))}.signature`;
    this.tokenService.setTokens(mockToken);
    this.requirePasswordChange.set(false);
    this.currentUser.set(user);
    this.storeUser(user);
    this.navigateToRoleDashboard(user.role);
  }

  startDevSuperAdminSession(): void {
    if (isDevMode()) {
      this.quickLoginAs('SUPER_ADMIN', DEV_SUPER_ADMIN);
    }
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


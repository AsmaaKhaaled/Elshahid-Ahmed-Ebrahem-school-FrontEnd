import { HttpErrorResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { adminAccountToUser } from '../admin/admin-account.model';
import { SEEDED_ADMINS } from '../admin/admin-accounts.seed';
import { SCHOOL_INFO } from '../constants/school.constants';
import { AdminLoginCredentials, AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';

/**
 * Development-only stand-in for the backend admin login (used while isDevMode()).
 * Remove once POST /auth/admin/login, /auth/admin/forgot-password and the admin accounts API exist.
 * Passwords are kept only in this module (never in a store or the UI); the backend will hash them.
 */
export const DEV_ADMIN_CREDENTIALS = { email: 'admin@school.edu.eg', nationalId: '28001011234567', password: 'Admin@2026' };
// A valid non-admin account, to try the "not an admin account" rejection
export const DEV_TEACHER_CREDENTIALS = { email: 'teacher@school.edu.eg', password: 'Teacher@2026' };
// Shared password of the demo admins seeded in AdminAccountsStore
export const DEV_SEEDED_ADMIN_PASSWORD = 'Staff@2026';

const createdAt = new Date().toISOString();

// The principal: the SUPER_ADMIN, with access to everything and the only one who manages admins
export const DEV_SUPER_ADMIN: User = {
  id: 'adm-001',
  nationalId: DEV_ADMIN_CREDENTIALS.nationalId,
  fullName: SCHOOL_INFO.principal,
  email: DEV_ADMIN_CREDENTIALS.email,
  role: 'SUPER_ADMIN',
  mustChangePassword: false,
  status: 'ACTIVE',
  schoolName: SCHOOL_INFO.fullName,
  createdAt
};

const devAccounts = new Map<string, { user: User; password: string }>([
  [DEV_SUPER_ADMIN.id, { user: DEV_SUPER_ADMIN, password: DEV_ADMIN_CREDENTIALS.password }],
  [
    'tch-001',
    {
      password: DEV_TEACHER_CREDENTIALS.password,
      user: {
        id: 'tch-001',
        nationalId: '28905051234567',
        fullName: 'أ. نادية كمال الشربيني',
        email: DEV_TEACHER_CREDENTIALS.email,
        role: 'TEACHER',
        mustChangePassword: false,
        status: 'ACTIVE',
        schoolName: SCHOOL_INFO.fullName,
        createdAt
      }
    }
  ],
  ...SEEDED_ADMINS.map(admin => [admin.id, { user: adminAccountToUser(admin), password: DEV_SEEDED_ADMIN_PASSWORD }] as const)
]);

/** Adds or updates a login account. Without a password, the current one is kept. */
export function upsertDevAccount(user: User, password?: string): void {
  const current = devAccounts.get(user.id);
  devAccounts.set(user.id, { user, password: password ?? current?.password ?? '' });
}

export function removeDevAccount(userId: string): void {
  devAccounts.delete(userId);
}

/** Admin login with the national ID or the email + password. */
export function mockAdminLogin(credentials: AdminLoginCredentials): Observable<AuthResponse> {
  const identifier = credentials.identifier.trim().toLowerCase();
  const match = [...devAccounts.values()].find(
    ({ user, password }) =>
      (user.nationalId === identifier || user.email?.toLowerCase() === identifier) && password === credentials.password
  );
  if (!match) {
    return throwError(() => new HttpErrorResponse({ status: 401 })).pipe(delay(600));
  }
  // Suspended accounts are refused even with the right password
  if (match.user.status === 'SUSPENDED') {
    return throwError(() => new HttpErrorResponse({ status: 403 })).pipe(delay(600));
  }
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600;
  const accessToken = `header.${btoa(JSON.stringify({ sub: match.user.id, role: match.user.role, exp }))}.signature`;
  return of({ accessToken, tokenType: 'Bearer', user: match.user }).pipe(delay(600));
}

export function mockForgotPassword(): Observable<void> {
  return of(undefined).pipe(delay(600));
}

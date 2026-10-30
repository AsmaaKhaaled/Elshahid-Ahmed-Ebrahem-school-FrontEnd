import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { SUPER_ADMIN_ONLY } from '../admin/admin-permissions';
import { AuthService } from '../auth/auth.service';
import { User } from '../models/user.model';
import { adminSectionGuard } from './admin-section.guard';

describe('adminSectionGuard', () => {
  function signIn(role: User['role'], permissions?: User['permissions']): void {
    TestBed.inject(AuthService).currentUser.set({
      id: 'u1', nationalId: '00000000000000', fullName: 'تجريبي', email: '', role, permissions,
      mustChangePassword: false, status: 'ACTIVE', createdAt: ''
    });
  }

  function runGuard(access?: string): boolean | UrlTree {
    const route = { data: access ? { access } : {} } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      adminSectionGuard(route, {} as RouterStateSnapshot)
    ) as boolean | UrlTree;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
  });

  it('lets the super admin open every section, including admin management', () => {
    signIn('SUPER_ADMIN');
    expect(runGuard('honor-roll')).toBeTrue();
    expect(runGuard(SUPER_ADMIN_ONLY)).toBeTrue();
  });

  it('lets an admin open only the sections granted to them', () => {
    signIn('ADMIN', ['students']);
    expect(runGuard('students')).toBeTrue();
    expect(String(runGuard('teachers'))).toBe('/admin/dashboard');
  });

  it('never lets a regular admin open admin management', () => {
    signIn('ADMIN', ['students', 'teachers']);
    expect(String(runGuard(SUPER_ADMIN_ONLY))).toBe('/admin/dashboard');
  });

  it('always allows routes without an access marker (the dashboard)', () => {
    signIn('ADMIN', []);
    expect(runGuard()).toBeTrue();
  });
});

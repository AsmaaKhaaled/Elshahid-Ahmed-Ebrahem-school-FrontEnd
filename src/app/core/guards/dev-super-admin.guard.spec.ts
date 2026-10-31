import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, convertToParamMap } from '@angular/router';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/token.service';
import { devSuperAdminGuard, skipAdminLoginInDevGuard } from './dev-super-admin.guard';

// Tests run in dev mode, like `ng serve`
describe('dev super admin guards', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    TestBed.inject(TokenService).clearTokens();
    authService = TestBed.inject(AuthService);
    authService.currentUser.set(null);
  });

  afterEach(() => {
    TestBed.inject(TokenService).clearTokens();
    localStorage.removeItem('sch_user_profile');
  });

  function run<T>(guard: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => T, query: Record<string, string> = {}): T {
    const route = { queryParamMap: convertToParamMap(query) } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => guard(route, {} as RouterStateSnapshot));
  }

  it('opens the admin panel as the super admin when nobody is signed in', () => {
    expect(run(devSuperAdminGuard)).toBeTrue();
    expect(authService.userRole()).toBe('SUPER_ADMIN');
    expect(TestBed.inject(TokenService).hasValidToken()).toBeTrue();
  });

  it('keeps an existing session (e.g. a limited admin)', () => {
    authService.quickLoginAs('ADMIN', { permissions: ['students'] });
    run(devSuperAdminGuard);

    expect(authService.userRole()).toBe('ADMIN');
  });

  it('skips the admin login form, unless ?manual is used', () => {
    expect(String(run(skipAdminLoginInDevGuard) as UrlTree)).toBe('/admin/dashboard');
    expect(run(skipAdminLoginInDevGuard, { manual: '' })).toBeTrue();
  });
});

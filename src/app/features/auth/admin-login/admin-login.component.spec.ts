import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { provideTestDefaults } from '../../../../testing/test-helpers';
import { AuthService } from '../../../core/auth/auth.service';
import { TokenService } from '../../../core/auth/token.service';
import { AdminLoginComponent, MAX_ATTEMPTS } from './admin-login.component';

const LOGIN_URL = 'http://localhost:5000/api/v1/auth/login';

function loginResponse(role: string, extra: object = {}) {
  return {
    status: 'success',
    requirePasswordChange: false,
    token: 'jwt-token',
    user: { id: 'u1', fullName: 'مستخدم', nationalId: '28001011234567', role, status: 'ACTIVE', permissions: [], ...extra }
  };
}

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let authService: AuthService;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    localStorage.removeItem('sch_admin_login_lock');
    localStorage.removeItem('sch_user_profile');
    localStorage.removeItem('sch_access_token');

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.currentUser.set(null);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
    TestBed.inject(TokenService).clearTokens();
    localStorage.removeItem('sch_admin_login_lock');
    localStorage.removeItem('sch_user_profile');
  });

  function submit(identifier: string, password: string) {
    component.loginForm.setValue({ identifier, password });
    component.onSubmit();
    return http.expectOne(LOGIN_URL);
  }

  function fail(identifier: string, status: number): void {
    submit(identifier, 'whatever').flush({ message: 'x' }, { status, statusText: 'Error' });
  }

  it('signs the super admin in through the real login endpoint and opens the dashboard', () => {
    const req = submit('28001011234567', 'Admin@2026');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: '28001011234567', password: 'Admin@2026' });
    req.flush(loginResponse('SUPER_ADMIN'));

    expect(authService.userRole()).toBe('SUPER_ADMIN');
    expect(TestBed.inject(TokenService).getToken()).toBe('jwt-token');
    expect(navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('signs a limited admin in with only the sections granted to them', () => {
    submit('27805121234561', 'Staff@2026').flush(loginResponse('ADMIN', { permissions: ['students'] }));

    expect(authService.userRole()).toBe('ADMIN');
    expect(authService.canAccessAdminSection('students')).toBeTrue();
    expect(authService.canAccessAdminSection('honor-roll')).toBeFalse();
  });

  it('sends an admin with a temporary password to set a personal one', () => {
    submit('27805121234561', 'Temp1234').flush({
      status: 'success', requirePasswordChange: true, tempToken: 'temp', user: { id: 'u1', fullName: 'مسؤول', role: 'ADMIN' }
    });

    expect(navigate).toHaveBeenCalledWith(['/auth/set-initial-password']);
    expect(TestBed.inject(TokenService).getToken()).toBeNull();
  });

  it('refuses a suspended admin even with the right password', () => {
    fail('27805121234561', 403);

    expect(component.errorMessage()).toContain('تم إيقاف هذا الحساب');
    expect(authService.currentUser()).toBeNull();
  });

  it('shows one generic message for wrong credentials and clears the password', () => {
    fail('admin@school.com', 401);

    expect(component.errorMessage()).toBe('بيانات الدخول أو كلمة المرور غير صحيحة.');
    expect(component.attemptsLeft()).toBe(MAX_ATTEMPTS - 1);
    expect(component.loginForm.controls.password.value).toBe('');
    // Stays on the admin login page (the interceptor must not redirect a failed login)
    expect(navigate).not.toHaveBeenCalled();
  });

  it('locks the form after too many failed attempts', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      fail('someone@school.edu.eg', 401);
    }
    expect(component.isLocked()).toBeTrue();

    // Further attempts are ignored while locked - no request is sent
    component.loginForm.setValue({ identifier: '28001011234567', password: 'Admin@2026' });
    component.onSubmit();
    http.expectNone(LOGIN_URL);
  });

  it('rejects a valid account that is not an admin, without signing it in', () => {
    submit('28901222800962', 'Teacher@2026').flush(loginResponse('TEACHER'));

    expect(component.errorMessage()).toContain('ليس من حسابات إدارة المدرسة');
    expect(authService.currentUser()).toBeNull();
    expect(TestBed.inject(TokenService).getToken()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a server that cannot be reached', () => {
    fail('28001011234567', 0);
    expect(component.errorMessage()).toContain('تعذر الاتصال بالخادم');
  });

  it('explains that the principal resets admin passwords', () => {
    component.openForgot();
    fixture.detectChanges();

    expect(component.mode()).toBe('forgot');
    expect(fixture.nativeElement.textContent).toContain('مدير المدرسة');
  });
});

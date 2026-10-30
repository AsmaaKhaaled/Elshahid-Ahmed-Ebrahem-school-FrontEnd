import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideTestDefaults } from '../../../../testing/test-helpers';
import { AuthService } from '../../../core/auth/auth.service';
import { DEV_ADMIN_CREDENTIALS, DEV_SEEDED_ADMIN_PASSWORD, DEV_TEACHER_CREDENTIALS } from '../../../core/auth/dev-auth.mock';
import { AdminAccountsStore } from '../../../core/admin/admin-accounts.store';
import { SEEDED_ADMINS } from '../../../core/admin/admin-accounts.seed';
import { AdminLoginComponent, MAX_ATTEMPTS } from './admin-login.component';

// The dev mock answers after 600ms
const MOCK_DELAY = 600;

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let authService: AuthService;
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
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('sch_admin_login_lock');
  });

  function submit(identifier: string, password: string): void {
    component.loginForm.setValue({ identifier, password });
    component.onSubmit();
    tick(MOCK_DELAY);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('signs the super admin in with the national ID and opens the admin dashboard', fakeAsync(() => {
    submit(DEV_ADMIN_CREDENTIALS.nationalId, DEV_ADMIN_CREDENTIALS.password);

    expect(authService.userRole()).toBe('SUPER_ADMIN');
    expect(navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    discardPeriodicTasks();
  }));

  it('still accepts the email as the identifier', fakeAsync(() => {
    submit(DEV_ADMIN_CREDENTIALS.email, DEV_ADMIN_CREDENTIALS.password);

    expect(authService.userRole()).toBe('SUPER_ADMIN');
    discardPeriodicTasks();
  }));

  it('signs a limited admin in with only the sections granted to them', fakeAsync(() => {
    const [admin] = SEEDED_ADMINS;
    submit(admin.nationalId, DEV_SEEDED_ADMIN_PASSWORD);

    expect(authService.userRole()).toBe('ADMIN');
    expect(authService.canAccessAdminSection('students')).toBeTrue();
    expect(authService.canAccessAdminSection('honor-roll')).toBeFalse();
    discardPeriodicTasks();
  }));

  it('refuses a suspended admin even with the right password', fakeAsync(() => {
    const [admin] = SEEDED_ADMINS;
    TestBed.inject(AdminAccountsStore).setStatus(admin.id, 'SUSPENDED');
    submit(admin.nationalId, DEV_SEEDED_ADMIN_PASSWORD);

    expect(component.errorMessage()).toContain('تم إيقاف هذا الحساب');
    expect(authService.currentUser()).toBeNull();

    TestBed.inject(AdminAccountsStore).setStatus(admin.id, 'ACTIVE');
    discardPeriodicTasks();
  }));

  it('shows one generic message for wrong credentials and clears the password', fakeAsync(() => {
    submit(DEV_ADMIN_CREDENTIALS.email, 'wrong-password');

    expect(component.errorMessage()).toBe('بيانات الدخول أو كلمة المرور غير صحيحة.');
    expect(component.attemptsLeft()).toBe(MAX_ATTEMPTS - 1);
    expect(component.loginForm.controls.password.value).toBe('');
    expect(authService.currentUser()).toBeNull();
    discardPeriodicTasks();
  }));

  it('locks the form after too many failed attempts', fakeAsync(() => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      submit('someone@school.edu.eg', 'wrong-password');
    }

    expect(component.isLocked()).toBeTrue();

    // Further attempts are ignored while locked
    submit(DEV_ADMIN_CREDENTIALS.email, DEV_ADMIN_CREDENTIALS.password);
    expect(authService.currentUser()).toBeNull();
    discardPeriodicTasks();
  }));

  it('rejects a valid account that is not an admin, without signing it in', fakeAsync(() => {
    submit(DEV_TEACHER_CREDENTIALS.email, DEV_TEACHER_CREDENTIALS.password);

    expect(component.errorMessage()).toContain('ليس من حسابات إدارة المدرسة');
    expect(authService.currentUser()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it('confirms a password reset request without revealing whether the email exists', fakeAsync(() => {
    component.openForgot();
    component.forgotForm.setValue({ email: 'unknown@school.edu.eg' });
    component.submitForgot();
    tick(MOCK_DELAY);

    expect(component.mode()).toBe('forgot-sent');
    discardPeriodicTasks();
  }));
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { NgForm } from '@angular/forms';
import { loginAs, provideTestDefaults } from '../../../../testing/test-helpers';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { AccountSettingsDialogComponent } from './account-settings-dialog.component';

const ME = 'http://localhost:5000/api/v1/auth/me';
const CHANGE_PASSWORD = 'http://localhost:5000/api/v1/auth/change-password';

const serverUser = {
  id: 'sup', fullName: 'أ. عبدالله أحمد علي', nationalId: '28001011234567', email: 'admin@school.com',
  phone: '01000000001', jobTitle: 'مدير المدرسة', role: 'SUPER_ADMIN', status: 'ACTIVE', permissions: []
};

function validForm(): NgForm {
  return { invalid: false, controls: {}, resetForm: () => {} } as unknown as NgForm;
}

describe('AccountSettingsDialogComponent', () => {
  let fixture: ComponentFixture<AccountSettingsDialogComponent>;
  let component: AccountSettingsDialogComponent;
  let http: HttpTestingController;

  async function open(role: UserRole): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AccountSettingsDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs(role);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccountSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.removeItem('sch_user_profile');
  });

  it('loads the latest details of an admin account', async () => {
    await open('SUPER_ADMIN');
    http.expectOne(ME).flush({ status: 'success', user: serverUser });

    expect(component.tab()).toBe('profile');
    expect(component.profile.jobTitle).toBe('مدير المدرسة');
    expect(component.identifierChanged).toBeFalse();
  });

  it('saves details without a password when the sign-in identifiers stay the same', async () => {
    await open('SUPER_ADMIN');
    http.expectOne(ME).flush({ status: 'success', user: serverUser });

    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    component.profile.fullName = 'أ. عبدالله أحمد علي حسن';
    component.saveProfile(validForm());

    const req = http.expectOne(ME);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.currentPassword).toBeUndefined();

    // Locked while the request is in flight: a second click sends nothing
    expect(component.lock.busy()).toBeTrue();
    component.saveProfile(validForm());
    http.expectNone(ME);

    req.flush({ status: 'success', user: { ...serverUser, fullName: 'أ. عبدالله أحمد علي حسن' } });

    expect(TestBed.inject(AuthService).userName()).toBe('أ. عبدالله أحمد علي حسن');
    // The header closes the dialog and shows this confirmation
    expect(saved).toHaveBeenCalledWith('تم حفظ بيانات الحساب.');
  });

  it('sends the current password when the national ID changes, and shows a wrong one', async () => {
    await open('SUPER_ADMIN');
    http.expectOne(ME).flush({ status: 'success', user: serverUser });

    component.profile.nationalId = '27001011234567';
    component.profile.currentPassword = 'wrong';
    expect(component.identifierChanged).toBeTrue();
    component.saveProfile(validForm());

    const req = http.expectOne(ME);
    expect(req.request.body).toEqual(jasmine.objectContaining({ nationalId: '27001011234567', currentPassword: 'wrong' }));
    req.flush({ message: 'كلمة المرور الحالية غير صحيحة' }, { status: 400, statusText: 'Bad Request' });

    expect(component.error()).toBe('كلمة المرور الحالية غير صحيحة');
    // Unlocked again so the user can fix it, and the session is kept
    expect(component.lock.busy()).toBeFalse();
    expect(TestBed.inject(AuthService).currentUser()).not.toBeNull();
  });

  it('changes the password', async () => {
    await open('ADMIN');
    http.expectOne(ME).flush({ status: 'success', user: { ...serverUser, role: 'ADMIN' } });

    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    component.switchTab('password');
    component.passwords = { currentPassword: 'Admin@2026', newPassword: 'NewPass99', confirmPassword: 'NewPass99' };
    component.changePassword(validForm());

    const req = http.expectOne(CHANGE_PASSWORD);
    expect(req.request.body).toEqual({ currentPassword: 'Admin@2026', newPassword: 'NewPass99', confirmPassword: 'NewPass99' });
    req.flush({ status: 'success' });

    expect(saved).toHaveBeenCalledWith(jasmine.stringContaining('تم تغيير كلمة المرور'));
  });

  it('only offers the password tab to teachers', async () => {
    await open('TEACHER');
    http.expectNone(ME);

    expect(component.canEditProfile()).toBeFalse();
    expect(component.tab()).toBe('password');
  });
});

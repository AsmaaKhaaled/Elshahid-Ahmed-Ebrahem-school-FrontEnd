import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { AdminAccountDto } from '../../core/admin/admin-account.model';
import { AdminsComponent } from './admins.component';

const API = 'http://localhost:5000/api/v1/admin/admins';

const admin: AdminAccountDto = {
  id: 'adm-1', fullName: 'أ. محمد سعيد حسن', email: null, nationalId: '27805121234561', role: 'ADMIN',
  status: 'ACTIVE', permissions: ['students'], phone: null, jobTitle: null, createdAt: '2026-10-31T00:00:00.000Z'
};

describe('AdminsComponent', () => {
  let component: AdminsComponent;
  let fixture: ComponentFixture<AdminsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminsComponent],
      providers: provideTestDefaults()
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the accounts from the backend', () => {
    expect(component.loading()).toBeTrue();
    http.expectOne(API).flush({ data: { admins: [admin] } });

    expect(component.loading()).toBeFalse();
    expect(component.accounts().length).toBe(1);
  });

  it('shows a retry when the list cannot be loaded', () => {
    http.expectOne(API).error(new ProgressEvent('error'));
    expect(component.loadError()).toContain('تعذر الاتصال بالخادم');

    component.reload();
    http.expectOne(API).flush({ data: { admins: [] } });
    expect(component.loadError()).toBeNull();
  });

  it('suspends an admin', () => {
    http.expectOne(API).flush({ data: { admins: [admin] } });

    component.toggleStatus(component.accounts()[0]);
    http.expectOne(`${API}/adm-1/status`).flush({ data: { admin: { ...admin, status: 'SUSPENDED' } } });

    expect(component.accounts()[0].status).toBe('SUSPENDED');
    expect(component.notice()).toContain('تم إيقاف');
  });

  it('keeps the dialog open with the backend message when the national ID is taken', () => {
    http.expectOne(API).flush({ data: { admins: [] } });
    component.openForm(null);

    component.saveAdmin({ account: { ...admin, nationalId: '27805121234561', jobTitle: '', phone: '', permissions: ['students'], status: 'ACTIVE' }, password: 'Control2026' });
    http.expectOne(API).flush({ message: 'الرقم القومي مسجل بالفعل لمستخدم آخر' }, { status: 409, statusText: 'Conflict' });

    expect(component.showForm()).toBeTrue();
    expect(component.formError()).toBe('الرقم القومي مسجل بالفعل لمستخدم آخر');
  });

  it('masks the national ID in the list', () => {
    http.expectOne(API).flush({ data: { admins: [] } });
    expect(component.maskNationalId('28001011234567')).toBe('2800•••••••567');
    expect(component.maskNationalId('')).toBe('—');
  });
});

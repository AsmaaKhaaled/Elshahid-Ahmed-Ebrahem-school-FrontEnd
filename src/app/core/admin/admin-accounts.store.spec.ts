import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAccount, AdminAccountDto } from './admin-account.model';
import { AdminAccountsStore } from './admin-accounts.store';

const API = 'http://localhost:5000/api/v1/admin/admins';

function dto(overrides: Partial<AdminAccountDto> = {}): AdminAccountDto {
  return {
    id: 'adm-1',
    fullName: 'أ. محمد سعيد حسن',
    email: null,
    nationalId: '27805121234561',
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: ['students'],
    phone: null,
    jobTitle: 'وكيل شؤون الطلاب',
    createdAt: '2026-10-31T00:00:00.000Z',
    ...overrides
  };
}

const account: AdminAccount = {
  id: 'adm-1',
  fullName: 'أ. محمد سعيد حسن',
  nationalId: '27805121234561',
  jobTitle: 'وكيل شؤون الطلاب',
  phone: '',
  role: 'ADMIN',
  permissions: ['students', 'exams'],
  status: 'ACTIVE',
  createdAt: '2026-10-31T00:00:00.000Z'
};

describe('AdminAccountsStore', () => {
  let store: AdminAccountsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(AdminAccountsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the accounts and maps empty backend fields to blanks', () => {
    store.load().subscribe();
    http.expectOne(API).flush({ data: { admins: [dto({ role: 'SUPER_ADMIN', id: 'sup' }), dto({ nationalId: null, status: 'INACTIVE' })] } });

    const [superAdmin, legacy] = store.accounts();
    expect(superAdmin.role).toBe('SUPER_ADMIN');
    expect(legacy.nationalId).toBe('');
    expect(legacy.phone).toBe('');
    expect(legacy.status).toBe('SUSPENDED');
    expect(store.activeCount()).toBe(1);
  });

  it('creates an admin with the password, without sending an id', () => {
    store.createAdmin({ ...account, id: 'local-id' }, 'Control2026').subscribe();

    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fullName: account.fullName,
      nationalId: account.nationalId,
      jobTitle: account.jobTitle,
      phone: '',
      permissions: ['students', 'exams'],
      password: 'Control2026'
    });
    req.flush({ data: { admin: dto({ permissions: ['students', 'exams'] }) } });

    expect(store.accounts().map(a => a.id)).toEqual(['adm-1']);
  });

  it('saves profile, then permissions, then resets the password only when one is given', () => {
    store.accounts.set([{ ...account, permissions: ['students'] }]);
    store.updateAdmin(account, 'NewPass99').subscribe();

    const profile = http.expectOne(`${API}/adm-1`);
    expect(profile.request.method).toBe('PATCH');
    expect(profile.request.body.permissions).toBeUndefined();
    profile.flush({ data: { admin: dto() } });

    const permissions = http.expectOne(`${API}/adm-1/permissions`);
    expect(permissions.request.body).toEqual({ permissions: ['students', 'exams'] });
    permissions.flush({ data: { admin: dto({ permissions: ['students', 'exams'] }) } });

    const reset = http.expectOne(`${API}/adm-1/reset-password`);
    expect(reset.request.body).toEqual({ newPassword: 'NewPass99' });
    reset.flush({ status: 'success' });

    expect(store.accounts()[0].permissions).toEqual(['students', 'exams']);
  });

  it('skips the password reset when editing without one', () => {
    store.updateAdmin(account).subscribe();
    http.expectOne(`${API}/adm-1`).flush({ data: { admin: dto() } });
    http.expectOne(`${API}/adm-1/permissions`).flush({ data: { admin: dto() } });
    http.expectNone(`${API}/adm-1/reset-password`);
  });

  it('updates the status and removes deleted accounts', () => {
    store.accounts.set([account]);

    store.setStatus('adm-1', 'SUSPENDED').subscribe();
    const status = http.expectOne(`${API}/adm-1/status`);
    expect(status.request.body).toEqual({ status: 'SUSPENDED' });
    status.flush({ data: { admin: dto({ status: 'SUSPENDED' }) } });
    expect(store.accounts()[0].status).toBe('SUSPENDED');

    store.deleteAdmin('adm-1').subscribe();
    const del = http.expectOne(`${API}/adm-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ status: 'success' });
    expect(store.accounts()).toEqual([]);
  });

  it('keeps the list unchanged when the backend refuses a change', () => {
    store.accounts.set([account]);
    store.setStatus('adm-1', 'SUSPENDED').subscribe({ error: () => {} });
    http.expectOne(`${API}/adm-1/status`).flush({ message: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(store.accounts()[0].status).toBe('ACTIVE');
  });

  it('detects a national ID already used by another account', () => {
    store.accounts.set([account]);
    expect(store.isNationalIdTaken(account.nationalId)).toBeTrue();
    expect(store.isNationalIdTaken(account.nationalId, account.id)).toBeFalse();
  });
});

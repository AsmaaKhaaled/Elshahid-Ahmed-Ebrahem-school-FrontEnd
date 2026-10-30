import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { mockAdminLogin } from '../auth/dev-auth.mock';
import { AdminAccount } from './admin-account.model';
import { AdminAccountsStore } from './admin-accounts.store';

function newAdmin(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    id: `adm-test-${crypto.randomUUID()}`,
    fullName: 'أ. مسؤول تجريبي',
    nationalId: '29001011234599',
    jobTitle: 'مسؤول الكنترول',
    phone: '',
    role: 'ADMIN',
    permissions: ['exams'],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe('AdminAccountsStore', () => {
  let store: AdminAccountsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AdminAccountsStore);
  });

  it('lists the super admin first, with the demo admins', () => {
    expect(store.accounts()[0].role).toBe('SUPER_ADMIN');
    expect(store.accounts().length).toBeGreaterThan(1);
  });

  it('lets a new admin sign in with their national ID and the password set for them', async () => {
    const admin = newAdmin();
    store.saveAdmin(admin, 'Control2026');

    const res = await firstValueFrom(mockAdminLogin({ identifier: admin.nationalId, password: 'Control2026' }));
    expect(res.user.role).toBe('ADMIN');
    expect(res.user.permissions).toEqual(['exams']);
    store.deleteAdmin(admin.id);
  });

  it('keeps the current password when an admin is edited without a reset', async () => {
    const admin = newAdmin();
    store.saveAdmin(admin, 'Control2026');
    store.saveAdmin({ ...admin, permissions: ['exams', 'students'] });

    const res = await firstValueFrom(mockAdminLogin({ identifier: admin.nationalId, password: 'Control2026' }));
    expect(res.user.permissions).toEqual(['exams', 'students']);
    store.deleteAdmin(admin.id);
  });

  it('blocks a deleted admin from signing in', async () => {
    const admin = newAdmin();
    store.saveAdmin(admin, 'Control2026');
    store.deleteAdmin(admin.id);

    await expectAsync(firstValueFrom(mockAdminLogin({ identifier: admin.nationalId, password: 'Control2026' })))
      .toBeRejected();
    expect(store.accounts().some(a => a.id === admin.id)).toBeFalse();
  });

  it('never lets the super admin account be changed, suspended or deleted from the store', () => {
    const superAdmin = store.accounts()[0];
    store.setStatus(superAdmin.id, 'SUSPENDED');
    store.deleteAdmin(superAdmin.id);

    expect(store.accounts()[0]).toEqual(superAdmin);
  });

  it('detects a national ID already used by another account', () => {
    const [superAdmin, firstAdmin] = store.accounts();
    expect(store.isNationalIdTaken(superAdmin.nationalId)).toBeTrue();
    expect(store.isNationalIdTaken(firstAdmin.nationalId, firstAdmin.id)).toBeFalse();
  });
});

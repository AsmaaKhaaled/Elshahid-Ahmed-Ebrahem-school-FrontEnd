import { Injectable, computed, isDevMode, signal } from '@angular/core';
import { DEV_SUPER_ADMIN, removeDevAccount, upsertDevAccount } from '../auth/dev-auth.mock';
import { AdminAccount, AdminAccountStatus, adminAccountToUser } from './admin-account.model';
import { SEEDED_ADMINS } from './admin-accounts.seed';

/**
 * School administration accounts, managed by the SUPER_ADMIN only.
 * Passwords are never kept here: they're handed to the auth backend
 * (the dev auth mock while developing) when an account is created or reset.
 */
@Injectable({ providedIn: 'root' })
export class AdminAccountsStore {
  readonly accounts = signal<AdminAccount[]>([
    {
      id: DEV_SUPER_ADMIN.id,
      fullName: DEV_SUPER_ADMIN.fullName,
      nationalId: DEV_SUPER_ADMIN.nationalId,
      jobTitle: 'مدير المدرسة',
      phone: '',
      role: 'SUPER_ADMIN',
      permissions: [],
      status: 'ACTIVE',
      createdAt: DEV_SUPER_ADMIN.createdAt
    },
    ...SEEDED_ADMINS
  ]);

  readonly activeCount = computed(() => this.accounts().filter(a => a.status === 'ACTIVE').length);

  isNationalIdTaken(nationalId: string, exceptId?: string): boolean {
    return this.accounts().some(a => a.nationalId === nationalId && a.id !== exceptId);
  }

  /** Creates or updates an admin. A password is required on create and optional on update (= reset). */
  saveAdmin(account: AdminAccount, password?: string): void {
    if (account.role === 'SUPER_ADMIN') return;
    this.accounts.update(list =>
      list.some(a => a.id === account.id)
        ? list.map(a => (a.id === account.id ? account : a))
        : [...list, account]
    );
    this.syncLoginAccount(account, password);
  }

  setStatus(accountId: string, status: AdminAccountStatus): void {
    const account = this.accounts().find(a => a.id === accountId);
    if (account && account.role !== 'SUPER_ADMIN') {
      this.saveAdmin({ ...account, status });
    }
  }

  deleteAdmin(accountId: string): void {
    if (this.accounts().find(a => a.id === accountId)?.role === 'SUPER_ADMIN') return;
    this.accounts.update(list => list.filter(a => a.id !== accountId));
    if (isDevMode()) {
      removeDevAccount(accountId);
    }
  }

  // TODO(backend): replace with POST/PUT /admins (the backend hashes the password)
  private syncLoginAccount(account: AdminAccount, password?: string): void {
    if (isDevMode()) {
      upsertDevAccount(adminAccountToUser(account), password);
    }
  }
}

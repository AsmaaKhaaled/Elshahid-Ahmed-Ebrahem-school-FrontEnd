import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, concatMap, map, of, tap } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AdminAccount, AdminAccountDto, AdminAccountStatus, adminAccountFromDto } from './admin-account.model';

interface AdminResponse {
  data: { admin: AdminAccountDto };
}

/**
 * School administration accounts, managed by the SUPER_ADMIN only (backend: /api/v1/admin/admins).
 * Passwords are never kept here: they're sent once to the backend, which hashes them.
 */
@Injectable({ providedIn: 'root' })
export class AdminAccountsStore {
  private readonly api = inject(ApiService);

  readonly accounts = signal<AdminAccount[]>([]);

  readonly activeCount = computed(() => this.accounts().filter(a => a.status === 'ACTIVE').length);

  isNationalIdTaken(nationalId: string, exceptId?: string): boolean {
    return this.accounts().some(a => a.nationalId === nationalId && a.id !== exceptId);
  }

  /** Loads all accounts (the super admin first). */
  load(): Observable<AdminAccount[]> {
    return this.api.get<{ data: { admins: AdminAccountDto[] } }>('admin/admins').pipe(
      map(res => res.data.admins.map(adminAccountFromDto)),
      tap(accounts => this.accounts.set(accounts))
    );
  }

  /** Creates an admin (password required). */
  createAdmin(account: AdminAccount, password: string): Observable<AdminAccount> {
    return this.api.post<AdminResponse>('admin/admins', { ...this.profileBody(account), permissions: account.permissions, password }).pipe(
      map(res => adminAccountFromDto(res.data.admin)),
      tap(created => this.accounts.update(list => [...list, created]))
    );
  }

  /** Saves profile & permissions of an existing admin, and resets the password when one is given. */
  updateAdmin(account: AdminAccount, password?: string): Observable<AdminAccount> {
    const id = encodeURIComponent(account.id);
    return this.api.patch<AdminResponse>(`admin/admins/${id}`, this.profileBody(account)).pipe(
      concatMap(() => this.api.patch<AdminResponse>(`admin/admins/${id}/permissions`, { permissions: account.permissions })),
      concatMap(res => (password
        ? this.api.patch(`admin/admins/${id}/reset-password`, { newPassword: password }).pipe(map(() => res))
        : of(res))),
      map(res => adminAccountFromDto(res.data.admin)),
      tap(updated => this.replace(updated))
    );
  }

  setStatus(accountId: string, status: AdminAccountStatus): Observable<AdminAccount> {
    return this.api.patch<AdminResponse>(`admin/admins/${encodeURIComponent(accountId)}/status`, { status }).pipe(
      map(res => adminAccountFromDto(res.data.admin)),
      tap(updated => this.replace(updated))
    );
  }

  deleteAdmin(accountId: string): Observable<void> {
    return this.api.delete<unknown>(`admin/admins/${encodeURIComponent(accountId)}`).pipe(
      map(() => undefined),
      tap(() => this.accounts.update(list => list.filter(a => a.id !== accountId)))
    );
  }

  private profileBody(account: AdminAccount) {
    return {
      fullName: account.fullName,
      nationalId: account.nationalId,
      jobTitle: account.jobTitle,
      phone: account.phone
    };
  }

  private replace(updated: AdminAccount): void {
    this.accounts.update(list => list.map(a => (a.id === updated.id ? updated : a)));
  }
}

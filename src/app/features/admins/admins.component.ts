import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminAccount } from '../../core/admin/admin-account.model';
import { AdminAccountsStore } from '../../core/admin/admin-accounts.store';
import { permissionLabel } from '../../core/admin/admin-permissions';
import { AdminFormDialogComponent, AdminFormResult } from './admin-form-dialog.component';

// Permission chips shown per row before collapsing into "+N"
const VISIBLE_PERMISSIONS = 3;

/** "المسؤولون والصلاحيات" - SUPER_ADMIN only (see the admins route). */
@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [AdminFormDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.css'
})
export class AdminsComponent {
  private readonly store = inject(AdminAccountsStore);

  readonly accounts = this.store.accounts;
  readonly activeCount = this.store.activeCount;
  readonly suspendedCount = computed(() => this.accounts().length - this.activeCount());
  readonly visiblePermissions = VISIBLE_PERMISSIONS;
  readonly permissionLabel = permissionLabel;

  readonly showForm = signal(false);
  readonly editingAdmin = signal<AdminAccount | null>(null);
  readonly notice = signal<string | null>(null);

  // National IDs the account being edited must not reuse
  readonly takenNationalIds = computed(() => {
    const editingId = this.editingAdmin()?.id;
    return this.accounts().filter(a => a.id !== editingId).map(a => a.nationalId);
  });

  openForm(admin: AdminAccount | null): void {
    this.editingAdmin.set(admin);
    this.showForm.set(true);
  }

  saveAdmin({ account, password }: AdminFormResult): void {
    const isNew = !this.accounts().some(a => a.id === account.id);
    this.store.saveAdmin(account, password);
    this.showForm.set(false);
    this.notice.set(
      isNew
        ? `تم إنشاء حساب ${account.fullName}. يقدر يدخل الآن من صفحة دخول الإدارة بالرقم القومي وكلمة المرور.`
        : password
          ? `تم حفظ التعديلات وتغيير كلمة مرور ${account.fullName}.`
          : `تم حفظ تعديلات ${account.fullName}. الصلاحيات الجديدة تُطبق من أول تسجيل دخول له.`
    );
  }

  deleteAdmin(accountId: string): void {
    this.store.deleteAdmin(accountId);
    this.showForm.set(false);
    this.notice.set('تم حذف حساب المسؤول.');
  }

  toggleStatus(account: AdminAccount): void {
    const status = account.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.store.setStatus(account.id, status);
    this.notice.set(status === 'SUSPENDED' ? `تم إيقاف حساب ${account.fullName}.` : `تم تفعيل حساب ${account.fullName}.`);
  }

  // e.g. 28001011234567 -> 2800•••••••567 (the full ID is visible in the edit dialog)
  maskNationalId(nationalId: string): string {
    return `${nationalId.slice(0, 4)}•••••••${nationalId.slice(-3)}`;
  }
}

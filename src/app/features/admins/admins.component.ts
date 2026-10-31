import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingAdmin = signal<AdminAccount | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  // Row whose status change is in flight
  readonly pendingId = signal<string | null>(null);

  // National IDs the account being edited must not reuse
  readonly takenNationalIds = computed(() => {
    const editingId = this.editingAdmin()?.id;
    return this.accounts().filter(a => a.id !== editingId).map(a => a.nationalId);
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.store.load().subscribe({
      next: () => this.loading.set(false),
      error: err => {
        this.loading.set(false);
        this.loadError.set(errorMessage(err, 'تعذر تحميل حسابات المسؤولين.'));
      }
    });
  }

  openForm(admin: AdminAccount | null): void {
    this.editingAdmin.set(admin);
    this.formError.set(null);
    this.showForm.set(true);
  }

  saveAdmin({ account, password }: AdminFormResult): void {
    const isNew = !this.editingAdmin();
    const request$ = isNew ? this.store.createAdmin(account, password ?? '') : this.store.updateAdmin(account, password);

    this.saving.set(true);
    this.formError.set(null);
    request$.subscribe({
      next: saved => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set(
          isNew
            ? `تم إنشاء حساب ${saved.fullName}. يقدر يدخل الآن من صفحة دخول الإدارة بالرقم القومي وكلمة المرور.`
            : password
              ? `تم حفظ التعديلات وتغيير كلمة مرور ${saved.fullName}.`
              : `تم حفظ تعديلات ${saved.fullName}. الصلاحيات الجديدة تُطبق من أول تسجيل دخول له.`
        );
      },
      error: err => {
        this.saving.set(false);
        // The dialog stays open so nothing typed is lost
        this.formError.set(errorMessage(err, 'تعذر حفظ بيانات المسؤول.'));
      }
    });
  }

  deleteAdmin(accountId: string): void {
    this.saving.set(true);
    this.formError.set(null);
    this.store.deleteAdmin(accountId).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set('تم حذف حساب المسؤول.');
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(errorMessage(err, 'تعذر حذف حساب المسؤول.'));
      }
    });
  }

  toggleStatus(account: AdminAccount): void {
    const status = account.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.pendingId.set(account.id);
    this.actionError.set(null);
    this.store.setStatus(account.id, status).subscribe({
      next: () => {
        this.pendingId.set(null);
        this.notice.set(status === 'SUSPENDED' ? `تم إيقاف حساب ${account.fullName}.` : `تم تفعيل حساب ${account.fullName}.`);
      },
      error: err => {
        this.pendingId.set(null);
        this.actionError.set(errorMessage(err, 'تعذر تغيير حالة الحساب.'));
      }
    });
  }

  // e.g. 28001011234567 -> 2800•••••••567 (the full ID is visible in the edit dialog)
  maskNationalId(nationalId: string): string {
    return nationalId ? `${nationalId.slice(0, 4)}•••••••${nationalId.slice(-3)}` : '—';
  }
}

// Conflict messages (duplicate national ID / email) come from the backend in Arabic; the rest get a generic one
function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  if (err.status === 409 && err.error?.message) return err.error.message;
  if (err.status === 422) return 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.';
  if (err.status === 403) return 'هذه الصفحة لمدير المدرسة فقط.';
  return fallback;
}

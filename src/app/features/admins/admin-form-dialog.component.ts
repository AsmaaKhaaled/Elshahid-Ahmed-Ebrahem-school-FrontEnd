import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ADMIN_PASSWORD_PATTERN, AdminAccount } from '../../core/admin/admin-account.model';
import { ADMIN_PERMISSIONS, AdminPermission } from '../../core/admin/admin-permissions';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';

export interface AdminFormResult {
  account: AdminAccount;
  // Set on create, and on edit only when the super admin resets the password
  password?: string;
}

@Component({
  selector: 'app-admin-form-dialog',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, PortalToBodyDirective, SubmitLockDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-form-dialog.component.html',
  styleUrl: './admin-form-dialog.component.css'
})
export class AdminFormDialogComponent implements OnInit {
  // null = add mode
  readonly admin = input<AdminAccount | null>(null);
  // National IDs already used by other accounts (must be unique - it's the login identifier)
  readonly takenNationalIds = input<string[]>([]);
  // Set by the page while the request is in flight / when the backend refuses it
  readonly saving = input(false);
  readonly serverError = input<string | null>(null);
  readonly saved = output<AdminFormResult>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly allPermissions = ADMIN_PERMISSIONS;
  readonly passwordPattern = ADMIN_PASSWORD_PATTERN;
  readonly confirmingDelete = signal(false);
  readonly showPassword = signal(false);
  // On edit, the password fields only appear when the super admin chooses to reset it
  readonly resettingPassword = signal(false);
  readonly permissions = signal<Set<AdminPermission>>(new Set());
  readonly permissionsTouched = signal(false);
  // Locked from the click until the page closes the dialog (or the backend refuses the change)
  readonly lock = submitLock({ saving: this.saving, error: this.serverError });

  readonly isEdit = computed(() => !!this.admin());
  readonly showPasswordFields = computed(() => !this.isEdit() || this.resettingPassword());
  readonly allSelected = computed(() => this.permissions().size === ADMIN_PERMISSIONS.length);

  draft: AdminAccount = {
    id: '',
    fullName: '',
    nationalId: '',
    jobTitle: '',
    phone: '',
    role: 'ADMIN',
    permissions: [],
    status: 'ACTIVE',
    createdAt: ''
  };
  password = '';
  confirmPassword = '';

  ngOnInit(): void {
    const admin = this.admin();
    if (admin) {
      this.draft = { ...admin };
      this.permissions.set(new Set(admin.permissions));
    }
  }

  togglePermission(permission: AdminPermission, checked: boolean): void {
    this.permissionsTouched.set(true);
    this.permissions.update(current => {
      const next = new Set(current);
      checked ? next.add(permission) : next.delete(permission);
      return next;
    });
  }

  toggleAll(checked: boolean): void {
    this.permissionsTouched.set(true);
    this.permissions.set(new Set(checked ? ADMIN_PERMISSIONS.map(p => p.key) : []));
  }

  save(form: NgForm): void {
    if (this.lock.busy()) return;
    this.permissionsTouched.set(true);
    this.validateCrossFields(form);
    if (form.invalid || this.permissions().size === 0) {
      form.control.markAllAsTouched();
      return;
    }

    // Keep the permissions in the same order as the sidebar
    const permissions = ADMIN_PERMISSIONS.map(p => p.key).filter(key => this.permissions().has(key));
    this.lock.run(() =>
      this.saved.emit({
        account: {
          ...this.draft,
          id: this.draft.id || crypto.randomUUID(),
          fullName: this.draft.fullName.trim(),
          jobTitle: this.draft.jobTitle.trim(),
          permissions,
          createdAt: this.draft.createdAt || new Date().toISOString()
        },
        password: this.showPasswordFields() ? this.password : undefined
      })
    );
  }

  confirmDelete(): void {
    this.lock.run(() => this.deleted.emit(this.draft.id));
  }

  // Checks that need more than one field: unique national ID & matching passwords
  private validateCrossFields(form: NgForm): void {
    const nationalId = form.controls['nationalId'];
    if (nationalId && this.takenNationalIds().includes(this.draft.nationalId)) {
      nationalId.setErrors({ ...nationalId.errors, taken: true });
    }
    const confirm = form.controls['confirmPassword'];
    if (confirm && this.confirmPassword !== this.password) {
      confirm.setErrors({ ...confirm.errors, mismatch: true });
    }
  }
}

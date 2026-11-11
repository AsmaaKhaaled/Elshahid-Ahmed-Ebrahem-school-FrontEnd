import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ADMIN_PASSWORD_PATTERN, AdminAccount } from '../../core/admin/admin-account.model';
import { ADMIN_PERMISSIONS, AdminPermission } from '../../core/admin/admin-permissions';
import { PortalToBodyDirective } from '../../shared/directives/portal-to-body.directive';
import { SubmitLockDirective, submitLock } from '../../shared/directives/submit-lock.directive';
import { Teacher } from '../teachers/teacher.model';
import { TeachersStore } from '../teachers/teachers.store';

export interface AdminFormResult {
  account: AdminAccount;
  // Set on create, and on edit only when the super admin resets the password
  password?: string;
}

@Component({
  selector: 'app-admin-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    PortalToBodyDirective,
    SubmitLockDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-form-dialog.component.html',
  styleUrl: './admin-form-dialog.component.css'
})
export class AdminFormDialogComponent implements OnInit {
  private readonly teachersStore = inject(TeachersStore);

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

  // Autocomplete search query for teachers
  readonly teacherSearch = signal('');

  // Suggested teachers for autocomplete (searches by name, national ID, phone, job title, specialization)
  readonly filteredTeachers = computed<Teacher[]>(() => {
    const query = this.teacherSearch().trim().toLowerCase();
    const all = this.teachersStore.teachers();
    if (!query) {
      return all.filter(t => t.active).slice(0, 15);
    }
    return all
      .filter(t => t.active && (
        t.name.toLowerCase().includes(query) ||
        t.nationalId.includes(query) ||
        t.phone.includes(query) ||
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.specialization && t.specialization.toLowerCase().includes(query))
      ))
      .slice(0, 15);
  });

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
    this.teachersStore.ensureLoaded();

    const admin = this.admin();
    if (admin) {
      this.draft = { ...admin };
      this.permissions.set(new Set(admin.permissions));
      this.teacherSearch.set(admin.fullName);
    }
  }

  onNameInput(value: string | Teacher): void {
    const name = typeof value === 'string' ? value : value?.name || '';
    this.draft.fullName = name;
    this.teacherSearch.set(name);
  }

  onNameFocus(): void {
    this.teacherSearch.set(this.draft.fullName || '');
  }

  displayTeacher = (val: string | Teacher | null | undefined): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.name || '';
  };

  onTeacherSelected(event: MatAutocompleteSelectedEvent): void {
    const teacher = event.option.value as Teacher;
    if (!teacher) return;

    this.draft.fullName = teacher.name;
    this.teacherSearch.set(teacher.name);

    if (teacher.nationalId) {
      this.draft.nationalId = teacher.nationalId;
    }
    if (teacher.phone) {
      this.draft.phone = teacher.phone;
    }

    const defaultTitle = teacher.title
      ? teacher.title
      : (teacher.specialization ? `معلم ${teacher.specialization}` : 'عضو هيئة تدريس');
    this.draft.jobTitle = defaultTitle;
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

    const fullName = (typeof this.draft.fullName === 'string' ? this.draft.fullName : (this.draft.fullName as any)?.name ?? '').trim();
    const jobTitle = (typeof this.draft.jobTitle === 'string' ? this.draft.jobTitle : '').trim();

    // Keep the permissions in the same order as the sidebar
    const permissions = ADMIN_PERMISSIONS.map(p => p.key).filter(key => this.permissions().has(key));
    this.lock.run(() =>
      this.saved.emit({
        account: {
          ...this.draft,
          id: this.draft.id || crypto.randomUUID(),
          fullName,
          jobTitle,
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

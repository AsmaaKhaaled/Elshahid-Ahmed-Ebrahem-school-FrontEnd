import { AdminPermission } from './admin-permissions';

export type AdminAccountRole = 'SUPER_ADMIN' | 'ADMIN';
export type AdminAccountStatus = 'ACTIVE' | 'SUSPENDED';

/** A school administration account, as listed in "المسؤولون والصلاحيات" (no password here). */
export interface AdminAccount {
  id: string;
  fullName: string;
  nationalId: string;
  jobTitle: string;
  phone: string;
  role: AdminAccountRole;
  // Ignored for the SUPER_ADMIN, who has full access
  permissions: AdminPermission[];
  status: AdminAccountStatus;
  createdAt: string;
}

// At least 8 characters with letters and digits (the backend enforces the same rule)
export const ADMIN_PASSWORD_PATTERN = '(?=.*[A-Za-z])(?=.*\\d).{8,}';

/** An admin as returned by GET/POST/PATCH /api/v1/admin/admins */
export interface AdminAccountDto {
  id: string;
  fullName: string;
  email: string | null;
  nationalId: string | null;
  role: AdminAccountRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  permissions: string[];
  phone: string | null;
  jobTitle: string | null;
  createdAt: string;
}

export function adminAccountFromDto(dto: AdminAccountDto): AdminAccount {
  return {
    id: dto.id,
    fullName: dto.fullName,
    nationalId: dto.nationalId ?? '',
    jobTitle: dto.jobTitle ?? '',
    phone: dto.phone ?? '',
    role: dto.role,
    permissions: dto.permissions as AdminPermission[],
    // INACTIVE accounts can't sign in either - shown (and re-activated) like suspended ones
    status: dto.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
    createdAt: dto.createdAt
  };
}

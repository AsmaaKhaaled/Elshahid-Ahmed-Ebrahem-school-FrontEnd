import { SCHOOL_INFO } from '../constants/school.constants';
import { User } from '../models/user.model';
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

// At least 8 characters with letters and digits
export const ADMIN_PASSWORD_PATTERN = '(?=.*[A-Za-z])(?=.*\\d).{8,}';

export function adminAccountToUser(account: AdminAccount): User {
  return {
    id: account.id,
    nationalId: account.nationalId,
    fullName: account.fullName,
    email: '',
    phone: account.phone,
    role: account.role,
    permissions: account.role === 'ADMIN' ? account.permissions : undefined,
    status: account.status,
    mustChangePassword: false,
    schoolName: SCHOOL_INFO.fullName,
    createdAt: account.createdAt
  };
}

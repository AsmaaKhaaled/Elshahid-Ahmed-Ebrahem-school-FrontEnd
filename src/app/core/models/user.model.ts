import { AdminPermission } from '../admin/admin-permissions';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_ACTIVATION';

export interface User {
  id: string;
  nationalId: string;
  fullName: string;
  arabicName?: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  status: UserStatus;
  mustChangePassword: boolean;
  schoolId?: string;
  schoolName?: string;
  gradeLevel?: string;
  className?: string;
  subjects?: string[];
  // Admin sections an ADMIN may open (granted by the SUPER_ADMIN). SUPER_ADMIN ignores it - full access.
  permissions?: AdminPermission[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  specialization: string;
  hireDate: string;
  assignedClasses: string[];
  assignedSubjects: string[];
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentCode: string;
  gradeLevel: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  academicYear: string;
}


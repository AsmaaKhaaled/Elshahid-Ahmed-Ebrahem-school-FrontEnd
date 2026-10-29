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


import { AdminAccount } from './admin-account.model';

// Demo admins (until the admin accounts API exists). Their dev password is DEV_SEEDED_ADMIN_PASSWORD.
export const SEEDED_ADMINS: AdminAccount[] = [
  {
    id: 'adm-002',
    fullName: 'أ. محمد سعيد حسن',
    nationalId: '27805121234561',
    jobTitle: 'وكيل المدرسة لشؤون الطلاب',
    phone: '01001112233',
    role: 'ADMIN',
    permissions: ['students', 'classes', 'attendance-stats', 'announcements'],
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'adm-003',
    fullName: 'أ. أحمد فتحي عبد العظيم',
    nationalId: '28210201234562',
    jobTitle: 'مسؤول شؤون العاملين',
    phone: '01112223344',
    role: 'ADMIN',
    permissions: ['teachers', 'teacher-attendance'],
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z'
  }
];

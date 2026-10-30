/**
 * Sections of the admin panel a SUPER_ADMIN can grant to other admins.
 * Each key matches the admin route path (/admin/<key>), so routes, guards
 * and the sidebar all read the same list.
 * The dashboard is always available; managing admins is SUPER_ADMIN-only and never grantable.
 */
export const ADMIN_PERMISSIONS = [
  { key: 'students', label: 'شؤون الطلاب' },
  { key: 'teachers', label: 'هيئة التدريس' },
  { key: 'classes', label: 'الفصول الدراسية' },
  { key: 'assignments', label: 'الواجبات والتكليفات' },
  { key: 'exams', label: 'الاختبارات والتقييم' },
  { key: 'attendance-stats', label: 'إحصائية حضور وغياب الطلاب' },
  { key: 'teacher-attendance', label: 'دفتر حضور وغياب المعلمين' },
  { key: 'platform-activity', label: 'نشاط المستخدمين على المنصة' },
  { key: 'academic-year', label: 'العام والفصل الدراسي' },
  { key: 'announcements', label: 'لوحة الإعلانات والتعميمات' },
  { key: 'honor-roll', label: 'لوحة الشرف' }
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]['key'];

// Route-level marker for pages only the SUPER_ADMIN can open
export const SUPER_ADMIN_ONLY = 'super-admin-only';

export type AdminRouteAccess = AdminPermission | typeof SUPER_ADMIN_ONLY;

export function permissionLabel(permission: AdminPermission): string {
  return ADMIN_PERMISSIONS.find(p => p.key === permission)?.label ?? permission;
}

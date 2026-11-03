import { HttpErrorResponse } from '@angular/common/http';

/** A class the admin assigned to the signed-in teacher (GET /teachers/me/classes) */
export interface MyClass {
  id: string;
  name: string;
  displayNameArabic: string;
  gradeLevel: string;
  roomNumber: string;
  capacity: number;
  studentCount: number;
  isAdvisor: boolean;
}

/** A student in one of the teacher's classes (no national ID / address) */
export interface ClassStudent {
  id: string;
  studentCode: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  enrollmentStatus: string;
  guardianName: string;
  guardianPhone: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ClassStudentsPage {
  class: MyClass;
  students: ClassStudent[];
  meta: PageMeta;
}

export function myClassesErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  if ([403, 404].includes(err.status) && typeof err.error?.message === 'string') return err.error.message;
  return fallback;
}

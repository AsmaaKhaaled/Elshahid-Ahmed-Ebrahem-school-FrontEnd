import { HttpErrorResponse } from '@angular/common/http';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'MISSION';
// Filled in by the server when a day is approved without a status for the teacher
export type ArchiveStatus = AttendanceStatus | 'NOT_RECORDED';

export type DayType = 'SCHOOL_DAY' | 'WEEKEND' | 'HOLIDAY';

export interface StatusOption {
  value: ArchiveStatus;
  label: string;
  // Selected button in the daily sheet
  activeClass: string;
  // Badge in the archive
  badgeClass: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'PRESENT', label: 'حاضر', activeClass: 'bg-emerald-600', badgeClass: 'bg-emerald-50 text-emerald-800' },
  { value: 'LATE', label: 'متأخر', activeClass: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-800' },
  { value: 'ABSENT', label: 'غائب', activeClass: 'bg-rose-600', badgeClass: 'bg-rose-50 text-rose-800' },
  { value: 'CASUAL_LEAVE', label: 'عارضة', activeClass: 'bg-blue-600', badgeClass: 'bg-blue-50 text-blue-800' },
  { value: 'SICK_LEAVE', label: 'مرضي', activeClass: 'bg-indigo-600', badgeClass: 'bg-indigo-50 text-indigo-800' },
  { value: 'MISSION', label: 'مأمورية', activeClass: 'bg-slate-600', badgeClass: 'bg-slate-100 text-slate-700' }
];

export const NOT_RECORDED_OPTION: StatusOption = {
  value: 'NOT_RECORDED', label: 'لم يُسجل', activeClass: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-500'
};

export const ALL_STATUS_OPTIONS = [...STATUS_OPTIONS, NOT_RECORDED_OPTION];

export const DEFAULT_ARRIVAL = '07:30';
export const DEFAULT_DEPARTURE = '14:00';

export function statusOption(status: ArchiveStatus | null): StatusOption | undefined {
  return ALL_STATUS_OPTIONS.find(option => option.value === status);
}

export function isOnDuty(status: ArchiveStatus | null): boolean {
  return status === 'PRESENT' || status === 'LATE';
}

export interface DayRecord {
  teacherId: string | null;
  teacherName: string;
  specialization: string;
  // null = not marked yet
  status: ArchiveStatus | null;
  arrivalTime: string;
  departureTime: string;
  note: string;
}

export interface Holiday {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface AttendanceDay {
  date: string;
  today: string;
  dayType: DayType;
  holiday: Holiday | null;
  isFuture: boolean;
  closed: { closedAt: string; closedBy: string | null; autoClosed: boolean } | null;
  editable: boolean;
  records: DayRecord[];
}

export interface ArchiveRecord extends DayRecord {
  id: string;
  date: string;
  status: ArchiveStatus;
}

export interface ArchiveFilters {
  from: string;
  to: string;
  teacherId: string;
  status: ArchiveStatus | '';
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ArchivePage {
  records: ArchiveRecord[];
  summary: Partial<Record<ArchiveStatus, number>>;
  meta: PageMeta;
}

export interface SaveRecord {
  teacherId: string;
  status: AttendanceStatus;
  arrivalTime: string;
  departureTime: string;
  note: string;
}

/** Messages the backend sends in Arabic (400 / 404 / 409) are shown as-is. */
export function attendanceErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  if (err.status === 403) return 'ليس لديك صلاحية دفتر حضور المعلمين.';
  if ([400, 404, 409].includes(err.status) && typeof err.error?.message === 'string') return err.error.message;
  if (err.status === 422) return 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.';
  return fallback;
}

import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter } from '@angular/material/core';

/** Arabic month names with Latin digits ("4 نوفمبر 2026", "7:30 ص"), like the rest of the system */
const SCHOOL_DATE_LOCALE = 'ar-EG-u-nu-latn';

const SCHOOL_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null, timeInput: null },
  display: {
    dateInput: { day: 'numeric', month: 'long', year: 'numeric' },
    monthYearLabel: { month: 'long', year: 'numeric' },
    dateA11yLabel: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    monthYearA11yLabel: { month: 'long', year: 'numeric' },
    timeInput: { hour: 'numeric', minute: '2-digit' },
    timeOptionLabel: { hour: 'numeric', minute: '2-digit' }
  }
};

/** The school week starts on Saturday */
@Injectable()
class SchoolDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 6;
  }
}

/** Calendar & time list settings shared by DateFieldComponent and TimeFieldComponent */
export const SCHOOL_DATE_PROVIDERS: Provider[] = [
  { provide: DateAdapter, useClass: SchoolDateAdapter },
  { provide: MAT_DATE_LOCALE, useValue: SCHOOL_DATE_LOCALE },
  { provide: MAT_DATE_FORMATS, useValue: SCHOOL_DATE_FORMATS }
];

/** "2026-11-04" ⇄ a local Date (no time-zone shift) */
export function isoToDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

export function dateToIso(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** "07:30" ⇄ a Date at that time (the day doesn't matter) */
export function timeToDate(time: string): Date | null {
  const match = /^(\d{2}):(\d{2})/.exec(time || '');
  if (!match) return null;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

export function dateToTime(date: Date | null): string {
  return date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
}

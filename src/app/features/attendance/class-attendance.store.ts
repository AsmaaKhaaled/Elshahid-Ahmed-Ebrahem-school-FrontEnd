import { Injectable, inject, signal } from '@angular/core';
import { today } from '../../core/academic/academic-calendar.store';
import { SchoolStructureStore } from '../../core/academic/school-structure.store';
import { compareArabic } from '../../shared/utils/arabic-sort';
import { ClassRoster } from '../students/class-roster.service';
import {
  ClassArchiveFilters, ClassArchiveRecord, ClassDayRecord, ClassDaySheet, StudentArchiveStatus, StudentAttendanceStatus,
  isWeekend, sheetKey
} from './class-attendance.model';

const SEEDED_SCHOOL_DAYS = 8;
const DEMO_NOTES: Partial<Record<StudentArchiveStatus, string>> = {
  ABSENT: 'إشعار مرسل لولي الأمر',
  LATE: 'تأخر عن الطابور الصباحي',
  EXCUSED: 'عذر مرضي'
};

export function shiftIsoDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The last n school days before a date, newest first */
function pastSchoolDays(from: string, n: number): string[] {
  const days: string[] = [];
  for (let date = shiftIsoDate(from, -1); days.length < n; date = shiftIsoDate(date, -1)) {
    if (!isWeekend(date)) days.push(date);
  }
  return days;
}

// A stable, mostly-present status for the demo archive
function demoStatus(studentId: string, date: string): StudentAttendanceStatus {
  let hash = 0;
  for (const ch of studentId + date) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const n = Math.abs(hash) % 20;
  return n === 0 ? 'ABSENT' : n === 1 ? 'LATE' : n === 2 ? 'EXCUSED' : 'PRESENT';
}

/**
 * Students' attendance books: one sheet per class per day, taken by the teacher who has the class.
 * Mock data (the last school days already approved) until the backend stores it.
 */
@Injectable({ providedIn: 'root' })
export class ClassAttendanceStore {
  private readonly roster = inject(ClassRoster);
  private readonly structure = inject(SchoolStructureStore);

  readonly sheets = signal<Record<string, ClassDaySheet>>(this.seed());

  sheet(section: string, date: string): ClassDaySheet | undefined {
    return this.sheets()[sheetKey(section, date)];
  }

  /** A day's rows: every student of the class, with what's been marked so far. */
  recordsOf(section: string, date: string): ClassDayRecord[] {
    const marks = this.sheet(section, date)?.marks ?? {};
    return this.roster.studentsOf(section).map(student => ({
      studentId: student.id,
      studentName: student.name,
      code: student.code,
      status: marks[student.id]?.status ?? null,
      note: marks[student.id]?.note ?? ''
    }));
  }

  save(section: string, date: string, records: ClassDayRecord[], by: string): void {
    const marks: ClassDaySheet['marks'] = {};
    for (const r of records) if (r.status) marks[r.studentId] = { status: r.status, note: r.note.trim() };
    this.put({ section, date, marks, savedBy: by, closed: this.sheet(section, date)?.closed ?? null });
  }

  /** Approves the day: unmarked students are kept as "لم يُسجل" and the sheet locks. */
  close(section: string, date: string, records: ClassDayRecord[], by: string): void {
    const marks: ClassDaySheet['marks'] = {};
    for (const r of records) marks[r.studentId] = { status: r.status ?? 'NOT_RECORDED', note: r.note.trim() };
    this.put({ section, date, marks, savedBy: by, closed: { closedAt: new Date().toISOString(), closedBy: by } });
  }

  /** Approved days of a class, newest first, matching the filters. */
  archive(section: string, filters: ClassArchiveFilters): ClassArchiveRecord[] {
    const names = new Map(this.roster.studentsOf(section).map(s => [s.id, s]));
    return Object.values(this.sheets())
      .filter(s => s.section === section && s.closed)
      .filter(s => (!filters.from || s.date >= filters.from) && (!filters.to || s.date <= filters.to))
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap(s =>
        Object.entries(s.marks)
          .filter(([studentId, mark]) => (!filters.studentId || studentId === filters.studentId) && (!filters.status || mark.status === filters.status))
          .map(([studentId, mark]) => ({
            id: `${s.date}-${studentId}`,
            date: s.date,
            section,
            studentId,
            studentName: names.get(studentId)?.name ?? '',
            code: names.get(studentId)?.code ?? '',
            status: mark.status,
            note: mark.note
          }))
          .sort((a, b) => compareArabic(a.studentName, b.studentName))
      );
  }

  /** One student's approved days (the student's own record), newest first. */
  historyOf(section: string, studentId: string): ClassArchiveRecord[] {
    return this.archive(section, { from: '', to: '', studentId, status: '' });
  }

  private put(sheet: ClassDaySheet): void {
    this.sheets.update(all => ({ ...all, [sheetKey(sheet.section, sheet.date)]: sheet }));
  }

  private seed(): Record<string, ClassDaySheet> {
    const sheets: Record<string, ClassDaySheet> = {};
    const days = pastSchoolDays(today(), SEEDED_SCHOOL_DAYS);
    for (const section of this.structure.allSections()) {
      const students = this.roster.studentsOf(section);
      for (const date of days) {
        const marks: ClassDaySheet['marks'] = {};
        for (const s of students) {
          const status = demoStatus(s.id, date);
          marks[s.id] = { status, note: DEMO_NOTES[status] ?? '' };
        }
        sheets[sheetKey(section, date)] = { section, date, marks, savedBy: 'المعلم', closed: { closedAt: `${date}T13:00:00`, closedBy: 'المعلم' } };
      }
    }
    return sheets;
  }
}

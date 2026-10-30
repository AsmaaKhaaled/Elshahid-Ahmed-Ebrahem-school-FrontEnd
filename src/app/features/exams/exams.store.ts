import { Injectable, signal } from '@angular/core';

export const EXAM_TYPES = ['تقييم شهري', 'امتحان نصف الترم', 'امتحان آخر العام'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export interface ExamEntry {
  id: string;
  subject: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  totalMarks: number;
  notes: string;
}

// One exam timetable for one grade in one term (e.g. "تقييم شهر أكتوبر - الصف الأول")
export interface ExamSchedule {
  id: string;
  termId: string;
  type: ExamType;
  title: string;
  gradeId: string;
  published: boolean;
  entries: ExamEntry[];
}

export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// "09:30" + 90 -> "11:00"
export function addMinutes(time: string, minutes: number): string {
  const total = minutesOf(time) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// "13:30" -> "1:30 م"
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'ص' : 'م';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

const entry = (id: string, subject: string, date: string, startTime: string, durationMinutes: number, totalMarks: number, notes = ''): ExamEntry =>
  ({ id, subject, date, startTime, durationMinutes, totalMarks, notes });

/** Exam timetables created by the admin; teachers and students see the published ones. */
@Injectable({ providedIn: 'root' })
export class ExamsStore {
  readonly schedules = signal<ExamSchedule[]>([
    {
      id: 'sch-1', termId: '2026-2027-T1', type: 'تقييم شهري', title: 'تقييم شهر أكتوبر', gradeId: 'G1', published: true,
      entries: [
        entry('e1', 'اللغة العربية', '2026-11-01', '09:00', 60, 20),
        entry('e2', 'الرياضيات', '2026-11-02', '09:00', 60, 20),
        entry('e3', 'العلوم', '2026-11-03', '09:00', 45, 15),
        entry('e4', 'اللغة الإنجليزية', '2026-11-04', '09:00', 45, 15, 'يشمل جزء الاستماع')
      ]
    },
    {
      id: 'sch-2', termId: '2026-2027-T1', type: 'تقييم شهري', title: 'تقييم شهر أكتوبر', gradeId: 'G2', published: false,
      entries: [
        entry('e5', 'الرياضيات', '2026-11-01', '10:30', 60, 20),
        entry('e6', 'الدراسات الاجتماعية', '2026-11-02', '10:30', 45, 15)
      ]
    },
    {
      id: 'sch-3', termId: '2026-2027-T1', type: 'امتحان نصف الترم', title: 'امتحان نصف الترم الأول', gradeId: 'G3', published: true,
      entries: [
        entry('e7', 'اللغة العربية', '2026-11-15', '09:00', 120, 80),
        entry('e8', 'الرياضيات', '2026-11-16', '09:00', 120, 60),
        entry('e9', 'العلوم', '2026-11-17', '09:00', 90, 40),
        entry('e10', 'الدراسات الاجتماعية', '2026-11-18', '09:00', 90, 40)
      ]
    }
  ]);

  saveSchedule(schedule: ExamSchedule): void {
    this.schedules.update(list =>
      list.some(s => s.id === schedule.id) ? list.map(s => (s.id === schedule.id ? schedule : s)) : [...list, schedule]
    );
  }

  deleteSchedule(scheduleId: string): void {
    this.schedules.update(list => list.filter(s => s.id !== scheduleId));
  }

  setPublished(scheduleId: string, published: boolean): void {
    this.updateSchedule(scheduleId, s => ({ ...s, published }));
  }

  saveEntry(scheduleId: string, examEntry: ExamEntry): void {
    this.updateSchedule(scheduleId, s => ({
      ...s,
      entries: s.entries.some(e => e.id === examEntry.id)
        ? s.entries.map(e => (e.id === examEntry.id ? examEntry : e))
        : [...s.entries, examEntry]
    }));
  }

  deleteEntry(scheduleId: string, entryId: string): void {
    this.updateSchedule(scheduleId, s => ({ ...s, entries: s.entries.filter(e => e.id !== entryId) }));
  }

  private updateSchedule(scheduleId: string, change: (schedule: ExamSchedule) => ExamSchedule): void {
    this.schedules.update(list => list.map(s => (s.id === scheduleId ? change(s) : s)));
  }
}

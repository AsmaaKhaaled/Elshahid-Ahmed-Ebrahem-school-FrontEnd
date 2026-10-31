import { DAILY_PERIODS, GRADE_LEVELS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { Teacher, WeeklySchedule, slotKey, teacherDisplayName } from '../teachers/teacher.model';

export const ALL_SECTIONS = GRADE_LEVELS.flatMap(grade => grade.sections);
export const WEEKLY_SLOTS = SCHOOL_DAYS.length * DAILY_PERIODS;

export interface TimetableLesson {
  teacherId: string;
  teacherName: string;
  subject: string;
}

// section -> slot key -> lessons; more than one lesson in a slot is a conflict
export type SchoolTimetable = Record<string, Record<string, TimetableLesson[]>>;

export interface TimetableConflict {
  section: string;
  day: number;
  period: number;
  lessons: TimetableLesson[];
}

export interface SectionCoverage {
  section: string;
  filled: number;
  free: number;
}

/** Turns every teacher's weekly schedule of one term into one timetable per class. */
export function buildSchoolTimetable(teachers: Teacher[], termSchedules: Record<string, WeeklySchedule>): SchoolTimetable {
  const timetable: SchoolTimetable = Object.fromEntries(ALL_SECTIONS.map(section => [section, {}]));

  // Follow the teachers list order, so lessons always show in the same order
  for (const teacher of teachers) {
    for (const [key, slot] of Object.entries(termSchedules[teacher.id] ?? {})) {
      const sectionSlots = (timetable[slot.section] ??= {});
      (sectionSlots[key] ??= []).push({ teacherId: teacher.id, teacherName: teacherDisplayName(teacher), subject: slot.subject });
    }
  }
  return timetable;
}

export function findConflicts(timetable: SchoolTimetable): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];
  for (const [section, slots] of Object.entries(timetable)) {
    forEachSlot((day, period, key) => {
      const lessons = slots[key];
      if (lessons && lessons.length > 1) conflicts.push({ section, day, period, lessons });
    });
  }
  return conflicts;
}

export function sectionCoverage(timetable: SchoolTimetable): SectionCoverage[] {
  return Object.entries(timetable).map(([section, slots]) => {
    const filled = Object.values(slots).filter(lessons => lessons.length > 0).length;
    return { section, filled, free: WEEKLY_SLOTS - filled };
  });
}

export function forEachSlot(visit: (day: number, period: number, key: string) => void): void {
  for (let day = 0; day < SCHOOL_DAYS.length; day++) {
    for (let period = 0; period < DAILY_PERIODS; period++) {
      visit(day, period, slotKey(day, period));
    }
  }
}

import type { Worksheet } from 'exceljs';
import { DAILY_PERIODS, SCHOOL_DAYS } from '../../core/constants/school.constants';
import { newWorkbook, saveWorkbook, styleHeader } from '../../shared/utils/excel';
import { Teacher, WeeklySchedule, slotKey, teacherDisplayName } from '../teachers/teacher.model';
import { SchoolTimetable } from './timetable';

const CONFLICT_FILL = 'FFFEE2E2';
const DAY_FILL = 'FFF1F5F9';

/** One sheet with every teacher's week, then one sheet per class. */
export async function exportSchoolTimetable(
  termLabel: string,
  teachers: Teacher[],
  termSchedules: Record<string, WeeklySchedule>,
  timetable: SchoolTimetable
): Promise<void> {
  const workbook = await newWorkbook();
  addTeachersSheet(workbook.addWorksheet('جدول المعلمين', sheetOptions(2, 1)), termLabel, teachers, termSchedules);
  for (const [section, slots] of Object.entries(timetable)) {
    // "/" isn't allowed in sheet names
    addSectionSheet(workbook.addWorksheet(`فصل ${section.replace('/', '-')}`, sheetOptions(2, 1)), termLabel, section, slots);
  }
  await saveWorkbook(workbook, `الجدول-المدرسي-${termLabel.replace(/[\s/]+/g, '-')}.xlsx`);
}

function sheetOptions(ySplit: number, xSplit: number) {
  return { views: [{ rightToLeft: true, state: 'frozen' as const, ySplit, xSplit }] };
}

function addTeachersSheet(sheet: Worksheet, termLabel: string, teachers: Teacher[], termSchedules: Record<string, WeeklySchedule>): void {
  sheet.getColumn(1).width = 30;
  styleHeader(sheet.getCell(1, 1), termLabel);
  styleHeader(sheet.getCell(2, 1), 'المعلم');

  SCHOOL_DAYS.forEach((day, dayIndex) => {
    const first = 2 + dayIndex * DAILY_PERIODS;
    sheet.mergeCells(1, first, 1, first + DAILY_PERIODS - 1);
    styleHeader(sheet.getCell(1, first), day);
    for (let period = 0; period < DAILY_PERIODS; period++) {
      sheet.getColumn(first + period).width = 6;
      styleHeader(sheet.getCell(2, first + period), String(period + 1));
    }
  });

  teachers.forEach((teacher, index) => {
    const row = sheet.getRow(3 + index);
    row.getCell(1).value = teacherDisplayName(teacher);
    row.getCell(1).font = { bold: true };
    const schedule = termSchedules[teacher.id] ?? {};
    SCHOOL_DAYS.forEach((_, dayIndex) => {
      for (let period = 0; period < DAILY_PERIODS; period++) {
        const cell = row.getCell(2 + dayIndex * DAILY_PERIODS + period);
        cell.value = schedule[slotKey(dayIndex, period)]?.section ?? '';
        cell.alignment = { horizontal: 'center' };
      }
    });
  });
}

function addSectionSheet(sheet: Worksheet, termLabel: string, section: string, slots: SchoolTimetable[string]): void {
  sheet.mergeCells(1, 1, 1, DAILY_PERIODS + 1);
  styleHeader(sheet.getCell(1, 1), `جدول فصل ${section} — ${termLabel}`);
  sheet.getColumn(1).width = 12;
  styleHeader(sheet.getCell(2, 1), 'اليوم');
  for (let period = 0; period < DAILY_PERIODS; period++) {
    sheet.getColumn(period + 2).width = 24;
    styleHeader(sheet.getCell(2, period + 2), `الحصة ${period + 1}`);
  }

  SCHOOL_DAYS.forEach((day, dayIndex) => {
    const row = sheet.getRow(3 + dayIndex);
    row.height = 36;
    row.getCell(1).value = day;
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DAY_FILL } };
    for (let period = 0; period < DAILY_PERIODS; period++) {
      const lessons = slots[slotKey(dayIndex, period)] ?? [];
      const cell = row.getCell(period + 2);
      cell.value = lessons.map(lesson => `${lesson.subject}\n${lesson.teacherName}`).join('\n— تعارض —\n');
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (lessons.length > 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFLICT_FILL } };
    }
  });
}

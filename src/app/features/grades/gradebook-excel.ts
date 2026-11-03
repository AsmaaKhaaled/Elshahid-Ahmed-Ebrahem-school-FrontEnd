import { newWorkbook, saveWorkbook, styleHeader } from '../../shared/utils/excel';
import { RosterStudent } from '../students/class-roster.service';
import { BookWeeks, GRADE_CRITERIA, GradeMonth, WEEK_TOTAL, monthAverage, weekLabel, weekTotal } from './gradebook.model';

const ORDINAL_WEEKS = ['الأسبوع الأول', 'الأسبوع الثاني', 'الأسبوع الثالث', 'الأسبوع الرابع'];

/** The month's register laid out like the paper one: per week the three marks & the total, then the average. */
export async function exportGradebookExcel(
  students: RosterStudent[], weeks: BookWeeks, month: GradeMonth, section: string, subject: string, title: string
): Promise<void> {
  const workbook = await newWorkbook();
  const sheet = workbook.addWorksheet(month.label, { views: [{ rightToLeft: true, state: 'frozen', xSplit: 1, ySplit: 4 }] });
  const perWeek = GRADE_CRITERIA.length + 1;
  const lastColumn = 1 + (month.weeks.length + 1) * perWeek;

  sheet.mergeCells(1, 1, 1, lastColumn);
  styleHeader(sheet.getCell(1, 1), `${title} — فصل ${section} — مادة ${subject} — ${month.label}`);

  styleHeader(sheet.getCell(2, 1), 'اسم الطالب');
  sheet.mergeCells(2, 1, 4, 1);
  sheet.getColumn(1).width = 30;

  const blocks = [
    ...month.weeks.map((week, i) => ({ title: ORDINAL_WEEKS[i] ?? `الأسبوع ${i + 1}`, date: weekLabel(week) })),
    { title: 'متوسط الشهر', date: '' }
  ];
  blocks.forEach((block, b) => {
    const first = 2 + b * perWeek;
    sheet.mergeCells(2, first, 2, first + perWeek - 1);
    styleHeader(sheet.getCell(2, first), block.title);
    sheet.mergeCells(3, first, 3, first + perWeek - 1);
    styleHeader(sheet.getCell(3, first), block.date);
    [...GRADE_CRITERIA.map(c => `${c.label} (${c.max})`), `المجموع (${WEEK_TOTAL})`].forEach((label, i) => {
      styleHeader(sheet.getCell(4, first + i), label);
      sheet.getColumn(first + i).width = 11;
    });
  });

  students.forEach((student, r) => {
    const row = sheet.getRow(5 + r);
    row.getCell(1).value = student.name;
    month.weeks.forEach((week, w) => {
      const marks = weeks[week]?.[student.id];
      const first = 2 + w * perWeek;
      GRADE_CRITERIA.forEach((c, i) => (row.getCell(first + i).value = marks?.[c.key] ?? null));
      row.getCell(first + GRADE_CRITERIA.length).value = weekTotal(marks);
    });
    const avg = monthAverage(month.weeks.map(week => weeks[week]?.[student.id]));
    const first = 2 + month.weeks.length * perWeek;
    [avg.weekly, avg.homework, avg.behavior, avg.total].forEach((value, i) => (row.getCell(first + i).value = value));
  });

  await saveWorkbook(workbook, `رصد-درجات-${section.replace('/', '-')}-${subject}-${month.label}.xlsx`.replace(/\s+/g, '-'));
}

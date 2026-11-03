import { compareArabic } from '../../shared/utils/arabic-sort';
import { newWorkbook, saveWorkbook, styleHeader } from '../../shared/utils/excel';
import { ALL_STUDENT_STATUS_OPTIONS, ClassArchiveRecord, studentStatusOption } from './class-attendance.model';

export interface StudentSummary {
  studentName: string;
  code: string;
  counts: Record<string, number>;
  total: number;
}

/** Per-student totals for a period, A→Z. */
export function summarizeByStudent(records: ClassArchiveRecord[]): StudentSummary[] {
  const byStudent = new Map<string, StudentSummary>();
  for (const record of records) {
    let summary = byStudent.get(record.studentId);
    if (!summary) {
      summary = { studentName: record.studentName, code: record.code, counts: {}, total: 0 };
      byStudent.set(record.studentId, summary);
    }
    summary.counts[record.status] = (summary.counts[record.status] ?? 0) + 1;
    summary.total++;
  }
  return [...byStudent.values()].sort((a, b) => compareArabic(a.studentName, b.studentName));
}

export async function exportClassAttendanceExcel(records: ClassArchiveRecord[], section: string, periodLabel: string): Promise<void> {
  const workbook = await newWorkbook();

  // 1. Summary per student
  const summary = workbook.addWorksheet('ملخص الطلاب', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }] });
  const summaryHeaders = ['الطالب', 'كود القيد', ...ALL_STUDENT_STATUS_OPTIONS.map(option => option.label), 'إجمالي الأيام'];
  summary.mergeCells(1, 1, 1, summaryHeaders.length);
  styleHeader(summary.getCell(1, 1), `حضور وغياب فصل ${section} — ${periodLabel}`);
  summaryHeaders.forEach((header, i) => {
    styleHeader(summary.getCell(2, i + 1), header);
    summary.getColumn(i + 1).width = i === 0 ? 30 : i === 1 ? 16 : 12;
  });
  summarizeByStudent(records).forEach((row, index) => {
    summary.getRow(3 + index).values = [
      row.studentName,
      row.code,
      ...ALL_STUDENT_STATUS_OPTIONS.map(option => row.counts[option.value] ?? 0),
      row.total
    ];
  });

  // 2. Every day's records
  const details = workbook.addWorksheet('السجل اليومي', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  const columns = [
    { header: 'التاريخ', width: 14 },
    { header: 'الطالب', width: 30 },
    { header: 'كود القيد', width: 16 },
    { header: 'الحالة', width: 12 },
    { header: 'ملاحظات', width: 36 }
  ];
  columns.forEach((column, i) => {
    styleHeader(details.getCell(1, i + 1), column.header);
    details.getColumn(i + 1).width = column.width;
  });
  records.forEach((record, index) => {
    details.getRow(2 + index).values = [
      record.date,
      record.studentName,
      record.code,
      studentStatusOption(record.status)?.label ?? record.status,
      record.note
    ];
  });

  await saveWorkbook(workbook, `حضور-فصل-${section.replace('/', '-')}-${periodLabel.replace(/[\s/]+/g, '-')}.xlsx`);
}

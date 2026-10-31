import { compareArabic } from '../../shared/utils/arabic-sort';
import { newWorkbook, saveWorkbook, styleHeader } from '../../shared/utils/excel';
import { ALL_STATUS_OPTIONS, ArchiveRecord, statusOption } from './teacher-attendance.model';

export interface TeacherSummary {
  teacherName: string;
  specialization: string;
  counts: Record<string, number>;
  total: number;
}

/** Per-teacher totals for a period, A→Z. */
export function summarizeByTeacher(records: ArchiveRecord[]): TeacherSummary[] {
  const byTeacher = new Map<string, TeacherSummary>();
  for (const record of records) {
    // Removed teachers have no id any more; their name still identifies them
    const key = record.teacherId ?? `name:${record.teacherName}`;
    let summary = byTeacher.get(key);
    if (!summary) {
      summary = { teacherName: record.teacherName, specialization: record.specialization, counts: {}, total: 0 };
      byTeacher.set(key, summary);
    }
    summary.counts[record.status] = (summary.counts[record.status] ?? 0) + 1;
    summary.total++;
  }
  return [...byTeacher.values()].sort((a, b) => compareArabic(a.teacherName, b.teacherName));
}

export async function exportAttendanceExcel(records: ArchiveRecord[], periodLabel: string): Promise<void> {
  const workbook = await newWorkbook();

  // 1. Summary per teacher
  const summary = workbook.addWorksheet('ملخص المعلمين', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }] });
  const summaryHeaders = ['المعلم', 'التخصص', ...ALL_STATUS_OPTIONS.map(option => option.label), 'إجمالي الأيام'];
  summary.mergeCells(1, 1, 1, summaryHeaders.length);
  styleHeader(summary.getCell(1, 1), `ملخص حضور وغياب المعلمين — ${periodLabel}`);
  summaryHeaders.forEach((header, i) => {
    styleHeader(summary.getCell(2, i + 1), header);
    summary.getColumn(i + 1).width = i === 0 ? 30 : i === 1 ? 20 : 12;
  });
  summarizeByTeacher(records).forEach((row, index) => {
    summary.getRow(3 + index).values = [
      row.teacherName,
      row.specialization,
      ...ALL_STATUS_OPTIONS.map(option => row.counts[option.value] ?? 0),
      row.total
    ];
  });

  // 2. Every day's records
  const details = workbook.addWorksheet('السجل اليومي', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  const columns = [
    { header: 'التاريخ', width: 14 },
    { header: 'المعلم', width: 30 },
    { header: 'التخصص', width: 20 },
    { header: 'الحالة', width: 12 },
    { header: 'وقت الحضور', width: 12 },
    { header: 'وقت الانصراف', width: 13 },
    { header: 'ملاحظات', width: 36 }
  ];
  columns.forEach((column, i) => {
    styleHeader(details.getCell(1, i + 1), column.header);
    details.getColumn(i + 1).width = column.width;
  });
  records.forEach((record, index) => {
    details.getRow(2 + index).values = [
      record.date,
      record.teacherName,
      record.specialization,
      statusOption(record.status)?.label ?? record.status,
      record.arrivalTime,
      record.departureTime,
      record.note
    ];
  });

  await saveWorkbook(workbook, `دفتر-حضور-المعلمين-${periodLabel.replace(/[\s/]+/g, '-')}.xlsx`);
}

import type { CellValue, Workbook, Worksheet } from 'exceljs';
import { GRADE_LEVELS, GradeLevel } from '../../core/constants/school.constants';
import {
  EGYPT_MOBILE_PATTERN,
  NATIONAL_ID_PATTERN,
  STUDENT_STATUSES,
  Student,
  StudentStatus,
  gradeOf,
  nextStudentCode
} from './student.model';

type ColumnKey = 'name' | 'nationalId' | 'grade' | 'section' | 'guardianName' | 'guardianPhone' | 'code' | 'status';

// Column order of the template & export (an export can be re-imported as-is)
const COLUMNS: { key: ColumnKey; header: string; width: number; required: boolean }[] = [
  { key: 'name', header: 'اسم الطالب رباعي', width: 34, required: true },
  { key: 'nationalId', header: 'الرقم القومي للطالب', width: 22, required: true },
  { key: 'grade', header: 'الصف الدراسي', width: 24, required: true },
  { key: 'section', header: 'رقم الفصل', width: 12, required: true },
  { key: 'guardianName', header: 'اسم ولي الأمر', width: 28, required: true },
  { key: 'guardianPhone', header: 'هاتف ولي الأمر', width: 18, required: true },
  { key: 'code', header: 'كود الطالب (اختياري)', width: 20, required: false },
  { key: 'status', header: 'الحالة (اختياري)', width: 16, required: false }
];

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 3000;
const FIRST_DATA_ROW = 2;
const TEMPLATE_ROWS = 600;

export interface ImportRow {
  // Row number in the Excel sheet, so the admin can find it
  rowNumber: number;
  student: Student;
  errors: string[];
}

export interface ImportResult {
  rows: ImportRow[];
  // File-level problem (wrong format, missing columns...) - no rows when set
  fileError: string | null;
}

// exceljs is ~1MB, so it is only loaded when the admin imports or exports
async function newWorkbook(): Promise<Workbook> {
  const { Workbook } = await import('exceljs');
  return new Workbook();
}

export async function downloadImportTemplate(): Promise<void> {
  const workbook = await newWorkbook();
  const sheet = addStudentsSheet(workbook);
  const maxSections = Math.max(...GRADE_LEVELS.map(grade => grade.sections.length));

  for (let row = FIRST_DATA_ROW; row < FIRST_DATA_ROW + TEMPLATE_ROWS; row++) {
    sheet.getCell(row, columnIndex('grade')).dataValidation = listValidation(GRADE_LEVELS.map(grade => grade.label), 'اختر الصف من القائمة');
    sheet.getCell(row, columnIndex('section')).dataValidation = {
      type: 'whole',
      operator: 'between',
      allowBlank: true,
      formulae: [1, maxSections],
      showErrorMessage: true,
      error: `اكتب رقم الفصل فقط من 1 إلى ${maxSections}`
    };
    sheet.getCell(row, columnIndex('status')).dataValidation = listValidation(STUDENT_STATUSES, 'اختر الحالة من القائمة');
  }

  const help = workbook.addWorksheet('تعليمات', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 110;
  [
    'تعليمات ملء ملف تسجيل الطلاب',
    '',
    '• املأ صف واحد لكل طالب في ورقة "الطلاب" بدون تغيير أسماء الأعمدة.',
    '• الرقم القومي: 14 رقم للطالب نفسه (من شهادة الميلاد).',
    `• الصف الدراسي: اختره من القائمة (${GRADE_LEVELS.map(grade => grade.label).join(' / ')}).`,
    `• رقم الفصل: رقم فقط من 1 إلى ${maxSections}، مثلاً الطالب في فصل 2/3 يتكتب له الصف الثاني ورقم الفصل 3.`,
    '• هاتف ولي الأمر: رقم موبايل مصري 11 رقم يبدأ بـ 01.',
    '• كود الطالب: اتركه فاضي وهيتولد تلقائياً، أو اكتب الكود الموجود عندكم.',
    `• الحالة: اتركها فاضية لو الطالب منتظم، أو اختر (${STUDENT_STATUSES.join(' / ')}).`,
    '• بعد رفع الملف هتظهر لك مراجعة لكل الصفوف قبل الحفظ، والصفوف اللي فيها أخطاء مش هتتسجل.'
  ].forEach((line, index) => {
    const cell = help.getCell(index + 1, 1);
    cell.value = line;
    if (index === 0) cell.font = { bold: true, size: 14 };
  });

  await saveWorkbook(workbook, 'قالب-تسجيل-الطلاب.xlsx');
}

export async function exportStudents(students: Student[]): Promise<void> {
  const workbook = await newWorkbook();
  const sheet = addStudentsSheet(workbook);
  const gpaColumn = COLUMNS.length + 1;
  sheet.getColumn(gpaColumn).width = 12;
  styleHeader(sheet.getCell(1, gpaColumn), 'المعدل');

  students.forEach((student, index) => {
    const row = sheet.getRow(FIRST_DATA_ROW + index);
    const values: Record<ColumnKey, string> = {
      name: student.name,
      nationalId: student.nationalId,
      grade: gradeOf(student)?.label ?? '',
      section: student.className.split('/')[1] ?? '',
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      code: student.code,
      status: student.status
    };
    COLUMNS.forEach((column, i) => (row.getCell(i + 1).value = values[column.key]));
    row.getCell(gpaColumn).value = student.gpa;
  });

  const date = new Date().toISOString().slice(0, 10);
  await saveWorkbook(workbook, `سجل-الطلاب-${date}.xlsx`);
}

export async function parseStudentsFile(file: File, existing: Student[]): Promise<ImportResult> {
  if (!/\.xlsx$/i.test(file.name)) {
    return failed('الملف لازم يكون Excel بصيغة \u200E.xlsx\u200E (لو الملف \u200E.xls\u200E أو \u200E.csv\u200E افتحه في Excel واحفظه باسم Excel Workbook)');
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return failed('حجم الملف أكبر من 5 ميجا');
  }

  const workbook = await newWorkbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return failed('تعذر قراءة الملف - تأكد أنه ملف Excel سليم وغير محمي بكلمة سر');
  }

  const sheet = workbook.worksheets.find(ws => ws.actualRowCount > 0);
  if (!sheet) return failed('الملف فاضي');

  const header = findHeader(sheet);
  if (!header) {
    return failed('مش لاقي صف أسماء الأعمدة - استخدم القالب الجاهز من زرار "تحميل القالب"');
  }
  const missing = COLUMNS.filter(column => column.required && !header.columns.has(column.key));
  if (missing.length) {
    return failed(`أعمدة ناقصة في الملف: ${missing.map(column => column.header).join('، ')}`);
  }

  const rows: ImportRow[] = [];
  for (let r = header.row + 1; r <= sheet.rowCount; r++) {
    const read = (key: ColumnKey): CellValue => {
      const col = header.columns.get(key);
      return col ? sheet.getRow(r).getCell(col).value : null;
    };
    if (COLUMNS.every(column => cellText(read(column.key)) === '')) continue;
    if (rows.length === MAX_IMPORT_ROWS) {
      return failed(`الملف فيه أكثر من ${MAX_IMPORT_ROWS} طالب - قسّمه على أكثر من ملف`);
    }
    rows.push(parseRow(r, read));
  }

  if (!rows.length) return failed('مفيش بيانات طلاب في الملف تحت صف أسماء الأعمدة');

  markDuplicates(rows, existing);
  assignMissingCodes(rows, existing);
  return { rows, fileError: null };
}

function parseRow(rowNumber: number, read: (key: ColumnKey) => CellValue): ImportRow {
  const errors: string[] = [];

  const name = cellText(read('name')).replace(/\s+/g, ' ');
  if (!name) errors.push('اسم الطالب مطلوب');

  const nationalId = digitsOnly(cellText(read('nationalId')));
  if (!NATIONAL_ID_PATTERN.test(nationalId)) errors.push('الرقم القومي لازم يكون 14 رقم');

  const sectionValue = read('section');
  const sectionText = cellText(sectionValue);
  // "2/3" in the section column also tells us the grade
  const sectionParts = toLatinDigits(sectionText).match(/^(\d)\s*[/\\\-]\s*(\d+)$/);
  const grade = findGrade(cellText(read('grade'))) ?? (sectionParts ? GRADE_LEVELS[Number(sectionParts[1]) - 1] : undefined);
  if (!grade) errors.push('الصف الدراسي غير معروف');

  let className = '';
  if (sectionValue instanceof Date) {
    errors.push('Excel حوّل رقم الفصل لتاريخ - اكتب رقم الفصل فقط (مثال: 3)');
  } else if (grade) {
    const sectionNumber = sectionParts ? sectionParts[2] : digitsOnly(sectionText);
    className = `${GRADE_LEVELS.indexOf(grade) + 1}/${Number(sectionNumber)}`;
    if (!sectionNumber) {
      errors.push('رقم الفصل مطلوب');
      className = '';
    } else if (!grade.sections.includes(className)) {
      errors.push(`فصل ${className} غير موجود في ${grade.label}`);
    }
  }

  const guardianName = cellText(read('guardianName')).replace(/\s+/g, ' ');
  if (!guardianName) errors.push('اسم ولي الأمر مطلوب');

  const guardianPhone = normalizePhone(cellText(read('guardianPhone')));
  if (!EGYPT_MOBILE_PATTERN.test(guardianPhone)) errors.push('هاتف ولي الأمر لازم يكون موبايل مصري 11 رقم');

  const statusText = cellText(read('status'));
  const status = (statusText || 'منتظم') as StudentStatus;
  if (!STUDENT_STATUSES.includes(status)) errors.push(`الحالة لازم تكون: ${STUDENT_STATUSES.join(' / ')}`);

  return {
    rowNumber,
    errors,
    student: {
      id: crypto.randomUUID(),
      code: toLatinDigits(cellText(read('code'))).toUpperCase(),
      nationalId,
      name,
      gradeId: grade?.id ?? '',
      className,
      guardianName,
      guardianPhone,
      status,
      gpa: null
    }
  };
}

function markDuplicates(rows: ImportRow[], existing: Student[]): void {
  const existingIds = new Map(existing.map(s => [s.nationalId, s]));
  const existingCodes = new Map(existing.map(s => [s.code, s]));
  const firstRowById = new Map<string, number>();
  const firstRowByCode = new Map<string, number>();

  for (const row of rows) {
    const { nationalId, code } = row.student;
    if (NATIONAL_ID_PATTERN.test(nationalId)) {
      const registered = existingIds.get(nationalId);
      if (registered) row.errors.push(`الطالب مسجل بالفعل باسم "${registered.name}"`);
      else if (firstRowById.has(nationalId)) row.errors.push(`الرقم القومي مكرر مع صف ${firstRowById.get(nationalId)}`);
      else firstRowById.set(nationalId, row.rowNumber);
    }
    if (code) {
      if (existingCodes.has(code)) row.errors.push(`كود الطالب ${code} مستخدم لطالب آخر`);
      else if (firstRowByCode.has(code)) row.errors.push(`كود الطالب مكرر مع صف ${firstRowByCode.get(code)}`);
      else firstRowByCode.set(code, row.rowNumber);
    }
  }
}

function assignMissingCodes(rows: ImportRow[], existing: Student[]): void {
  const taken = new Set([...existing.map(s => s.code), ...rows.map(row => row.student.code).filter(Boolean)]);
  for (const row of rows) {
    if (!row.student.code && !row.errors.length) {
      row.student.code = nextStudentCode(taken);
      taken.add(row.student.code);
    }
  }
}

function findHeader(sheet: Worksheet): { row: number; columns: Map<ColumnKey, number> } | null {
  for (let r = 1; r <= Math.min(sheet.rowCount, 10); r++) {
    const columns = new Map<ColumnKey, number>();
    sheet.getRow(r).eachCell((cell, col) => {
      const key = detectColumn(cellText(cell.value));
      if (key && !columns.has(key)) columns.set(key, col);
    });
    if (columns.size >= 3) return { row: r, columns };
  }
  return null;
}

// Matches header wording loosely so files made by hand (not from the template) still work
function detectColumn(headerText: string): ColumnKey | null {
  const h = normalizeArabic(headerText);
  const has = (word: string) => h.includes(word);
  if (!h) return null;
  if (has('قومي')) return 'nationalId';
  if (has('هاتف') || has('موبايل') || has('تليفون') || has('محمول')) return 'guardianPhone';
  if (has('ولي')) return 'guardianName';
  if (has('كود') || has('القيد')) return 'code';
  if (has('الصف') || has('المرحله')) return 'grade';
  if (has('فصل')) return 'section';
  if (has('حاله')) return 'status';
  if (has('اسم')) return 'name';
  return null;
}

function findGrade(text: string): GradeLevel | undefined {
  const value = normalizeArabic(toLatinDigits(text));
  if (!value) return undefined;
  if (/^[123]$/.test(value)) return GRADE_LEVELS[Number(value) - 1];
  const ordinals = ['اول', 'ثاني', 'ثالث'];
  return (
    GRADE_LEVELS.find(grade => [grade.label, grade.shortLabel].some(label => normalizeArabic(label) === value)) ??
    GRADE_LEVELS[ordinals.findIndex(word => value.includes(word))]
  );
}

function normalizePhone(text: string): string {
  let digits = digitsOnly(text);
  if (digits.startsWith('20') && digits.length === 12) digits = '0' + digits.slice(2);
  // Excel drops the leading zero when the phone column is formatted as a number
  if (digits.length === 10 && digits.startsWith('1')) digits = '0' + digits;
  return digits;
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('en-GB');
  if (typeof value === 'number') return Number.isInteger(value) ? value.toFixed(0) : String(value);
  if (typeof value !== 'object') return String(value).trim();
  if ('richText' in value) return value.richText.map(part => part.text).join('').trim();
  if ('result' in value) return cellText(value.result as CellValue);
  if ('text' in value) return String(value.text).trim();
  return '';
}

function toLatinDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, d => String(d.charCodeAt(0) & 0xf));
}

function digitsOnly(text: string): string {
  return toLatinDigits(text).replace(/\D/g, '');
}

function normalizeArabic(text: string): string {
  return text
    .replace(/\(.*?\)/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function columnIndex(key: ColumnKey): number {
  return COLUMNS.findIndex(column => column.key === key) + 1;
}

function addStudentsSheet(workbook: Workbook): Worksheet {
  const sheet = workbook.addWorksheet('الطلاب', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  COLUMNS.forEach((column, i) => {
    const sheetColumn = sheet.getColumn(i + 1);
    sheetColumn.width = column.width;
    // Text format keeps the leading zero of phones and the full national ID
    if (column.key === 'nationalId' || column.key === 'guardianPhone' || column.key === 'code') sheetColumn.numFmt = '@';
    styleHeader(sheet.getCell(1, i + 1), column.header);
  });
  return sheet;
}

function styleHeader(cell: ReturnType<Worksheet['getCell']>, text: string): void {
  cell.value = text;
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function listValidation(options: string[], error: string) {
  return {
    type: 'list' as const,
    allowBlank: true,
    formulae: [`"${options.join(',')}"`],
    showErrorMessage: true,
    error
  };
}

async function saveWorkbook(workbook: Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function failed(fileError: string): ImportResult {
  return { rows: [], fileError };
}

import { Workbook } from 'exceljs';
import { downloadImportTemplate, parseStudentsFile } from './student-excel';
import { Student } from './student.model';

const HEADERS = ['اسم الطالب رباعي', 'الرقم القومي للطالب', 'الصف الدراسي', 'رقم الفصل', 'اسم ولي الأمر', 'هاتف ولي الأمر', 'كود الطالب (اختياري)', 'الحالة (اختياري)'];

async function fileFrom(rows: unknown[][], headers = HEADERS, name = 'students.xlsx'): Promise<File> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('الطلاب');
  sheet.addRow(headers);
  rows.forEach(row => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name);
}

const year = new Date().getFullYear();
const existing: Student[] = [{
  id: 'x', code: `STD-${year}-001`, nationalId: '31001011234567', name: 'طالب مسجل', gradeId: 'G1',
  className: '1/1', guardianName: 'ولي', guardianPhone: '01000000000', status: 'منتظم', gpa: null
}];

describe('parseStudentsFile', () => {
  it('reads valid rows and fixes common Excel formatting issues', async () => {
    const file = await fileFrom([
      // Phone stored as a number (leading zero lost), national ID as a number
      ['يوسف أحمد محمد مصطفى', 31201011234567, 'الصف الأول الإعدادي', 2, 'أحمد محمد', 1012345678, '', ''],
      // Arabic-Indic digits, short grade label, "g/n" section
      ['  عمر   خالد سيد علي ', '٣١٢٠٢٠٢١٢٣٤٥٦٧', 'الثاني الإعدادي', '2/4', 'خالد سيد', '٠١١٢٣٤٥٦٧٨٩', 'std-9', 'موقوف']
    ]);

    const { rows, fileError } = await parseStudentsFile(file, existing);

    expect(fileError).toBeNull();
    expect(rows.map(r => r.errors)).toEqual([[], []]);
    expect(rows[0].student).toEqual(jasmine.objectContaining({
      name: 'يوسف أحمد محمد مصطفى', nationalId: '31201011234567', gradeId: 'G1', className: '1/2',
      guardianPhone: '01012345678', status: 'منتظم', code: `STD-${year}-002`
    }));
    expect(rows[1].student).toEqual(jasmine.objectContaining({
      name: 'عمر خالد سيد علي', nationalId: '31202021234567', gradeId: 'G2', className: '2/4',
      guardianPhone: '01123456789', status: 'موقوف', code: 'STD-9'
    }));
  });

  it('flags invalid and duplicate rows with their sheet row numbers', async () => {
    const file = await fileFrom([
      ['طالب مكرر', '31001011234567', 'الصف الأول الإعدادي', 1, 'ولي', '01011111111'],
      ['طالب أ', '31203031234567', 'الصف الأول الإعدادي', 1, 'ولي', '01011111111'],
      ['طالب ب', '31203031234567', 'الصف الأول الإعدادي', 9, 'ولي', '123'],
      ['طالب ج', '123', 'الصف الخامس', new Date(2026, 0, 2), '', '01011111111']
    ]);

    const { rows } = await parseStudentsFile(file, existing);

    expect(rows.map(r => r.rowNumber)).toEqual([2, 3, 4, 5]);
    expect(rows[0].errors[0]).toContain('مسجل بالفعل');
    expect(rows[1].errors).toEqual([]);
    expect(rows[2].errors.join()).toContain('مكرر مع صف 3');
    expect(rows[2].errors.join()).toContain('فصل 1/9 غير موجود');
    expect(rows[2].errors.join()).toContain('هاتف ولي الأمر');
    expect(rows[3].errors.join()).toContain('14 رقم');
    expect(rows[3].errors.join()).toContain('الصف الدراسي غير معروف');
    expect(rows[3].errors.join()).toContain('اسم ولي الأمر مطلوب');
    // Rows with errors don't consume an auto-generated code
    expect(rows[2].student.code).toBe('');
  });

  it('accepts the downloadable template (and says it has no students yet)', async () => {
    let blob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => ((blob = b as Blob), 'blob:test'));
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    await downloadImportTemplate();
    const result = await parseStudentsFile(new File([blob!], 'template.xlsx'), existing);

    expect(result.fileError).toContain('مفيش بيانات طلاب');
  });

  it('rejects files with missing columns or the wrong format', async () => {
    const missing = await parseStudentsFile(await fileFrom([['أ', '1']], ['اسم الطالب', 'الرقم القومي', 'الصف الدراسي']), existing);
    expect(missing.fileError).toContain('اسم ولي الأمر');

    const csv = await parseStudentsFile(new File(['a,b'], 'students.csv'), existing);
    expect(csv.fileError).toContain('.xlsx');
  });
});

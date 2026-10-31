import type { Cell, Workbook } from 'exceljs';

// exceljs is ~1MB, so it is only loaded when the admin imports or exports
export async function newWorkbook(): Promise<Workbook> {
  const { Workbook } = await import('exceljs');
  return new Workbook();
}

export async function saveWorkbook(workbook: Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function styleHeader(cell: Cell, text: string): void {
  cell.value = text;
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

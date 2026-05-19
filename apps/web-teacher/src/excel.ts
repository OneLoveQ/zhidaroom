import type * as SheetJs from 'xlsx';

export type ExcelValue = string | number | boolean | Date | null | undefined;
export type ExcelRow = Record<string, ExcelValue>;

export async function readExcelRows(file: File): Promise<ExcelRow[]> {
  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[firstSheet], {
    defval: '',
    raw: false
  });
}

export function downloadExcel(filename: string, sheetName: string, rows: ExcelRow[]): void {
  void writeExcel(filename, sheetName, rows);
}

async function writeExcel(filename: string, sheetName: string, rows: ExcelRow[]): Promise<void> {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function readCell(row: ExcelRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

async function loadXlsx(): Promise<typeof SheetJs> {
  return import('xlsx');
}

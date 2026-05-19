import type { ClassView, StudentView } from './types';

const encoder = new TextEncoder();
const ptPerMm = 72 / 25.4;
const pagePt = { width: 210 * ptPerMm, height: 297 * ptPerMm };
const canvasSize = { width: 1240, height: 1754 };

export async function downloadClassCardsPdf(classView: ClassView, students: StudentView[]): Promise<void> {
  const images = await Promise.all(students.map((student) => renderCardPage(classView, student)));
  const pdf = buildImagePdf(images);
  const data = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  downloadBlob(`${classView.grade}${classView.name}-答题码.pdf`, new Blob([data], { type: 'application/pdf' }));
}

async function renderCardPage(classView: ClassView, student: StudentView): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 PDF 画布生成');
  drawPage(ctx, classView, student);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return base64ToBytes(dataUrl.split(',')[1] ?? '');
}

function drawPage(ctx: CanvasRenderingContext2D, classView: ClassView, student: StudentView): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
  const card = { x: 140, y: 110, width: 960, height: 1360 };
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 6;
  roundRect(ctx, card.x, card.y, card.width, card.height, 22);
  ctx.stroke();
  text(ctx, `${classView.grade}${classView.name}`, 620, 205, 52, '#111827', 'bold', 'center');
  drawMarker(ctx, Number(student.cardCode.replace(/\D/g, '')), 310, 330, 620);
  drawAnswerLabels(ctx, 620, 640, 780);
  text(ctx, student.displayName, 620, 1215, 72, '#111827', 'bold', 'center');
  text(ctx, student.cardCode, 620, 1315, 88, '#111827', 'bold', 'center');
}

function drawMarker(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, size: number): void {
  const cells = createMarkerCells(id);
  const cellSize = size / 7;
  ctx.fillStyle = '#000000';
  cells.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (cell) ctx.fillRect(x + columnIndex * cellSize, y + rowIndex * cellSize, cellSize, cellSize);
  }));
}

function drawAnswerLabels(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  [
    ['A', centerX, centerY - radius / 2],
    ['B', centerX + radius / 2, centerY],
    ['C', centerX, centerY + radius / 2],
    ['D', centerX - radius / 2, centerY]
  ].forEach(([label, x, y]) => {
    text(ctx, String(label), Number(x), Number(y), 44, '#111827', 'bold', 'center');
  });
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, weight: string, align: CanvasTextAlign): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function createMarkerCells(id: number): number[][] {
  const payloadPositions: Array<[number, number]> = [];
  for (let y = 1; y <= 5; y += 1) for (let x = 1; x <= 5; x += 1) {
    if (!((x === 1 || x === 5) && (y === 1 || y === 5))) payloadPositions.push([x, y]);
  }
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => 0));
  for (let index = 0; index < 7; index += 1) {
    cells[0][index] = 1; cells[6][index] = 1; cells[index][0] = 1; cells[index][6] = 1;
  }
  cells[1][1] = 1;
  const bits = [...toBits(id, 10), ...toBits(checksum(id), 4), 1, 0, 1, 0, 1, 1, 0];
  payloadPositions.forEach(([x, y], index) => { cells[y][x] = bits[index]; });
  return cells;
}

function buildImagePdf(images: Uint8Array[]): Uint8Array {
  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n')];
  const offsets = [0], pageIds: number[] = [], objects: Array<Uint8Array | string> = ['', '<< /Type /Catalog /Pages 2 0 R >>', ''];
  images.forEach((image, index) => {
    const pageId = objects.length, imageId = pageId + 1;
    pageIds.push(pageId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pagePt.width.toFixed(2)} ${pagePt.height.toFixed(2)}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${imageId + 1} 0 R >>`);
    objects.push(makeImageObject(image));
    objects.push(makeStream(`q ${pagePt.width.toFixed(2)} 0 0 ${pagePt.height.toFixed(2)} 0 0 cm /Im${index} Do Q`));
  });
  objects[2] = `<< /Type /Pages /Count ${images.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = byteLength(chunks);
    chunks.push(encoder.encode(`${id} 0 obj\n`), typeof objects[id] === 'string' ? encoder.encode(objects[id] as string) : objects[id] as Uint8Array, encoder.encode('\nendobj\n'));
  }
  const xrefOffset = byteLength(chunks);
  chunks.push(encoder.encode(`xref\n0 ${objects.length}\n0000000000 65535 f \n`));
  for (let id = 1; id < objects.length; id += 1) chunks.push(encoder.encode(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`));
  chunks.push(encoder.encode(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));
  return concat(chunks);
}

function makeImageObject(image: Uint8Array): Uint8Array {
  return concat([encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${canvasSize.width} /Height ${canvasSize.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, encoder.encode('\nendstream')]);
}

function makeStream(content: string): string {
  return `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
}

function toBits(value: number, length: number): number[] {
  return value.toString(2).padStart(length, '0').slice(-length).split('').map(Number);
}

function checksum(id: number): number {
  return (id ^ (id >> 4) ^ (id >> 8)) & 0x0f;
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function byteLength(chunks: Uint8Array[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.length, 0);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(byteLength(chunks));
  let offset = 0;
  chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.length; });
  return output;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

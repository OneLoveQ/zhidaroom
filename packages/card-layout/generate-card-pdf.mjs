import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { markerCells } from './card-codec.mjs';

const outputPath = resolve('docs/card-layout/zhida-cards-one-per-page.pdf');
const cardCount = 60;
const ptPerMm = 72 / 25.4;
const page = { width: 210 * ptPerMm, height: 297 * ptPerMm };
const card = { width: 125 * ptPerMm, height: 188 * ptPerMm };
const origin = { x: (page.width - card.width) / 2, y: (page.height - card.height) / 2 };

function pdfText(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function rectTop(xMm, yMm, wMm, hMm, fill = false) {
  const x = origin.x + xMm * ptPerMm;
  const y = page.height - origin.y - (yMm + hMm) * ptPerMm;
  const w = wMm * ptPerMm;
  const h = hMm * ptPerMm;
  return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill ? 'f' : 'S'}`;
}

function textTop(text, xMm, yMm, size, bold = true) {
  const x = origin.x + xMm * ptPerMm;
  const y = page.height - origin.y - yMm * ptPerMm;
  const font = bold ? '/F2' : '/F1';
  return `BT ${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfText(text)}) Tj ET`;
}

function centeredTextTop(text, xMm, yMm, size, approxWidthMm, bold = true) {
  const offsetMm = Math.max(0, approxWidthMm - text.length * size * 0.18) / 2;
  return textTop(text, xMm + offsetMm, yMm, size, bold);
}

function markerCommands(id) {
  const markerX = 26.5;
  const markerY = 47;
  const markerSize = 72;
  const cell = markerSize / 7;
  return markerCells(id)
    .flatMap((row, y) => row.map((value, x) => ({ value, x, y })))
    .filter((item) => item.value === 1)
    .map((item) => rectTop(markerX + item.x * cell, markerY + item.y * cell, cell, cell, true))
    .join('\n');
}

function pageContent(id) {
  const code = `C${String(id).padStart(3, '0')}`;
  return [
    '0 0 0 RG 0 0 0 rg',
    '1.6 w',
    rectTop(0, 0, 125, 188),
    centeredTextTop('ZhiDa AI', 0, 21, 18, 125),
    markerCommands(id),
    '1 w',
    rectTop(57, 32, 11, 11),
    rectTop(103, 79, 11, 11),
    rectTop(57, 130, 11, 11),
    rectTop(11, 79, 11, 11),
    centeredTextTop('A', 57, 41, 22, 11),
    centeredTextTop('B', 103, 88, 22, 11),
    centeredTextTop('C', 57, 139, 22, 11),
    centeredTextTop('D', 11, 88, 22, 11),
    centeredTextTop(code, 0, 171, 38, 125)
  ].join('\n');
}

function makeStream(content) {
  return `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`;
}

function buildPdf() {
  const objects = [''];
  const pageIds = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  for (let id = 1; id <= cardCount; id += 1) {
    const pageObjId = objects.length;
    const contentObjId = pageObjId + 1;
    pageIds.push(pageObjId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width.toFixed(2)} ${page.height.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>`);
    objects.push(makeStream(pageContent(id)));
  }

  objects[2] = `<< /Type /Pages /Count ${cardCount} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
  const chunks = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
  const offsets = [0];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(chunks.join(''), 'binary');
    chunks.push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(''), 'binary');
  chunks.push(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let id = 1; id < objects.length; id += 1) {
    chunks.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.from(chunks.join(''), 'binary');
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, buildPdf());
console.log(`已生成 60 页单码 PDF: ${outputPath}`);

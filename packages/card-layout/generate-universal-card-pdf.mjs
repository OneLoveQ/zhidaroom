import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { markerCells } from './card-codec.mjs';

const outputPath = resolve('docs/card-layout/zhida-universal-cards-c001-c060.pdf');
const cardCount = 60;
const cardsPerPage = 1;
const ptPerMm = 72 / 25.4;
const page = { width: 210 * ptPerMm, height: 297 * ptPerMm };
const card = { width: 176, height: 176 };
const positions = [{ x: 17, y: 60.5 }];

function pdfText(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function utf16Hex(text) {
  return Buffer.from(`\ufeff${text}`, 'utf16le').swap16().toString('hex').toUpperCase();
}

function rectTop(xMm, yMm, wMm, hMm, fill = false) {
  const x = xMm * ptPerMm;
  const y = page.height - (yMm + hMm) * ptPerMm;
  const w = wMm * ptPerMm;
  const h = hMm * ptPerMm;
  return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill ? 'f' : 'S'}`;
}

function lineWidth(width) {
  return `${(width * ptPerMm).toFixed(2)} w`;
}

function textTop(text, xMm, yMm, size, bold = true) {
  const x = xMm * ptPerMm;
  const y = page.height - yMm * ptPerMm;
  const font = bold ? '/F2' : '/F1';
  return `BT ${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfText(text)}) Tj ET`;
}

function chineseTextTop(text, xMm, yMm, size) {
  const x = xMm * ptPerMm;
  const y = page.height - yMm * ptPerMm;
  return `BT /F3 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td <${utf16Hex(text)}> Tj ET`;
}

function centeredTextTop(text, xMm, yMm, size, widthMm, bold = true) {
  const offset = Math.max(0, widthMm - text.length * size * 0.18) / 2;
  return textTop(text, xMm + offset, yMm, size, bold);
}

function centeredChineseTextTop(text, xMm, yMm, size, widthMm) {
  const offset = Math.max(0, widthMm - text.length * size * 0.19) / 2;
  return chineseTextTop(text, xMm + offset, yMm, size);
}

function markerCommands(id, xMm, yMm, sizeMm) {
  const cell = sizeMm / 7;
  return markerCells(id)
    .flatMap((row, y) => row.map((value, x) => ({ value, x, y })))
    .filter((item) => item.value === 1)
    .map((item) => rectTop(xMm + item.x * cell, yMm + item.y * cell, cell, cell, true))
    .join('\n');
}

function answerLabel(text, xMm, yMm) {
  return [
    '1 1 1 rg',
    rectTop(xMm - 7, yMm - 12.5, 14, 14, true),
    '0 0 0 rg',
    centeredTextTop(text, xMm - 7, yMm, 18, 14)
  ].join('\n');
}

function cardContent(id, x, y) {
  const code = `C${String(id).padStart(3, '0')}`;
  const marker = { x: x + 41, y: y + 49, size: 94 };
  return [
    '0 0 0 RG 0 0 0 rg',
    lineWidth(0.7),
    rectTop(x, y, card.width, card.height),
    centeredChineseTextTop('智答课堂', x, y + 25, 38, card.width),
    markerCommands(id, marker.x, marker.y, marker.size),
    answerLabel('A', x + 88, y + 45),
    answerLabel('B', x + 154, y + 108),
    answerLabel('C', x + 88, y + 151),
    answerLabel('D', x + 22, y + 108),
    centeredTextTop(code, x, y + 168, 56, card.width)
  ].join('\n');
}

function pageContent(pageIndex) {
  return positions
    .map((position, index) => pageIndex * cardsPerPage + index + 1)
    .filter((id) => id <= cardCount)
    .map((id, index) => cardContent(id, positions[index].x, positions[index].y))
    .join('\n');
}

function makeStream(content) {
  return `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`;
}

function buildPdf() {
  const objects = [''];
  const pageIds = [];
  const pageCount = Math.ceil(cardCount / cardsPerPage);
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  objects.push('<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [6 0 R] >>');
  objects.push('<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> >>');

  for (let index = 0; index < pageCount; index += 1) {
    const pageObjId = objects.length;
    const contentObjId = pageObjId + 1;
    pageIds.push(pageObjId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width.toFixed(2)} ${page.height.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjId} 0 R >>`);
    objects.push(makeStream(pageContent(index)));
  }

  objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;
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
console.log(`已生成通用答题码 PDF: ${outputPath}`);

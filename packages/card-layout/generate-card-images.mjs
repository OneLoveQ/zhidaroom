import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { markerCells } from './card-codec.mjs';

const cardCount = 60;
const cardsPerPage = 4;
const outputRoot = resolve('docs/card-layout/print-images');
const pageWidth = 210;
const pageHeight = 297;
const cardWidth = 90;
const cardHeight = 130;
const positions = [
  { x: 10, y: 10 },
  { x: 110, y: 10 },
  { x: 10, y: 148 },
  { x: 110, y: 148 }
];

function markerRects(id) {
  const cell = 54 / 7;
  return markerCells(id)
    .flatMap((row, y) => row.map((value, x) => ({ value, x, y })))
    .filter((item) => item.value === 1)
    .map((item) => `<rect x="${18 + item.x * cell}" y="${30 + item.y * cell}" width="${cell}" height="${cell}" />`)
    .join('');
}

function cardSvg(id, x, y) {
  const code = `C${String(id).padStart(3, '0')}`;
  return `<g transform="translate(${x} ${y})">
    <rect class="card-border" x="0" y="0" width="${cardWidth}" height="${cardHeight}" />
    <text class="brand" x="45" y="15">智答课堂 AI</text>
    <g class="marker" aria-label="${code}">${markerRects(id)}</g>
    <text class="answer" x="45" y="25">A</text>
    <text class="answer" x="83.5" y="59">B</text>
    <text class="answer" x="45" y="103">C</text>
    <text class="answer" x="6.5" y="59">D</text>
    <rect class="answer-box" x="39.5" y="17" width="11" height="11" />
    <rect class="answer-box" x="73" y="51" width="11" height="11" />
    <rect class="answer-box" x="39.5" y="88" width="11" height="11" />
    <rect class="answer-box" x="6" y="51" width="11" height="11" />
    <text class="card-code" x="45" y="119">${code}</text>
  </g>`;
}

function pageSvg(pageNo) {
  const startId = (pageNo - 1) * cardsPerPage + 1;
  const cards = positions
    .map((position, index) => {
      const id = startId + index;
      return id <= cardCount ? cardSvg(id, position.x, position.y) : '';
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${pageWidth} ${pageHeight}">
  <style>
    .card-border,.answer-box{fill:#fff;stroke:#111;stroke-width:.6}
    .answer-box{stroke-width:.5}
    .marker rect{fill:#000}
    text{font-family:Arial,"Microsoft YaHei",sans-serif;text-anchor:middle;dominant-baseline:middle;fill:#111}
    .brand{font-size:4.2px;font-weight:700}
    .answer{font-size:7.8px;font-weight:900}
    .card-code{font-size:11.2px;font-weight:800}
  </style>
  <rect width="${pageWidth}" height="${pageHeight}" fill="#fff" />
  ${cards}
</svg>
`;
}

function folderForPage(pageNo) {
  return pageNo <= 8 ? 'pages-01-08' : 'pages-09-15';
}

const pageCount = Math.ceil(cardCount / cardsPerPage);
await mkdir(resolve(outputRoot, 'pages-01-08'), { recursive: true });
await mkdir(resolve(outputRoot, 'pages-09-15'), { recursive: true });

for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
  const filename = `zhida-card-page-${String(pageNo).padStart(2, '0')}.svg`;
  await writeFile(resolve(outputRoot, folderForPage(pageNo), filename), pageSvg(pageNo), 'utf8');
}

console.log(`已生成 ${pageCount} 张 A4 图片页: ${outputRoot}`);

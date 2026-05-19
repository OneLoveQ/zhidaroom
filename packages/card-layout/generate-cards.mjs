import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { markerCells } from './card-codec.mjs';

const cardCount = 60;
const outputPath = resolve('docs/card-layout/zhida-cards-v1.html');

function markerSvg(id) {
  const size = 350;
  const cell = size / 7;
  const rects = markerCells(id)
    .flatMap((row, y) => row.map((value, x) => ({ value, x, y })))
    .filter((item) => item.value === 1)
    .map((item) => `<rect x="${item.x * cell}" y="${item.y * cell}" width="${cell}" height="${cell}" />`)
    .join('');
  return `<svg class="marker" viewBox="0 0 ${size} ${size}" role="img" aria-label="C${String(id).padStart(3, '0')}">${rects}</svg>`;
}

function cardHtml(id) {
  const code = `C${String(id).padStart(3, '0')}`;
  return `
    <section class="card">
      <div class="answer top">A</div>
      <div class="answer right">B</div>
      <div class="answer bottom">C</div>
      <div class="answer left">D</div>
      <div class="brand">智答课堂 AI</div>
      <div class="code">${markerSvg(id)}</div>
      <div class="card-code">${code}</div>
    </section>`;
}

function html() {
  const cards = Array.from({ length: cardCount }, (_, index) => cardHtml(index + 1)).join('');
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>智答课堂纸质答题卡 v1</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font-family: Arial, "Microsoft YaHei", sans-serif; }
      main { display: grid; gap: 8mm; grid-template-columns: repeat(2, 90mm); justify-content: center; }
      .card { border: 0.6mm solid #111; height: 130mm; page-break-inside: avoid; position: relative; width: 90mm; }
      .card:nth-child(4n) { break-after: page; }
      .brand { font-size: 12pt; font-weight: 700; left: 0; position: absolute; right: 0; text-align: center; top: 8mm; }
      .code { height: 54mm; left: 18mm; position: absolute; top: 30mm; width: 54mm; }
      .marker { display: block; fill: #000; height: 100%; width: 100%; }
      .card-code { bottom: 13mm; font-size: 24pt; font-weight: 800; left: 0; position: absolute; right: 0; text-align: center; }
      .answer { align-items: center; border: 0.5mm solid #111; display: flex; font-size: 22pt; font-weight: 900; height: 11mm; justify-content: center; position: absolute; width: 11mm; }
      .top { left: 39.5mm; top: 17mm; }
      .right { right: 6mm; top: 51mm; }
      .bottom { bottom: 31mm; left: 39.5mm; }
      .left { left: 6mm; top: 51mm; }
    </style>
  </head>
  <body><main>${cards}</main></body>
</html>`;
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html(), 'utf8');
console.log(`已生成 ${cardCount} 张测试卡: ${outputPath}`);

import { decodeMarkerCells, markerCells } from './card-codec.mjs';

const cardCount = 60;

for (let id = 1; id <= cardCount; id += 1) {
  const decoded = decodeMarkerCells(markerCells(id));
  const expected = `C${String(id).padStart(3, '0')}`;
  if (!decoded.valid || decoded.cardCode !== expected) {
    throw new Error(`卡片编码校验失败: ${expected}`);
  }
}

console.log(`已验证 ${cardCount} 张测试卡编码。`);

import { describe, expect, it } from 'vitest';
import {
  createMarkerCells,
  decodeObservedCells,
  orientCellsForAnswer
} from '../src/card-codec.js';
import type { AnswerOption, MarkerCells } from '../src/card-codec.js';

const options: AnswerOption[] = ['A', 'B', 'C', 'D'];

describe('ZhiDaCard v1 解码核心', () => {
  it('识别 C001-C060 的卡号和 A/B/C/D 方向', () => {
    for (let id = 1; id <= 60; id += 1) {
      for (const option of options) {
        const observed = orientCellsForAnswer(createMarkerCells(id), option);
        const decoded = decodeObservedCells(observed);

        expect(decoded).toMatchObject({
          cardCode: `C${String(id).padStart(3, '0')}`,
          selectedOption: option,
          valid: true,
          recognitionScore: 1
        });
      }
    }
  });

  it('校验位被破坏时给出低置信度无效结果', () => {
    const standard = createMarkerCells(12);
    standard[3][3] = flip(standard[3][3]);
    const observed = orientCellsForAnswer(standard, 'C');

    const decoded = decodeObservedCells(observed);

    expect(decoded.valid).toBe(false);
    expect(decoded.selectedOption).toBe('C');
    expect(decoded.recognitionScore).toBeLessThan(1);
    expect(decoded.reasons).toContain('checksum');
  });

  it('外框被破坏时拒绝确认', () => {
    const observed = orientCellsForAnswer(createMarkerCells(5), 'B');
    observed[0][3] = 0;

    const decoded = decodeObservedCells(observed);

    expect(decoded.valid).toBe(false);
    expect(decoded.reasons).toContain('border');
  });
});

function flip(value: MarkerCells[number][number]): MarkerCells[number][number] {
  return value === 1 ? 0 : 1;
}

import { describe, expect, it } from 'vitest';
import { createMarkerCells, decodeObservedCells, orientCellsForAnswer } from '../src/card-codec.js';
import { FrameConfirmor } from '../src/frame-confirmation.js';

describe('FrameConfirmor', () => {
  it('连续 3 帧同一卡号同答案后确认', () => {
    const confirmor = new FrameConfirmor(3, 0.75);
    const frame = decodeObservedCells(orientCellsForAnswer(createMarkerCells(7), 'B'));

    expect(confirmor.accept(frame)).toBeUndefined();
    expect(confirmor.accept(frame)).toBeUndefined();

    const confirmed = confirmor.accept(frame, new Date('2026-05-16T00:00:00+08:00'));

    expect(confirmed).toMatchObject({
      cardCode: 'C007',
      selectedOption: 'B',
      recognitionScore: 1
    });
  });

  it('答案方向变化时重新计数，以最新方向为准', () => {
    const confirmor = new FrameConfirmor(2, 0.75);
    const first = decodeObservedCells(orientCellsForAnswer(createMarkerCells(8), 'A'));
    const latest = decodeObservedCells(orientCellsForAnswer(createMarkerCells(8), 'D'));

    expect(confirmor.accept(first)).toBeUndefined();
    expect(confirmor.accept(latest)).toBeUndefined();

    const confirmed = confirmor.accept(latest);

    expect(confirmed?.selectedOption).toBe('D');
  });

  it('低置信度或无效帧会打断确认', () => {
    const confirmor = new FrameConfirmor(2, 0.75);
    const valid = decodeObservedCells(orientCellsForAnswer(createMarkerCells(9), 'C'));
    const invalid = { ...valid, valid: false, recognitionScore: 0.5 };

    expect(confirmor.accept(valid)).toBeUndefined();
    expect(confirmor.accept(invalid)).toBeUndefined();
    expect(confirmor.accept(valid)).toBeUndefined();
    expect(confirmor.accept(valid)?.selectedOption).toBe('C');
  });
});

import { describe, expect, it } from 'vitest';
import { createMarkerCells, decodeObservedCells, orientCellsForAnswer } from '../src/card-codec.js';
import { renderMarkerCells, sampleMarkerCells } from '../src/image-sampler.js';

describe('image-sampler', () => {
  it('从正方形灰度图采样 7×7 网格并解码', () => {
    const image = renderMarkerCells(createMarkerCells(23), 18);
    const cells = sampleMarkerCells(image, {
      topLeft: { x: 0, y: 0 },
      topRight: { x: image.width - 1, y: 0 },
      bottomRight: { x: image.width - 1, y: image.height - 1 },
      bottomLeft: { x: 0, y: image.height - 1 }
    });

    expect(decodeObservedCells(cells)).toMatchObject({
      cardCode: 'C023',
      selectedOption: 'A',
      valid: true
    });
  });

  it('从旋转后的灰度图采样并保留答案方向', () => {
    const image = renderMarkerCells(orientCellsForAnswer(createMarkerCells(31), 'D'), 18);
    const cells = sampleMarkerCells(image, {
      topLeft: { x: 0, y: 0 },
      topRight: { x: image.width - 1, y: 0 },
      bottomRight: { x: image.width - 1, y: image.height - 1 },
      bottomLeft: { x: 0, y: image.height - 1 }
    });

    expect(decodeObservedCells(cells)).toMatchObject({
      cardCode: 'C031',
      selectedOption: 'D',
      valid: true
    });
  });

  it('支持轻微透视四边形采样', () => {
    const image = renderMarkerCells(createMarkerCells(44), 24);
    const cells = sampleMarkerCells(image, {
      topLeft: { x: 3, y: 4 },
      topRight: { x: image.width - 5, y: 1 },
      bottomRight: { x: image.width - 2, y: image.height - 4 },
      bottomLeft: { x: 1, y: image.height - 2 }
    });

    expect(decodeObservedCells(cells)).toMatchObject({
      cardCode: 'C044',
      selectedOption: 'A',
      valid: true
    });
  });
});

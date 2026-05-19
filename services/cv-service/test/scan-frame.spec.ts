import { describe, expect, it } from 'vitest';
import { createMarkerCells, orientCellsForAnswer } from '../src/card-codec.js';
import { type GrayImage, placeImageOnCanvas, renderMarkerCells } from '../src/image-sampler.js';
import { ScanFramePipeline } from '../src/scan-frame.js';

describe('ScanFramePipeline', () => {
  it('从灰度图完成定位、采样、解码和三帧确认', () => {
    const pipeline = new ScanFramePipeline();
    const marker = renderMarkerCells(orientCellsForAnswer(createMarkerCells(33), 'C'), 18);
    const image = placeImageOnCanvas(marker, 260, 260, { x: 40, y: 52 });

    expect(pipeline.scan(image).confirmed).toBeUndefined();
    expect(pipeline.scan(image).confirmed).toBeUndefined();

    const result = pipeline.scan(image, new Date('2026-05-16T11:00:00+08:00'));

    expect(result.decoded).toMatchObject({
      cardCode: 'C033',
      selectedOption: 'C',
      valid: true
    });
    expect(result.confirmed).toMatchObject({
      cardCode: 'C033',
      selectedOption: 'C',
      recognitionScore: 1
    });
  });

  it('没有定位到码时返回明确原因', () => {
    const pipeline = new ScanFramePipeline();
    const image = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(100 * 100).fill(255)
    };

    expect(pipeline.scan(image)).toEqual({ reason: 'marker_not_found' });
  });

  it('同一帧中识别并确认多个学生答案', () => {
    const pipeline = new ScanFramePipeline();
    const image = createMultiMarkerFrame();

    pipeline.scan(image);
    pipeline.scan(image);
    const result = pipeline.scan(image);

    expect(result.decodedList).toMatchObject([
      { cardCode: 'C041', selectedOption: 'A', valid: true },
      { cardCode: 'C042', selectedOption: 'B', valid: true },
      { cardCode: 'C043', selectedOption: 'C', valid: true }
    ]);
    expect(result.confirmedList).toMatchObject([
      { cardCode: 'C041', selectedOption: 'A' },
      { cardCode: 'C042', selectedOption: 'B' },
      { cardCode: 'C043', selectedOption: 'C' }
    ]);
  });
});

function createMultiMarkerFrame(): GrayImage {
  const image: GrayImage = {
    width: 360,
    height: 170,
    data: new Uint8ClampedArray(360 * 170).fill(255)
  };
  [
    { id: 41, answer: 'A' as const, x: 18 },
    { id: 42, answer: 'B' as const, x: 134 },
    { id: 43, answer: 'C' as const, x: 250 }
  ].forEach((item) => {
    const marker = renderMarkerCells(orientCellsForAnswer(createMarkerCells(item.id), item.answer), 12);
    pasteImage(image, marker, item.x, 20);
  });
  return image;
}

function pasteImage(target: GrayImage, source: GrayImage, offsetX: number, offsetY: number): void {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const targetX = offsetX + x;
      const targetY = offsetY + y;
      target.data[targetY * target.width + targetX] = source.data[y * source.width + x];
    }
  }
}

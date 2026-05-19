import { describe, expect, it } from 'vitest';
import { createMarkerCells, decodeObservedCells, orientCellsForAnswer } from '../src/card-codec.js';
import { locateMarkerCorners, locateMarkerCornersList } from '../src/marker-locator.js';
import {
  type GrayImage,
  placeImageOnCanvas,
  renderMarkerCells,
  sampleMarkerCells
} from '../src/image-sampler.js';

describe('marker-locator', () => {
  it('在白色画布中定位黑白码四角并完成解码', () => {
    const marker = renderMarkerCells(createMarkerCells(18), 16);
    const image = placeImageOnCanvas(marker, 260, 220, { x: 48, y: 37 });
    const corners = locateMarkerCorners(image);

    expect(corners).toEqual({
      topLeft: { x: 48, y: 37 },
      topRight: { x: 159, y: 37 },
      bottomRight: { x: 159, y: 148 },
      bottomLeft: { x: 48, y: 148 }
    });
    expect(decodeObservedCells(sampleMarkerCells(image, corners!))).toMatchObject({
      cardCode: 'C018',
      selectedOption: 'A',
      valid: true
    });
  });

  it('定位旋转方向后的码并保留选项方向', () => {
    const marker = renderMarkerCells(orientCellsForAnswer(createMarkerCells(52), 'B'), 16);
    const image = placeImageOnCanvas(marker, 240, 240, { x: 61, y: 54 });
    const corners = locateMarkerCorners(image);

    expect(decodeObservedCells(sampleMarkerCells(image, corners!))).toMatchObject({
      cardCode: 'C052',
      selectedOption: 'B',
      valid: true
    });
  });

  it('忽略码下方文字噪声，优先定位最大的正方形码块', () => {
    const marker = renderMarkerCells(orientCellsForAnswer(createMarkerCells(202), 'A'), 22);
    const image = placeImageOnCanvas(marker, 300, 320, { x: 64, y: 40 });
    addTextNoise(image, 110, 218, 80, 18);

    const corners = locateMarkerCorners(image);

    expect(corners).toEqual({
      topLeft: { x: 64, y: 40 },
      topRight: { x: 217, y: 40 },
      bottomRight: { x: 217, y: 193 },
      bottomLeft: { x: 64, y: 193 }
    });
    expect(decodeObservedCells(sampleMarkerCells(image, corners!))).toMatchObject({
      cardCode: 'C202',
      selectedOption: 'A',
      valid: true
    });
  });

  it('同一画面中定位多个答题码', () => {
    const first = renderMarkerCells(orientCellsForAnswer(createMarkerCells(21), 'A'), 14);
    const second = renderMarkerCells(orientCellsForAnswer(createMarkerCells(22), 'D'), 14);
    const image = createCanvas(320, 190);
    pasteImage(image, first, 24, 24);
    pasteImage(image, second, 184, 24);
    addTextNoise(image, 50, 130, 56, 12);
    addTextNoise(image, 210, 130, 56, 12);

    const cornersList = locateMarkerCornersList(image);
    const decoded = cornersList.map((corners) => decodeObservedCells(sampleMarkerCells(image, corners)));

    expect(decoded).toMatchObject([
      { cardCode: 'C021', selectedOption: 'A', valid: true },
      { cardCode: 'C022', selectedOption: 'D', valid: true }
    ]);
  });

  it('没有足够暗色像素时不返回定位结果', () => {
    const image = {
      width: 120,
      height: 120,
      data: new Uint8ClampedArray(120 * 120).fill(255)
    };

    expect(locateMarkerCorners(image)).toBeUndefined();
  });
});

function createCanvas(width: number, height: number): GrayImage {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height).fill(255)
  };
}

function pasteImage(target: GrayImage, source: GrayImage, offsetX: number, offsetY: number): void {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const targetX = offsetX + x;
      const targetY = offsetY + y;
      if (targetX < target.width && targetY < target.height) {
        target.data[targetY * target.width + targetX] = source.data[y * source.width + x];
      }
    }
  }
}

function addTextNoise(
  image: { width: number; height: number; data: Uint8ClampedArray },
  x: number,
  y: number,
  width: number,
  height: number
): void {
  for (let row = 0; row < height; row += 3) {
    for (let col = 0; col < width; col += 7) {
      const pixelX = x + col;
      const pixelY = y + row;
      if (pixelX < image.width && pixelY < image.height) {
        image.data[pixelY * image.width + pixelX] = 0;
      }
    }
  }
}

import type { Bit, MarkerCells } from './card-codec.js';

export interface Point {
  x: number;
  y: number;
}

export interface GrayImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface MarkerCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export function sampleMarkerCells(
  image: GrayImage,
  corners: MarkerCorners,
  threshold = 128
): MarkerCells {
  return Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => {
      const point = interpolate(corners, (x + 0.5) / 7, (y + 0.5) / 7);
      return sampleGray(image, point) < threshold ? 1 : 0;
    })
  );
}

export function sampleMarkerCellsArea(
  image: GrayImage,
  corners: MarkerCorners,
  threshold = 128
): MarkerCells {
  return Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => sampleAreaBit(image, corners, x, y, threshold))
  );
}

export function otsuThreshold(image: GrayImage): number {
  const histogram = new Array<number>(256).fill(0);
  image.data.forEach((value) => {
    histogram[value] += 1;
  });

  const total = image.data.length;
  const sum = histogram.reduce((acc, count, value) => acc + value * count, 0);
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = -1;
  let threshold = 128;

  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value];
    if (!backgroundWeight) {
      continue;
    }
    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) {
      break;
    }
    backgroundSum += value * histogram[value];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = value;
    }
  }

  return clamp(threshold, 70, 190);
}

export function renderMarkerCells(cells: MarkerCells, pixelsPerCell = 20): GrayImage {
  const size = cells.length * pixelsPerCell;
  const data = new Uint8ClampedArray(size * size);
  cells.forEach((row, cellY) => {
    row.forEach((value, cellX) => {
      for (let y = 0; y < pixelsPerCell; y += 1) {
        for (let x = 0; x < pixelsPerCell; x += 1) {
          const pixelX = cellX * pixelsPerCell + x;
          const pixelY = cellY * pixelsPerCell + y;
          data[pixelY * size + pixelX] = value === 1 ? 0 : 255;
        }
      }
    });
  });
  return { width: size, height: size, data };
}

export function placeImageOnCanvas(
  source: GrayImage,
  canvasWidth: number,
  canvasHeight: number,
  offset: Point,
  background = 255
): GrayImage {
  const data = new Uint8ClampedArray(canvasWidth * canvasHeight).fill(background);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const targetX = offset.x + x;
      const targetY = offset.y + y;
      if (targetX >= 0 && targetX < canvasWidth && targetY >= 0 && targetY < canvasHeight) {
        data[targetY * canvasWidth + targetX] = source.data[y * source.width + x];
      }
    }
  }
  return { width: canvasWidth, height: canvasHeight, data };
}

function sampleAreaBit(
  image: GrayImage,
  corners: MarkerCorners,
  cellX: number,
  cellY: number,
  threshold: number
): Bit {
  const offsets = [0.35, 0.5, 0.65];
  let total = 0;
  offsets.forEach((dy) => {
    offsets.forEach((dx) => {
      total += sampleGray(image, interpolate(corners, (cellX + dx) / 7, (cellY + dy) / 7));
    });
  });
  return total / 9 < threshold ? 1 : 0;
}

function interpolate(corners: MarkerCorners, u: number, v: number): Point {
  const top = mix(corners.topLeft, corners.topRight, u);
  const bottom = mix(corners.bottomLeft, corners.bottomRight, u);
  return mix(top, bottom, v);
}

function mix(start: Point, end: Point, ratio: number): Point {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio
  };
}

function sampleGray(image: GrayImage, point: Point): number {
  const x = clamp(Math.round(point.x), 0, image.width - 1);
  const y = clamp(Math.round(point.y), 0, image.height - 1);
  return image.data[y * image.width + x];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

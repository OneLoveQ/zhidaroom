import type { GrayImage, MarkerCorners } from './image-sampler.js';

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
  sumX: number;
  sumY: number;
  sumXX: number;
  sumYY: number;
  sumXY: number;
}

export interface LocateOptions {
  threshold?: number;
  minDarkPixels?: number;
  maxMarkers?: number;
  minSide?: number;
  rotatedCandidates?: boolean;
}

export function locateMarkerCorners(
  image: GrayImage,
  options: LocateOptions = {}
): MarkerCorners | undefined {
  return locateMarkerCornersList(image, options)[0];
}

export function locateMarkerCornersList(
  image: GrayImage,
  options: LocateOptions = {}
): MarkerCorners[] {
  const threshold = options.threshold ?? 128;
  const minDarkPixels = options.minDarkPixels ?? 40;
  const maxMarkers = options.maxMarkers ?? 80;
  const minSide = options.minSide ?? 18;
  const rotatedCandidates = options.rotatedCandidates ?? false;

  return findDarkComponents(image, threshold, minDarkPixels, minSide)
    .sort((left, right) => area(right) - area(left))
    .slice(0, maxMarkers)
    .sort((left, right) => left.minY - right.minY || left.minX - right.minX)
    .flatMap((bounds) => toCornerCandidates(bounds, rotatedCandidates));
}

function findDarkComponents(
  image: GrayImage,
  threshold: number,
  minDarkPixels: number,
  minSide: number
): Bounds[] {
  const visited = new Uint8Array(image.width * image.height);
  const components: Bounds[] = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = y * image.width + x;
      if (visited[index] || image.data[index] >= threshold) {
        continue;
      }
      const bounds = floodDarkComponent(image, x, y, threshold, visited);
      if (isCandidate(bounds, minDarkPixels, minSide)) {
        components.push(bounds);
      }
    }
  }
  return components;
}

function floodDarkComponent(
  image: GrayImage,
  startX: number,
  startY: number,
  threshold: number,
  visited: Uint8Array
): Bounds {
  const queue: Array<[number, number]> = [[startX, startY]];
  visited[startY * image.width + startX] = 1;
  let bounds = emptyBounds(startX, startY);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    bounds = updateBounds(bounds, x, y);
    visitNeighbor(image, x + 1, y, threshold, visited, queue);
    visitNeighbor(image, x - 1, y, threshold, visited, queue);
    visitNeighbor(image, x, y + 1, threshold, visited, queue);
    visitNeighbor(image, x, y - 1, threshold, visited, queue);
  }
  return bounds;
}

function visitNeighbor(
  image: GrayImage,
  x: number,
  y: number,
  threshold: number,
  visited: Uint8Array,
  queue: Array<[number, number]>
): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }
  const index = y * image.width + x;
  if (visited[index] || image.data[index] >= threshold) {
    return;
  }
  visited[index] = 1;
  queue.push([x, y]);
}

function isCandidate(bounds: Bounds, minDarkPixels: number, minSide: number): boolean {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const ratio = width / height;
  return bounds.count >= minDarkPixels && width >= minSide && height >= minSide && ratio >= 0.7 && ratio <= 1.3;
}

function area(bounds: Bounds | undefined): number {
  if (!bounds) {
    return 0;
  }
  return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
}

function updateBounds(bounds: Bounds | undefined, x: number, y: number): Bounds {
  if (!bounds) {
    return emptyBounds(x, y);
  }
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
    count: bounds.count + 1,
    sumX: bounds.sumX + x,
    sumY: bounds.sumY + y,
    sumXX: bounds.sumXX + x * x,
    sumYY: bounds.sumYY + y * y,
    sumXY: bounds.sumXY + x * y
  };
}

function emptyBounds(x: number, y: number): Bounds {
  return {
    minX: x,
    minY: y,
    maxX: x,
    maxY: y,
    count: 0,
    sumX: 0,
    sumY: 0,
    sumXX: 0,
    sumYY: 0,
    sumXY: 0
  };
}

function toCornerCandidates(bounds: Bounds, rotatedCandidates: boolean): MarkerCorners[] {
  const axisAligned = toCorners(bounds);
  if (!rotatedCandidates) {
    return [axisAligned];
  }
  return [...toAngleSweepCorners(bounds), ...toMomentCorners(bounds), axisAligned];
}

function toCorners(bounds: Bounds): MarkerCorners {
  return {
    topLeft: { x: bounds.minX, y: bounds.minY },
    topRight: { x: bounds.maxX, y: bounds.minY },
    bottomRight: { x: bounds.maxX, y: bounds.maxY },
    bottomLeft: { x: bounds.minX, y: bounds.maxY }
  };
}

function toAngleSweepCorners(bounds: Bounds): MarkerCorners[] {
  return [-18, -12, -6, 6, 12, 18].map((degrees) => toRotatedCorners(bounds, degrees * Math.PI / 180));
}

function toMomentCorners(bounds: Bounds): MarkerCorners[] {
  if (bounds.count <= 0) {
    return [];
  }
  const centerX = bounds.sumX / bounds.count;
  const centerY = bounds.sumY / bounds.count;
  const varianceX = bounds.sumXX / bounds.count - centerX * centerX;
  const varianceY = bounds.sumYY / bounds.count - centerY * centerY;
  const covariance = bounds.sumXY / bounds.count - centerX * centerY;
  const angle = 0.5 * Math.atan2(2 * covariance, varianceX - varianceY);
  if (isAxisAligned(angle)) {
    return [];
  }
  return [toRotatedCorners(bounds, angle)];
}

function toRotatedCorners(bounds: Bounds, angle: number): MarkerCorners {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const projectionScale = Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
  const side = Math.max(width, height) / Math.max(projectionScale, 1);
  const half = side / 2;
  const unitX = { x: Math.cos(angle), y: Math.sin(angle) };
  const unitY = { x: -Math.sin(angle), y: Math.cos(angle) };
  return orderCorners([
    point(centerX, centerY, unitX, unitY, -half, -half),
    point(centerX, centerY, unitX, unitY, half, -half),
    point(centerX, centerY, unitX, unitY, half, half),
    point(centerX, centerY, unitX, unitY, -half, half)
  ]);
}

function isAxisAligned(angle: number): boolean {
  const normalized = Math.abs(((angle + Math.PI / 4) % (Math.PI / 2)) - Math.PI / 4);
  return normalized < 0.08;
}

function point(
  centerX: number,
  centerY: number,
  unitX: { x: number; y: number },
  unitY: { x: number; y: number },
  x: number,
  y: number
) {
  return {
    x: centerX + unitX.x * x + unitY.x * y,
    y: centerY + unitX.y * x + unitY.y * y
  };
}

function orderCorners(points: Array<{ x: number; y: number }>): MarkerCorners {
  const sorted = [...points].sort((left, right) => left.y - right.y);
  const top = sorted.slice(0, 2).sort((left, right) => left.x - right.x);
  const bottom = sorted.slice(2).sort((left, right) => left.x - right.x);
  return {
    topLeft: top[0],
    topRight: top[1],
    bottomRight: bottom[1],
    bottomLeft: bottom[0]
  };
}

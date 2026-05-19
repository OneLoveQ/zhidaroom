import type { GrayImage, MarkerCorners } from './image-sampler.js';

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
}

export interface LocateOptions {
  threshold?: number;
  minDarkPixels?: number;
  maxMarkers?: number;
  minSide?: number;
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

  return findDarkComponents(image, threshold, minDarkPixels, minSide)
    .sort((left, right) => area(right) - area(left))
    .slice(0, maxMarkers)
    .sort((left, right) => left.minY - right.minY || left.minX - right.minX)
    .map(toCorners);
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
  let bounds: Bounds = { minX: startX, minY: startY, maxX: startX, maxY: startY, count: 0 };

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
    return { minX: x, minY: y, maxX: x, maxY: y, count: 1 };
  }
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
    count: bounds.count + 1
  };
}

function toCorners(bounds: Bounds): MarkerCorners {
  return {
    topLeft: { x: bounds.minX, y: bounds.minY },
    topRight: { x: bounds.maxX, y: bounds.minY },
    bottomRight: { x: bounds.maxX, y: bounds.maxY },
    bottomLeft: { x: bounds.minX, y: bounds.maxY }
  };
}

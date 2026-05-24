import { decodeObservedCells, type Bit, type DecodeResult, type MarkerCells } from '../../../services/cv-service/src/card-codec';
import { FrameConfirmor, type ConfirmedAnswer } from '../../../services/cv-service/src/frame-confirmation';
import type { GrayImage, MarkerCorners, Point } from '../../../services/cv-service/src/image-sampler';
import { sampleMarkerCells } from '../../../services/cv-service/src/image-sampler';
import { locateMarkerCornersList } from '../../../services/cv-service/src/marker-locator';

export type DebugAlgorithm = 'baseline' | 'center' | 'adaptive' | 'multiSample' | 'fastConfirm';
export type ResolutionPreset = '720p' | '1080p' | '1440p' | '4k';

export interface DebugScanConfig {
  algorithm: DebugAlgorithm;
  maxWidth: number;
  cropRatio: number;
  minFrames: number;
  thresholdMode: 'fixed' | 'adaptive';
}

export interface DebugFrameMetrics {
  frameMs: number;
  threshold: number;
  candidates: number;
  decoded: DecodeResult[];
  confirmed: ConfirmedAnswer[];
  imageSize: string;
}

export const resolutionPresets: Record<ResolutionPreset, { width: number; height: number; label: string }> = {
  '720p': { width: 1280, height: 720, label: '720p' },
  '1080p': { width: 1920, height: 1080, label: '1080p' },
  '1440p': { width: 2560, height: 1440, label: '1440p' },
  '4k': { width: 3840, height: 2160, label: '4K' }
};

export function createDebugConfig(algorithm: DebugAlgorithm): DebugScanConfig {
  if (algorithm === 'center') return { algorithm, maxWidth: 640, cropRatio: 0.72, minFrames: 3, thresholdMode: 'fixed' };
  if (algorithm === 'adaptive') return { algorithm, maxWidth: 640, cropRatio: 1, minFrames: 3, thresholdMode: 'adaptive' };
  if (algorithm === 'multiSample') return { algorithm, maxWidth: 720, cropRatio: 0.78, minFrames: 3, thresholdMode: 'adaptive' };
  if (algorithm === 'fastConfirm') return { algorithm, maxWidth: 640, cropRatio: 0.72, minFrames: 2, thresholdMode: 'adaptive' };
  return { algorithm, maxWidth: 520, cropRatio: 1, minFrames: 3, thresholdMode: 'fixed' };
}

export function createDebugConfirmor(config: DebugScanConfig): FrameConfirmor {
  return new FrameConfirmor(config.minFrames, 0.75);
}

export function captureDebugFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  config: DebugScanConfig
): GrayImage | undefined {
  if (!video.videoWidth || !video.videoHeight) return undefined;
  const cropRatio = Math.min(1, Math.max(0.45, config.cropRatio));
  const sourceWidth = Math.round(video.videoWidth * cropRatio);
  const sourceHeight = Math.round(video.videoHeight * cropRatio);
  const sourceX = Math.round((video.videoWidth - sourceWidth) / 2);
  const sourceY = Math.round((video.videoHeight - sourceHeight) / 2);
  const scale = Math.min(1, config.maxWidth / sourceWidth);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const data = new Uint8ClampedArray(width * height);
  for (let index = 0; index < data.length; index += 1) {
    const offset = index * 4;
    data[index] = Math.round(rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114);
  }
  return { width, height, data };
}

export function scanDebugFrame(
  image: GrayImage,
  config: DebugScanConfig,
  confirmor: FrameConfirmor,
  now = new Date()
): DebugFrameMetrics {
  const started = performance.now();
  const threshold = config.thresholdMode === 'adaptive' ? otsuThreshold(image) : 128;
  const cornersList = locateMarkerCornersList(image, {
    threshold,
    minDarkPixels: 28,
    maxMarkers: 120,
    minSide: 14,
    rotatedCandidates: true
  });
  const decoded = cornersList
    .map((corners) => decodeObservedCells(sampleCells(image, corners, threshold, config.algorithm === 'multiSample')))
    .filter((item) => item.valid);
  const confirmed = confirmor.acceptMany(decoded, now);
  return {
    frameMs: Number((performance.now() - started).toFixed(1)),
    threshold,
    candidates: cornersList.length,
    decoded,
    confirmed,
    imageSize: `${image.width}x${image.height}`
  };
}

function sampleCells(image: GrayImage, corners: MarkerCorners, threshold: number, areaMode: boolean): MarkerCells {
  if (!areaMode) return sampleMarkerCells(image, corners, threshold);
  return Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => sampleAreaBit(image, corners, x, y, threshold))
  );
}

function sampleAreaBit(image: GrayImage, corners: MarkerCorners, cellX: number, cellY: number, threshold: number): Bit {
  const offsets = [0.35, 0.5, 0.65];
  let total = 0;
  offsets.forEach((dy) => offsets.forEach((dx) => {
    const point = interpolate(corners, (cellX + dx) / 7, (cellY + dy) / 7);
    total += sampleGray(image, point);
  }));
  return total / 9 < threshold ? 1 : 0;
}

function otsuThreshold(image: GrayImage): number {
  const histogram = new Array<number>(256).fill(0);
  image.data.forEach((value) => { histogram[value] += 1; });
  const total = image.data.length;
  let sum = histogram.reduce((acc, count, value) => acc + value * count, 0);
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = -1;
  let threshold = 128;
  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value];
    if (!backgroundWeight) continue;
    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += value * histogram[value];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = value;
    }
  }
  return Math.min(190, Math.max(70, threshold));
}

function interpolate(corners: MarkerCorners, u: number, v: number): Point {
  const top = mix(corners.topLeft, corners.topRight, u);
  const bottom = mix(corners.bottomLeft, corners.bottomRight, u);
  return mix(top, bottom, v);
}

function mix(start: Point, end: Point, ratio: number): Point {
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
}

function sampleGray(image: GrayImage, point: Point): number {
  const x = Math.min(Math.max(Math.round(point.x), 0), image.width - 1);
  const y = Math.min(Math.max(Math.round(point.y), 0), image.height - 1);
  return image.data[y * image.width + x];
}

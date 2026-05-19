import type { GrayImage } from '../../../services/cv-service/src/image-sampler';

export function captureCenterGrayFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  size = 260
): GrayImage | undefined {
  if (!video.videoWidth || !video.videoHeight) {
    return undefined;
  }

  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return undefined;
  }

  const sourceSize = Math.min(video.videoWidth, video.videoHeight);
  const sourceX = (video.videoWidth - sourceSize) / 2;
  const sourceY = (video.videoHeight - sourceSize) / 2;
  context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  const rgba = context.getImageData(0, 0, size, size).data;
  const data = new Uint8ClampedArray(size * size);
  for (let index = 0; index < data.length; index += 1) {
    const offset = index * 4;
    data[index] = Math.round(rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114);
  }
  return { width: size, height: size, data };
}

export function captureGrayFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  maxWidth = 520
): GrayImage | undefined {
  if (!video.videoWidth || !video.videoHeight) {
    return undefined;
  }

  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return undefined;
  }

  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const data = new Uint8ClampedArray(width * height);
  for (let index = 0; index < data.length; index += 1) {
    const offset = index * 4;
    data[index] = Math.round(rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114);
  }
  return { width, height, data };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('题目照片读取失败'));
    reader.readAsDataURL(file);
  });
}

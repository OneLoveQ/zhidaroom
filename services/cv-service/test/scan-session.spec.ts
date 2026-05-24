import { describe, expect, it } from 'vitest';
import { createMarkerCells, orientCellsForAnswer } from '../src/card-codec.js';
import { type GrayImage, placeImageOnCanvas, renderMarkerCells } from '../src/image-sampler.js';
import { ScanSession } from '../src/scan-session.js';

describe('ScanSession', () => {
  it('把连续扫码帧转换为后端批量上传 payload', () => {
    const session = new ScanSession('question_001', 'phone_001');
    const first = createFrame(3, 'A');
    const second = createFrame(4, 'D');

    session.acceptFrame(first);
    session.acceptFrame(first);
    session.acceptFrame(first, new Date('2026-05-16T10:00:00+08:00'));
    session.acceptFrame(second);
    session.acceptFrame(second);
    session.acceptFrame(second, new Date('2026-05-16T10:00:02+08:00'));

    expect(session.createUploadPayload()).toMatchObject({
      questionId: 'question_001',
      deviceId: 'phone_001',
      answers: [
        { cardCode: 'C003', selectedOption: 'A' },
        { cardCode: 'C004', selectedOption: 'D' }
      ]
    });
  });

  it('同一卡号重新确认后上传最新答案', () => {
    const session = new ScanSession('question_001', 'phone_001');
    const first = createFrame(6, 'A');
    const latest = createFrame(6, 'C');

    session.acceptFrame(first);
    session.acceptFrame(first);
    session.acceptFrame(first, new Date('2026-05-16T10:00:00+08:00'));
    session.acceptFrame(latest);
    session.acceptFrame(latest);
    session.acceptFrame(latest, new Date('2026-05-16T10:00:03+08:00'));

    expect(session.drainUploadPayload().answers).toMatchObject([
      { cardCode: 'C006', selectedOption: 'C' }
    ]);
    expect(session.hasPendingAnswers()).toBe(false);
  });

  it('已确认且答案未变化时不重复进入上传队列', () => {
    const session = new ScanSession('question_001', 'phone_001');
    const image = createFrame(7, 'B');

    session.acceptFrame(image);
    session.acceptFrame(image);
    session.acceptFrame(image);
    const payload = session.createUploadPayload();
    session.acknowledgeAnswers(payload.answers.map((answer) => answer.cardCode));

    session.acceptFrame(image);
    session.acceptFrame(image);
    session.acceptFrame(image);

    expect(session.hasPendingAnswers()).toBe(false);
  });

  it('同一帧批量采集多个学生答案', () => {
    const session = new ScanSession('question_002', 'phone_001');
    const image = createMultiFrame();

    session.acceptFrame(image);
    session.acceptFrame(image);
    session.acceptFrame(image);

    expect(session.createUploadPayload().answers).toMatchObject([
      { cardCode: 'C051', selectedOption: 'A' },
      { cardCode: 'C052', selectedOption: 'D' }
    ]);
  });
});

function createFrame(id: number, answer: 'A' | 'B' | 'C' | 'D') {
  const marker = renderMarkerCells(orientCellsForAnswer(createMarkerCells(id), answer), 18);
  return placeImageOnCanvas(marker, 260, 260, { x: 40, y: 52 });
}

function createMultiFrame(): GrayImage {
  const image: GrayImage = {
    width: 260,
    height: 150,
    data: new Uint8ClampedArray(260 * 150).fill(255)
  };
  pasteImage(image, renderMarkerCells(orientCellsForAnswer(createMarkerCells(51), 'A'), 12), 20, 20);
  pasteImage(image, renderMarkerCells(orientCellsForAnswer(createMarkerCells(52), 'D'), 12), 148, 20);
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

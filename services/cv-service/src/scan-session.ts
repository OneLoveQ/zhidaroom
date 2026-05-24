import { AnswerBatchCollector, type BatchAnswersPayload } from './answer-batch.js';
import type { GrayImage } from './image-sampler.js';
import { ScanFramePipeline, type ScanFrameResult } from './scan-frame.js';

export interface ScanSessionResult extends ScanFrameResult {
  pendingCount: number;
}

export class ScanSession {
  private readonly pipeline = new ScanFramePipeline();
  private readonly collector: AnswerBatchCollector;
  private readonly acceptedAnswers = new Map<string, string>();

  constructor(questionId: string, deviceId: string) {
    this.collector = new AnswerBatchCollector(questionId, deviceId);
  }

  acceptFrame(image: GrayImage, now = new Date()): ScanSessionResult {
    const result = this.pipeline.scan(image, now);
    (result.confirmedList ?? (result.confirmed ? [result.confirmed] : [])).forEach((answer) =>
      this.acceptConfirmedAnswer(answer)
    );
    return {
      ...result,
      pendingCount: this.collector.size()
    };
  }

  hasPendingAnswers(): boolean {
    return this.collector.isReady();
  }

  createUploadPayload(): BatchAnswersPayload {
    return this.collector.toPayload();
  }

  drainUploadPayload(): BatchAnswersPayload {
    return this.collector.drain();
  }

  acknowledgeAnswers(cardCodes: string[]): void {
    this.collector.acknowledge(cardCodes);
  }

  private acceptConfirmedAnswer(answer: ScanFrameResult['confirmed']): void {
    if (!answer) {
      return;
    }
    if (this.acceptedAnswers.get(answer.cardCode) === answer.selectedOption) {
      return;
    }
    this.acceptedAnswers.set(answer.cardCode, answer.selectedOption);
    this.collector.accept(answer);
  }
}

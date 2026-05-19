import type { ConfirmedAnswer } from './frame-confirmation.js';

export interface BatchAnswersPayload {
  runId?: string;
  questionId: string;
  deviceId: string;
  answers: ConfirmedAnswer[];
}

export class AnswerBatchCollector {
  private readonly answers = new Map<string, ConfirmedAnswer>();

  constructor(
    private readonly questionId: string,
    private readonly deviceId: string,
    private readonly maxBatchSize = 100
  ) {}

  accept(answer: ConfirmedAnswer): void {
    this.answers.set(answer.cardCode, answer);
  }

  size(): number {
    return this.answers.size;
  }

  isReady(): boolean {
    return this.answers.size > 0;
  }

  toPayload(): BatchAnswersPayload {
    return {
      questionId: this.questionId,
      deviceId: this.deviceId,
      answers: this.listLatestAnswers().slice(0, this.maxBatchSize)
    };
  }

  drain(): BatchAnswersPayload {
    const payload = this.toPayload();
    this.acknowledge(payload.answers.map((answer) => answer.cardCode));
    return payload;
  }

  acknowledge(cardCodes: string[]): void {
    cardCodes.forEach((cardCode) => {
      this.answers.delete(cardCode);
    });
  }

  private listLatestAnswers(): ConfirmedAnswer[] {
    return Array.from(this.answers.values()).sort(
      (left, right) =>
        new Date(left.recognizedAt).getTime() - new Date(right.recognizedAt).getTime()
    );
  }
}

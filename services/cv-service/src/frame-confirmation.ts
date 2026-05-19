import type { AnswerOption, DecodeResult } from './card-codec.js';

export interface ConfirmedAnswer {
  cardCode: string;
  selectedOption: AnswerOption;
  recognitionScore: number;
  recognizedAt: string;
}

interface PendingFrame {
  cardCode: string;
  selectedOption: AnswerOption;
  count: number;
  bestScore: number;
}

export class FrameConfirmor {
  private readonly pending = new Map<string, PendingFrame>();

  constructor(
    private readonly minFrames = 3,
    private readonly minScore = 0.75
  ) {}

  accept(frame: DecodeResult, now = new Date()): ConfirmedAnswer | undefined {
    if (!frame.valid || frame.recognitionScore < this.minScore) {
      this.pending.clear();
      return undefined;
    }
    return this.acceptMany([frame], now)[0];
  }

  acceptMany(frames: DecodeResult[], now = new Date()): ConfirmedAnswer[] {
    const confirmed: ConfirmedAnswer[] = [];
    const seen = new Set<string>();

    frames.forEach((frame) => {
      if (!frame.valid || frame.recognitionScore < this.minScore) {
        return;
      }
      const key = answerKey(frame.cardCode, frame.selectedOption);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const pending = this.updatePending(frame, key);
      if (pending.count >= this.minFrames) {
        confirmed.push({
          cardCode: pending.cardCode,
          selectedOption: pending.selectedOption,
          recognitionScore: Number(pending.bestScore.toFixed(2)),
          recognizedAt: now.toISOString()
        });
      }
    });

    return confirmed;
  }

  private updatePending(frame: DecodeResult, key: string): PendingFrame {
    const current = this.pending.get(key);
    if (!frame.valid || frame.recognitionScore < this.minScore) {
      return {
        cardCode: frame.cardCode,
        selectedOption: frame.selectedOption,
        count: 0,
        bestScore: 0
      };
    }
    const next = {
      cardCode: frame.cardCode,
      selectedOption: frame.selectedOption,
      count: (current?.count ?? 0) + 1,
      bestScore: Math.max(current?.bestScore ?? 0, frame.recognitionScore)
    };
    this.pending.set(key, next);
    return next;
  }
}

function answerKey(cardCode: string, option: AnswerOption): string {
  return `${cardCode}:${option}`;
}

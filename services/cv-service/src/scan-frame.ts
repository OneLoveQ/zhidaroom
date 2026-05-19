import { decodeObservedCells, type DecodeResult } from './card-codec.js';
import { FrameConfirmor, type ConfirmedAnswer } from './frame-confirmation.js';
import type { GrayImage } from './image-sampler.js';
import { sampleMarkerCells } from './image-sampler.js';
import { locateMarkerCornersList } from './marker-locator.js';

export interface ScanFrameResult {
  decoded?: DecodeResult;
  decodedList?: DecodeResult[];
  confirmed?: ConfirmedAnswer;
  confirmedList?: ConfirmedAnswer[];
  reason?: 'marker_not_found';
}

export class ScanFramePipeline {
  private readonly confirmor = new FrameConfirmor();

  scan(image: GrayImage, now = new Date()): ScanFrameResult {
    const cornersList = locateMarkerCornersList(image);
    if (!cornersList.length) {
      return { reason: 'marker_not_found' };
    }

    const decodedList = cornersList
      .map((corners) => decodeObservedCells(sampleMarkerCells(image, corners)))
      .filter((item) => item.valid);
    const confirmedList = this.confirmor.acceptMany(decodedList, now);
    return {
      decoded: decodedList[0],
      decodedList,
      confirmed: confirmedList[0],
      confirmedList
    };
  }
}

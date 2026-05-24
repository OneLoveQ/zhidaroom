import { decodeObservedCells, type DecodeResult } from './card-codec.js';
import { FrameConfirmor, type ConfirmedAnswer } from './frame-confirmation.js';
import type { GrayImage } from './image-sampler.js';
import { otsuThreshold, sampleMarkerCells, sampleMarkerCellsArea } from './image-sampler.js';
import { locateMarkerCornersList, type LocateOptions } from './marker-locator.js';

export interface ScanFrameResult {
  decoded?: DecodeResult;
  decodedList?: DecodeResult[];
  confirmed?: ConfirmedAnswer;
  confirmedList?: ConfirmedAnswer[];
  reason?: 'marker_not_found';
}

export interface ScanFramePipelineOptions {
  adaptiveThreshold?: boolean;
  areaSample?: boolean;
  locate?: LocateOptions;
  minFrames?: number;
  minScore?: number;
}

export class ScanFramePipeline {
  private readonly confirmor: FrameConfirmor;
  private readonly options: Required<Omit<ScanFramePipelineOptions, 'locate'>> & { locate: LocateOptions };

  constructor(options: ScanFramePipelineOptions = {}) {
    this.options = {
      adaptiveThreshold: options.adaptiveThreshold ?? true,
      areaSample: options.areaSample ?? true,
      locate: {
        minDarkPixels: 28,
        maxMarkers: 120,
        minSide: 14,
        rotatedCandidates: true,
        ...options.locate
      },
      minFrames: options.minFrames ?? 3,
      minScore: options.minScore ?? 0.75
    };
    this.confirmor = new FrameConfirmor(this.options.minFrames, this.options.minScore);
  }

  scan(image: GrayImage, now = new Date()): ScanFrameResult {
    const threshold = this.options.adaptiveThreshold ? otsuThreshold(image) : 128;
    const cornersList = locateMarkerCornersList(image, { ...this.options.locate, threshold });
    if (!cornersList.length) {
      return { reason: 'marker_not_found' };
    }

    const decodedList = cornersList
      .map((corners) => {
        const cells = this.options.areaSample
          ? sampleMarkerCellsArea(image, corners, threshold)
          : sampleMarkerCells(image, corners, threshold);
        return decodeObservedCells(cells);
      })
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

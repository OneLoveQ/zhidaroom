export type Bit = 0 | 1;
export type MarkerCells = Bit[][];
export type AnswerOption = 'A' | 'B' | 'C' | 'D';
export type RiskReason = 'border' | 'anchor' | 'checksum' | 'version';

export interface DecodeResult {
  cardCode: string;
  selectedOption: AnswerOption;
  recognitionScore: number;
  valid: boolean;
  reasons: RiskReason[];
}

const payloadPositions: Array<[number, number]> = [];
const versionBits = '1010110';
const answerByAnchor: Record<string, AnswerOption> = {
  '1:1': 'A',
  '1:5': 'B',
  '5:5': 'C',
  '5:1': 'D'
};

for (let y = 1; y <= 5; y += 1) {
  for (let x = 1; x <= 5; x += 1) {
    const isCorner = (x === 1 || x === 5) && (y === 1 || y === 5);
    if (!isCorner) {
      payloadPositions.push([x, y]);
    }
  }
}

export function createMarkerCells(id: number): MarkerCells {
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => 0 as Bit));
  for (let index = 0; index < 7; index += 1) {
    cells[0][index] = 1;
    cells[6][index] = 1;
    cells[index][0] = 1;
    cells[index][6] = 1;
  }
  cells[1][1] = 1;
  const bits: Bit[] = [...toBits(id, 10), ...toBits(checksum(id), 4), 1, 0, 1, 0, 1, 1, 0];
  payloadPositions.forEach(([x, y], index) => {
    cells[y][x] = bits[index];
  });
  return cells;
}

export function decodeObservedCells(cells: MarkerCells): DecodeResult {
  const reasons: RiskReason[] = [];
  const anchor = findAnchor(cells);
  if (!hasValidBorder(cells)) {
    reasons.push('border');
  }
  if (!anchor) {
    reasons.push('anchor');
  }

  const selectedOption = anchor ? answerByAnchor[`${anchor.x}:${anchor.y}`] : 'A';
  const normalized = normalizeCells(cells, selectedOption);
  const bits = payloadPositions.map(([x, y]) => normalized[y][x]);
  const id = bitsToNumber(bits.slice(0, 10));
  const actualChecksum = bitsToNumber(bits.slice(10, 14));
  const actualVersion = bits.slice(14).join('');

  if (actualChecksum !== checksum(id)) {
    reasons.push('checksum');
  }
  if (actualVersion !== versionBits) {
    reasons.push('version');
  }

  return {
    cardCode: `C${String(id).padStart(3, '0')}`,
    selectedOption,
    recognitionScore: Number(Math.max(0, 1 - reasons.length * 0.25).toFixed(2)),
    valid: id > 0 && reasons.length === 0,
    reasons
  };
}

export function orientCellsForAnswer(cells: MarkerCells, answer: AnswerOption): MarkerCells {
  if (answer === 'A') {
    return cloneCells(cells);
  }
  if (answer === 'B') {
    return rotateCounterClockwise(cells);
  }
  if (answer === 'C') {
    return rotateClockwise(rotateClockwise(cells));
  }
  return rotateClockwise(cells);
}

function normalizeCells(cells: MarkerCells, answer: AnswerOption): MarkerCells {
  if (answer === 'A') {
    return cloneCells(cells);
  }
  if (answer === 'B') {
    return rotateClockwise(cells);
  }
  if (answer === 'C') {
    return rotateClockwise(rotateClockwise(cells));
  }
  return rotateCounterClockwise(cells);
}

function findAnchor(cells: MarkerCells): { x: number; y: number } | undefined {
  const corners = [
    { x: 1, y: 1 },
    { x: 5, y: 1 },
    { x: 5, y: 5 },
    { x: 1, y: 5 }
  ];
  const blackCorners = corners.filter((item) => cells[item.y]?.[item.x] === 1);
  return blackCorners.length === 1 ? blackCorners[0] : undefined;
}

function hasValidBorder(cells: MarkerCells): boolean {
  return cells.length === 7 && cells.every((row) => row.length === 7) && cells.every((row, y) =>
    row.every((value, x) => (x === 0 || x === 6 || y === 0 || y === 6 ? value === 1 : true))
  );
}

function rotateClockwise(cells: MarkerCells): MarkerCells {
  return cells.map((row, y) => row.map((_, x) => cells[6 - x][y]));
}

function rotateCounterClockwise(cells: MarkerCells): MarkerCells {
  return cells.map((row, y) => row.map((_, x) => cells[x][6 - y]));
}

function cloneCells(cells: MarkerCells): MarkerCells {
  return cells.map((row) => [...row]);
}

function toBits(value: number, length: number): Bit[] {
  return value.toString(2).padStart(length, '0').slice(-length).split('').map((bit) => Number(bit) as Bit);
}

function bitsToNumber(bits: Bit[]): number {
  return bits.reduce<number>((value, bit) => (value << 1) | bit, 0);
}

function checksum(id: number): number {
  return (id ^ (id >> 4) ^ (id >> 8)) & 0x0f;
}

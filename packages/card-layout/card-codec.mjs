export const payloadPositions = [];

for (let y = 1; y <= 5; y += 1) {
  for (let x = 1; x <= 5; x += 1) {
    const isCorner = (x === 1 || x === 5) && (y === 1 || y === 5);
    if (!isCorner) {
      payloadPositions.push([x, y]);
    }
  }
}

export function toBits(value, length) {
  return value.toString(2).padStart(length, '0').slice(-length).split('').map(Number);
}

export function bitsToNumber(bits) {
  return bits.reduce((value, bit) => (value << 1) | bit, 0);
}

export function checksum(id) {
  return (id ^ (id >> 4) ^ (id >> 8)) & 0x0f;
}

export function markerCells(id) {
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => 0));
  for (let index = 0; index < 7; index += 1) {
    cells[0][index] = 1;
    cells[6][index] = 1;
    cells[index][0] = 1;
    cells[index][6] = 1;
  }
  cells[1][1] = 1;
  const bits = [...toBits(id, 10), ...toBits(checksum(id), 4), 1, 0, 1, 0, 1, 1, 0];
  payloadPositions.forEach(([x, y], index) => {
    cells[y][x] = bits[index];
  });
  return cells;
}

export function decodeMarkerCells(cells) {
  const bits = payloadPositions.map(([x, y]) => cells[y][x]);
  const id = bitsToNumber(bits.slice(0, 10));
  const actualChecksum = bitsToNumber(bits.slice(10, 14));
  const versionBits = bits.slice(14).join('');
  return {
    cardCode: `C${String(id).padStart(3, '0')}`,
    id,
    valid: id > 0 && actualChecksum === checksum(id) && versionBits === '1010110'
  };
}

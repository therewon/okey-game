import type { OkeyTile } from "./types.js";

function isWildcard(tile: OkeyTile): boolean {
  return tile.isOkey === true && tile.isFakeJoker !== true;
}

export function validateGroup(tiles: readonly OkeyTile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;
  const naturalTiles = tiles.filter((tile) => !isWildcard(tile));
  if (naturalTiles.length === 0) return false;

  const number = naturalTiles[0]?.number;
  if (number === undefined || naturalTiles.some((tile) => tile.number !== number)) return false;

  const colors = new Set(naturalTiles.map((tile) => tile.color));
  return colors.size === naturalTiles.length && tiles.length <= 4;
}

export function validateRun(tiles: readonly OkeyTile[]): boolean {
  if (tiles.length < 3 || tiles.length > 13) return false;
  const naturalTiles = tiles.filter((tile) => !isWildcard(tile));
  if (naturalTiles.length === 0) return false;

  const color = naturalTiles[0]?.color;
  if (color === undefined || naturalTiles.some((tile) => tile.color !== color)) return false;

  const numbers = naturalTiles.map((tile) => tile.number).sort((left, right) => left - right);
  if (new Set(numbers).size !== numbers.length) return false;
  const first = numbers[0];
  const last = numbers.at(-1);
  if (first === undefined || last === undefined) return false;

  return last - first + 1 <= tiles.length;
}

export function validateMeld(tiles: readonly OkeyTile[]): boolean {
  return validateGroup(tiles) || validateRun(tiles);
}

function bitCount(mask: number): number {
  let count = 0;
  let remaining = mask;
  while (remaining !== 0) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
}

function tilesForMask(hand: readonly OkeyTile[], mask: number): OkeyTile[] {
  const tiles: OkeyTile[] = [];
  for (let index = 0; index < hand.length; index += 1) {
    if ((mask & (1 << index)) !== 0) {
      const tile = hand[index];
      if (tile !== undefined) tiles.push(tile);
    }
  }
  return tiles;
}

export function findValidHandArrangement(hand: readonly OkeyTile[]): OkeyTile[][] | null {
  if (hand.length < 3 || hand.length > 20) return null;

  const fullMask = (1 << hand.length) - 1;
  const meldMasksByTile = Array.from({ length: hand.length }, () => [] as number[]);

  for (let mask = 1; mask <= fullMask; mask += 1) {
    const count = bitCount(mask);
    if (count < 3 || count > 13) continue;
    if (!validateMeld(tilesForMask(hand, mask))) continue;

    for (let index = 0; index < hand.length; index += 1) {
      if ((mask & (1 << index)) !== 0) meldMasksByTile[index]?.push(mask);
    }
  }

  const memo = new Map<number, number[] | null>();
  const search = (remainingMask: number): number[] | null => {
    if (remainingMask === 0) return [];
    if (memo.has(remainingMask)) return memo.get(remainingMask) ?? null;

    let firstIndex = 0;
    while ((remainingMask & (1 << firstIndex)) === 0) firstIndex += 1;
    const candidates = meldMasksByTile[firstIndex] ?? [];

    for (const meldMask of candidates) {
      if ((meldMask & remainingMask) !== meldMask) continue;
      const rest = search(remainingMask ^ meldMask);
      if (rest !== null) {
        const result = [meldMask, ...rest];
        memo.set(remainingMask, result);
        return result;
      }
    }

    memo.set(remainingMask, null);
    return null;
  };

  const arrangement = search(fullMask);
  return arrangement?.map((mask) => tilesForMask(hand, mask)) ?? null;
}

export function validateHand(hand: readonly OkeyTile[]): boolean {
  return hand.length === 14 && findValidHandArrangement(hand) !== null;
}

import { TILE_COLORS, type OkeyTile } from "./types.js";

export function createOkeyTiles(): OkeyTile[] {
  const tiles: OkeyTile[] = [];

  for (const color of TILE_COLORS) {
    for (let number = 1; number <= 13; number += 1) {
      for (let copy = 1; copy <= 2; copy += 1) {
        tiles.push({ id: `${color}-${number}-${copy}`, number, color });
      }
    }
  }

  tiles.push(
    { id: "fake-joker-1", number: 0, color: "red", isFakeJoker: true },
    { id: "fake-joker-2", number: 0, color: "red", isFakeJoker: true },
  );

  return tiles;
}

export function shuffleTiles<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];
    if (current === undefined || swap === undefined) continue;
    shuffled[index] = swap;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function getOkeyFromIndicator(indicator: OkeyTile): OkeyTile {
  return {
    id: `okey-display-${indicator.color}-${indicator.number === 13 ? 1 : indicator.number + 1}`,
    color: indicator.color,
    number: indicator.number === 13 ? 1 : indicator.number + 1,
    isOkey: true,
  };
}

export function markRoundTiles(tiles: readonly OkeyTile[], indicator: OkeyTile): OkeyTile[] {
  const okey = getOkeyFromIndicator(indicator);

  return tiles.map((tile) => {
    if (tile.isFakeJoker) {
      return {
        id: tile.id,
        number: indicator.number,
        color: indicator.color,
        isFakeJoker: true,
      };
    }

    if (tile.color === okey.color && tile.number === okey.number) {
      return { ...tile, isOkey: true };
    }

    return tile;
  });
}

export function tileKey(tile: OkeyTile): string {
  return `${tile.color}-${tile.number}`;
}

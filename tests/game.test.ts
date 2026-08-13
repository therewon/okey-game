import { describe, expect, it } from "vitest";
import {
  createOkeyTiles,
  dealTiles,
  findValidHandArrangement,
  getOkeyFromIndicator,
  markRoundTiles,
  shuffleTiles,
  validateGroup,
  validateHand,
  validateRun,
  type OkeyTile,
  type TileColor,
} from "@okey/shared";

let tileSequence = 0;
const tile = (color: TileColor, number: number, isOkey = false): OkeyTile => ({
  id: `test-${tileSequence++}`,
  color,
  number,
  ...(isOkey ? { isOkey: true } : {}),
});

describe("Okey tile engine", () => {
  it("generates 106 unique tiles", () => {
    const tiles = createOkeyTiles();
    expect(tiles).toHaveLength(106);
    expect(new Set(tiles.map((entry) => entry.id))).toHaveLength(106);
    expect(tiles.filter((entry) => entry.isFakeJoker)).toHaveLength(2);
  });

  it("contains every normal tile exactly twice", () => {
    const normalTiles = createOkeyTiles().filter((entry) => !entry.isFakeJoker);
    const counts = new Map<string, number>();
    for (const entry of normalTiles) {
      const key = `${entry.color}-${entry.number}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts).toHaveLength(52);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
  });

  it("derives the Okey from the indicator and wraps 13 to 1", () => {
    expect(getOkeyFromIndicator(tile("red", 7))).toMatchObject({ color: "red", number: 8, isOkey: true });
    expect(getOkeyFromIndicator(tile("blue", 13))).toMatchObject({ color: "blue", number: 1, isOkey: true });
  });

  it("marks real Okey tiles and makes fake jokers represent the indicator", () => {
    const indicator = tile("yellow", 4);
    const marked = markRoundTiles(createOkeyTiles(), indicator);
    expect(marked.filter((entry) => entry.isOkey)).toHaveLength(2);
    expect(marked.filter((entry) => entry.isFakeJoker).every((entry) => entry.color === "yellow" && entry.number === 4)).toBe(true);
  });

  it("uses a Fisher-Yates shuffle that preserves every tile", () => {
    const source = createOkeyTiles();
    let seed = 123456789;
    const random = () => {
      seed = (1664525 * seed + 1013904223) % 0x1_0000_0000;
      return seed / 0x1_0000_0000;
    };
    const shuffled = shuffleTiles(source, random);
    expect(shuffled.map((entry) => entry.id).sort()).toEqual(source.map((entry) => entry.id).sort());
    expect(shuffled.map((entry) => entry.id)).not.toEqual(source.map((entry) => entry.id));
  });

  it("deals 15 tiles to the starter and 14 to the other players", () => {
    const result = dealTiles(createOkeyTiles().slice(1), ["a", "b", "c", "d"], "c");
    expect(result.hands.a).toHaveLength(14);
    expect(result.hands.b).toHaveLength(14);
    expect(result.hands.c).toHaveLength(15);
    expect(result.hands.d).toHaveLength(14);
    expect(result.closedPile).toHaveLength(48);
  });
});

describe("Okey winning combinations", () => {
  it("validates groups and rejects duplicate colors", () => {
    expect(validateGroup([tile("red", 8), tile("blue", 8), tile("black", 8)])).toBe(true);
    expect(validateGroup([tile("red", 8), tile("red", 8), tile("black", 8)])).toBe(false);
  });

  it("validates same-color runs", () => {
    expect(validateRun([tile("red", 3), tile("red", 4), tile("red", 5), tile("red", 6)])).toBe(true);
    expect(validateRun([tile("red", 3), tile("blue", 4), tile("red", 5)])).toBe(false);
    expect(validateRun([tile("red", 12), tile("red", 13), tile("red", 1)])).toBe(false);
  });

  it("allows an Okey wildcard to fill a missing value", () => {
    expect(validateRun([tile("yellow", 3), tile("yellow", 5), tile("black", 9, true)])).toBe(true);
    expect(validateGroup([tile("red", 10), tile("blue", 10), tile("black", 4, true)])).toBe(true);
  });

  it("partitions a full winning hand using backtracking", () => {
    const hand = [
      tile("red", 1), tile("red", 2), tile("red", 3), tile("red", 4),
      tile("blue", 5), tile("blue", 6), tile("blue", 7),
      tile("red", 8), tile("blue", 8), tile("black", 8),
      tile("red", 11), tile("blue", 11), tile("black", 11), tile("yellow", 11),
    ];
    expect(validateHand(hand)).toBe(true);
    expect(findValidHandArrangement(hand)?.map((meld) => meld.length).sort()).toEqual([3, 3, 4, 4]);
  });

  it("rejects a hand that cannot use every tile", () => {
    const hand = [
      tile("red", 1), tile("red", 2), tile("red", 3), tile("red", 4),
      tile("blue", 5), tile("blue", 6), tile("blue", 7),
      tile("red", 8), tile("blue", 8), tile("black", 8),
      tile("red", 11), tile("blue", 11), tile("black", 11), tile("yellow", 12),
    ];
    expect(validateHand(hand)).toBe(false);
  });
});

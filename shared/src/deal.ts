import type { DealResult, OkeyTile } from "./types.js";

export function dealTiles(
  tiles: readonly OkeyTile[],
  playerIds: readonly string[],
  startingPlayerId: string,
): DealResult {
  if (playerIds.length !== 4) {
    throw new Error("Okey requires exactly four players.");
  }
  if (!playerIds.includes(startingPlayerId)) {
    throw new Error("Starting player must be in the room.");
  }
  if (tiles.length < 57) {
    throw new Error("Not enough tiles to deal a round.");
  }

  const hands: Record<string, OkeyTile[]> = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [] as OkeyTile[]]),
  );
  let cursor = 0;

  for (const playerId of playerIds) {
    const count = playerId === startingPlayerId ? 15 : 14;
    const hand = tiles.slice(cursor, cursor + count);
    hands[playerId] = hand;
    cursor += count;
  }

  return { hands, closedPile: tiles.slice(cursor) };
}

import { findValidHandArrangement, TILE_COLORS, type OkeyTile } from "@okey/shared";

const colorRank = new Map(TILE_COLORS.map((color, index) => [color, index]));

export function mergeTileOrder(currentIds: readonly string[], tiles: readonly OkeyTile[]): string[] {
  const available = new Set(tiles.map((tile) => tile.id));
  const retained = currentIds.filter((id) => available.has(id));
  const retainedSet = new Set(retained);
  return [...retained, ...tiles.filter((tile) => !retainedSet.has(tile.id)).map((tile) => tile.id)];
}

export function sortByColor(tiles: readonly OkeyTile[]): string[] {
  return [...tiles]
    .sort((left, right) => (colorRank.get(left.color) ?? 0) - (colorRank.get(right.color) ?? 0) || left.number - right.number)
    .map((tile) => tile.id);
}

export function sortByNumber(tiles: readonly OkeyTile[]): string[] {
  return [...tiles]
    .sort((left, right) => left.number - right.number || (colorRank.get(left.color) ?? 0) - (colorRank.get(right.color) ?? 0))
    .map((tile) => tile.id);
}

export function autoArrange(tiles: readonly OkeyTile[]): string[] {
  const arrangements = tiles.length === 14
    ? findValidHandArrangement(tiles)
    : tiles.flatMap((discard, index) => {
        const candidate = tiles.filter((_, tileIndex) => tileIndex !== index);
        const arrangement = findValidHandArrangement(candidate);
        return arrangement ? [{ arrangement, discard }] : [];
      })[0];

  if (Array.isArray(arrangements)) return arrangements.flat().map((tile) => tile.id);
  if (arrangements) return [...arrangements.arrangement.flat(), arrangements.discard].map((tile) => tile.id);
  return sortByColor(tiles);
}

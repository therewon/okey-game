import type { OkeyTile as OkeyTileModel } from "@okey/shared";
import { ArrowLeft, ArrowRight, Combine, Palette, Rows3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { autoArrange, mergeTileOrder, sortByColor, sortByNumber } from "../../utils/rack";
import { OkeyTile } from "./OkeyTile";

interface PlayerRackProps {
  tiles: OkeyTileModel[];
  selectedId: string | null;
  onSelect: (tileId: string) => void;
}

export function PlayerRack({ tiles, selectedId, onSelect }: PlayerRackProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedIds((current) => mergeTileOrder(current, tiles));
  }, [tiles]);

  const tileMap = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);
  const orderedTiles = orderedIds.flatMap((id) => {
    const tile = tileMap.get(id);
    return tile ? [tile] : [];
  });

  const moveSelected = (direction: -1 | 1) => {
    if (!selectedId) return;
    setOrderedIds((current) => {
      const index = current.indexOf(selectedId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const dropOn = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOrderedIds((current) => {
      const next = current.filter((id) => id !== draggedId);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex, 0, draggedId);
      return next;
    });
    setDraggedId(null);
  };

  return (
    <section className="rack-shell" aria-label="Daş rəfiniz">
      <div className="rack-toolbar">
        <div className="flex gap-1">
          <button type="button" onClick={() => setOrderedIds(sortByColor(tiles))}><Palette /> <span>Rəngə görə</span></button>
          <button type="button" onClick={() => setOrderedIds(sortByNumber(tiles))}><Rows3 /> <span>Rəqəmə görə</span></button>
          <button type="button" onClick={() => setOrderedIds(autoArrange(tiles))}><Combine /> <span>Avtomatik düz</span></button>
        </div>
        <div className="flex gap-1 sm:hidden">
          <button type="button" onClick={() => moveSelected(-1)} disabled={!selectedId} aria-label="Seçilmiş daşı sola çək"><ArrowLeft /></button>
          <button type="button" onClick={() => moveSelected(1)} disabled={!selectedId} aria-label="Seçilmiş daşı sağa çək"><ArrowRight /></button>
        </div>
      </div>
      <div className="rack-scroll">
        <div className="rack-board">
          {orderedTiles.map((tile) => (
            <OkeyTile
              key={tile.id}
              tile={tile}
              selected={selectedId === tile.id}
              onClick={() => onSelect(tile.id)}
              draggable
              onDragStart={() => setDraggedId(tile.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(tile.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

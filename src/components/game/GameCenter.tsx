import type { PublicGameState } from "@okey/shared";
import { Layers3, MoveDown } from "lucide-react";
import { OkeyTile } from "./OkeyTile";

interface GameCenterProps {
  game: PublicGameState;
  canDraw: boolean;
  busy: boolean;
  onDraw: () => void;
  onTakeDiscard: () => void;
}

export function GameCenter({ game, canDraw, busy, onDraw, onTakeDiscard }: GameCenterProps) {
  return (
    <div className="game-center" aria-label="Masanın mərkəzi">
      <div className="center-item">
        <span className="center-label">Göstərici</span>
        <OkeyTile tile={game.indicatorTile} compact />
      </div>

      <button
        type="button"
        className={`closed-pile ${canDraw ? "closed-pile-active" : ""}`}
        onClick={onDraw}
        disabled={!canDraw || busy || game.remainingTileCount === 0}
        aria-label={`Qapalı daş götür, ${game.remainingTileCount} daş qalıb`}
      >
        <span className="pile-layer pile-layer-one" />
        <span className="pile-layer pile-layer-two" />
        <span className="pile-face"><Layers3 className="size-5" /></span>
        <strong>{game.remainingTileCount}</strong>
        <small>daş</small>
      </button>

      <button
        type="button"
        className={`center-item rounded-xl p-1 transition ${canDraw && game.lastDiscard ? "ring-2 ring-gold/80 hover:bg-white/10" : ""}`}
        onClick={onTakeDiscard}
        disabled={!canDraw || busy || !game.lastDiscard}
      >
        <span className="center-label inline-flex items-center gap-1"><MoveDown className="size-3" /> Son daş</span>
        {game.lastDiscard ? <OkeyTile tile={game.lastDiscard.tile} compact /> : <span className="empty-tile">—</span>}
      </button>
    </div>
  );
}

import type { OkeyTile as OkeyTileModel } from "@okey/shared";
import { Sparkles } from "lucide-react";

interface OkeyTileProps {
  tile?: OkeyTileModel;
  selected?: boolean;
  hidden?: boolean;
  compact?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragOver?: React.DragEventHandler<HTMLButtonElement>;
  onDrop?: React.DragEventHandler<HTMLButtonElement>;
}

const numberColors: Record<OkeyTileModel["color"], string> = {
  red: "text-[#d54038]",
  blue: "text-[#2d66c7]",
  black: "text-[#202927]",
  yellow: "text-[#c58a08]",
};

export function OkeyTile({
  tile,
  selected = false,
  hidden = false,
  compact = false,
  disabled = false,
  draggable = false,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: OkeyTileProps) {
  if (hidden) {
    return (
      <span className={`tile-back ${compact ? "tile-compact" : ""}`} aria-hidden="true">
        <span />
      </span>
    );
  }

  if (!tile) return null;

  return (
    <button
      type="button"
      className={`okey-tile ${compact ? "tile-compact" : ""} ${selected ? "tile-selected" : ""}`}
      onClick={onClick}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-pressed={selected}
      aria-label={tile.isFakeJoker ? "Saxta joker" : `${tile.color} ${tile.number}${tile.isOkey ? ", Okey" : ""}`}
    >
      {tile.isFakeJoker ? (
        <span className="grid place-items-center text-gold-dark">
          <Sparkles className="size-7" />
          <small className="mt-0.5 text-[8px] font-black tracking-tight">SAHTƏ</small>
        </span>
      ) : (
        <>
          {tile.isOkey && <Sparkles className="absolute right-1 top-1 size-2.5 text-gold-dark" />}
          <span className={`font-display font-black leading-none ${numberColors[tile.color]}`}>{tile.number}</span>
          <span className={`mt-1 size-1.5 rounded-full bg-current ${numberColors[tile.color]}`} />
        </>
      )}
    </button>
  );
}

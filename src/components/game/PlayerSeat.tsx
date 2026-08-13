import type { Player } from "@okey/shared";
import { Crown } from "lucide-react";
import { ConnectionPill } from "../common/ConnectionPill";
import { OkeyTile } from "./OkeyTile";

interface PlayerSeatProps {
  player: Player | undefined;
  isHost?: boolean;
  active?: boolean;
  position: "top" | "left" | "right";
}

export function PlayerSeat({ player, isHost = false, active = false, position }: PlayerSeatProps) {
  if (!player) return null;
  const visibleBacks = Math.min(player.tileCount, 15);

  return (
    <section className={`player-seat player-${position} ${active ? "player-active" : ""}`} aria-label={`${player.nickname}, ${player.tileCount} daş`}>
      <div className="flex items-center justify-center gap-2">
        <span className={`status-dot ${player.connected ? "bg-emerald-400" : "bg-red-400"}`} />
        <strong className="max-w-28 truncate text-xs text-white sm:text-sm">{player.nickname}</strong>
        {isHost && <Crown className="size-3.5 text-gold" aria-label="Otaq sahibi" />}
      </div>
      <div className={`hidden-backs ${position === "top" ? "mt-2" : "mt-1"}`}>
        {Array.from({ length: visibleBacks }, (_, index) => <OkeyTile key={index} hidden compact />)}
      </div>
      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="text-[10px] font-semibold text-white/55">{player.tileCount} daş</span>
        <ConnectionPill connected={player.connected} />
      </div>
    </section>
  );
}

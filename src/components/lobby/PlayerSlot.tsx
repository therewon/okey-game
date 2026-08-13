import type { Player } from "@okey/shared";
import { Check, Crown, UserRound } from "lucide-react";
import { ConnectionPill } from "../common/ConnectionPill";

interface PlayerSlotProps {
  player: Player | undefined;
  isHost?: boolean;
  index: number;
}

export function PlayerSlot({ player, isHost = false, index }: PlayerSlotProps) {
  if (!player) {
    return (
      <div className="lobby-slot lobby-slot-empty">
        <span className="grid size-11 place-items-center rounded-2xl border border-dashed border-white/15 text-white/25"><UserRound /></span>
        <div><strong>{index + 1}-ci yer</strong><p>Oyunçu gözlənilir...</p></div>
      </div>
    );
  }

  return (
    <div className="lobby-slot">
      <span className="avatar">{player.nickname.slice(0, 1).toLocaleUpperCase("az")}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <strong className="truncate">{player.nickname}</strong>
          {isHost && <span className="host-badge"><Crown /> Host</span>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <ConnectionPill connected={player.connected} />
          {player.ready && <span className="ready-label"><Check /> Hazır</span>}
        </div>
      </div>
    </div>
  );
}

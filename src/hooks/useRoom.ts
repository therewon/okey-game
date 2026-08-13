import type { Player, PublicGameState, RoomMeta } from "@okey/shared";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtimeValue } from "./useRealtimeValue";

export function useRoom(roomCode: string) {
  const { user } = useAuth();
  const base = user ? `rooms/${roomCode}` : null;
  const meta = useRealtimeValue<RoomMeta>(base ? `${base}/meta` : null);
  const playerMap = useRealtimeValue<Record<string, Player>>(base ? `${base}/players` : null);
  const publicGame = useRealtimeValue<PublicGameState>(base ? `${base}/publicGame` : null);
  const rematchVotes = useRealtimeValue<Record<string, boolean>>(base ? `${base}/rematchVotes` : null);
  const players = useMemo(() => {
    if (!playerMap.value) return [];
    const order = meta.value?.playerOrder ?? Object.keys(playerMap.value);
    return order.flatMap((uid) => {
      const player = playerMap.value?.[uid];
      return player ? [player] : [];
    });
  }, [meta.value?.playerOrder, playerMap.value]);

  return {
    meta: meta.value,
    players,
    playerMap: playerMap.value,
    publicGame: publicGame.value,
    rematchVotes: rematchVotes.value ?? {},
    loading: meta.loading || playerMap.loading,
    denied: meta.denied || playerMap.denied,
  };
}

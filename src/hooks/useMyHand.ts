import type { OkeyTile } from "@okey/shared";
import { useAuth } from "../contexts/AuthContext";
import { useRealtimeValue } from "./useRealtimeValue";

export function useMyHand(roomCode: string) {
  const { user } = useAuth();
  return useRealtimeValue<OkeyTile[]>(user ? `rooms/${roomCode}/privateState/hands/${user.uid}` : null);
}

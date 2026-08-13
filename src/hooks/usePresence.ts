import { onDisconnect, onValue, ref, set } from "firebase/database";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { database } from "../firebase/firebase";

export function usePresence(roomCode: string, enabled = true): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !enabled) return;
    const connectedRef = ref(database, ".info/connected");
    const playerConnectionRef = ref(database, `rooms/${roomCode}/players/${user.uid}/connected`);

    return onValue(connectedRef, (snapshot) => {
      if (snapshot.val() !== true) return;
      const disconnect = onDisconnect(playerConnectionRef);
      void disconnect.set(false).then(() => set(playerConnectionRef, true));
    });
  }, [enabled, roomCode, user]);
}

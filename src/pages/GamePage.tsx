import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { GameSurface } from "../components/game/GameSurface";
import { WinnerModal } from "../components/game/WinnerModal";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useMyHand } from "../hooks/useMyHand";
import { usePresence } from "../hooks/usePresence";
import { useRoom } from "../hooks/useRoom";
import { friendlyError } from "../services/errors";
import { roomService } from "../services/roomService";
import { localProfile } from "../utils/storage";

export function GamePage() {
  const { roomCode = "" } = useParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { showToast } = useToast();
  const room = useRoom(roomCode);
  const handState = useMyHand(roomCode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previousTurnRef = useRef<string | null>(null);
  usePresence(roomCode, Boolean(room.meta));

  const myIndex = room.meta && user ? room.meta.playerOrder.indexOf(user.uid) : -1;
  const seat = (offset: number) => {
    if (!room.meta || myIndex < 0) return undefined;
    const uid = room.meta.playerOrder[(myIndex + offset) % room.meta.playerOrder.length];
    return uid ? room.playerMap?.[uid] : undefined;
  };
  const rightPlayer = seat(1);
  const topPlayer = seat(2);
  const leftPlayer = seat(3);
  const me = user ? room.playerMap?.[user.uid] : undefined;
  const game = room.publicGame;
  const hand = handState.value ?? [];
  const isMyTurn = room.meta?.currentPlayerId === user?.uid;
  const canDraw = Boolean(isMyTurn && game?.turnPhase === "draw");
  const canDiscard = Boolean(isMyTurn && game?.turnPhase === "discard" && hand.length === 15 && selectedId);
  const currentPlayer = room.meta?.currentPlayerId ? room.playerMap?.[room.meta.currentPlayerId] : undefined;
  const votes = Object.keys(room.rematchVotes).length;
  const hasVoted = Boolean(user && room.rematchVotes[user.uid]);

  useEffect(() => {
    if (room.meta?.status === "waiting") navigate(`/room/${roomCode}`, { replace: true });
  }, [navigate, room.meta?.status, roomCode]);

  useEffect(() => {
    if (ready && !room.loading && (room.denied || !room.meta)) {
      localProfile.clearRoom();
      navigate("/", { replace: true });
    }
  }, [navigate, ready, room.denied, room.loading, room.meta]);

  useEffect(() => {
    const currentTurn = room.meta?.currentPlayerId ?? null;
    if (currentTurn === user?.uid && previousTurnRef.current && previousTurnRef.current !== currentTurn) {
      showToast("Növbə sizdədir.", "info");
    }
    previousTurnRef.current = currentTurn;
  }, [room.meta?.currentPlayerId, showToast, user?.uid]);

  useEffect(() => {
    if (selectedId && !hand.some((tile) => tile.id === selectedId)) setSelectedId(null);
  }, [hand, selectedId]);

  const winner = useMemo(() => game?.winnerId ? room.playerMap?.[game.winnerId] : undefined, [game?.winnerId, room.playerMap]);

  if (!ready || room.loading || !room.meta || !user || (room.meta.status === "playing" && (!game || handState.loading))) {
    return <LoadingScreen label="Masa qurulur..." />;
  }
  if (!game) return <LoadingScreen />;

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      if (successMessage) showToast(successMessage, "success");
    } catch (error) {
      showToast(friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const leave = () => run(async () => {
    await roomService.leave(roomCode);
    localProfile.clearRoom();
    navigate("/");
  });

  return (
    <>
      <GameSurface
        roomCode={roomCode}
        game={game}
        hand={hand}
        me={me}
        topPlayer={topPlayer}
        leftPlayer={leftPlayer}
        rightPlayer={rightPlayer}
        currentPlayer={currentPlayer}
        hostId={room.meta.hostId}
        currentPlayerId={room.meta.currentPlayerId}
        isMyTurn={isMyTurn}
        canDraw={canDraw}
        canDiscard={canDiscard}
        busy={busy}
        selectedId={selectedId}
        onSelect={(tileId) => setSelectedId((current) => current === tileId ? null : tileId)}
        onExit={leave}
        onDraw={() => run(() => roomService.draw(roomCode))}
        onTakeDiscard={() => run(() => roomService.takeDiscard(roomCode))}
        onFinish={() => selectedId && run(() => roomService.finish(roomCode, selectedId))}
        onDiscard={() => selectedId && run(() => roomService.discard(roomCode, selectedId))}
      />

      {room.meta.status === "finished" && (
        <WinnerModal
          winner={winner}
          votes={votes}
          total={room.players.length}
          hasVoted={hasVoted}
          busy={busy}
          onRematch={() => run(() => roomService.rematch(roomCode), "Yenidən oyun səsiniz qeydə alındı.")}
          onLeave={leave}
        />
      )}
    </>
  );
}

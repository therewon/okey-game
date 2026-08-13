import { CheckCircle2, CircleDotDashed, Flag, LoaderCircle, LogOut, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Brand } from "../components/common/Brand";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { GameCenter } from "../components/game/GameCenter";
import { PlayerRack } from "../components/game/PlayerRack";
import { PlayerSeat } from "../components/game/PlayerSeat";
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
    <main className="game-page">
      <header className="game-header">
        <Brand compact />
        <div className={`turn-banner ${isMyTurn ? "turn-mine" : ""}`}>
          {isMyTurn ? <Sparkles /> : <CircleDotDashed />}
          <div><strong>{isMyTurn ? "Növbə sizdədir" : `${currentPlayer?.nickname ?? "Oyunçu"} oynayır...`}</strong><small>{isMyTurn ? (game.turnPhase === "draw" ? "Daş götürün" : "Bir daş atın") : `Masa · ${roomCode}`}</small></div>
        </div>
        <button type="button" className="header-exit" onClick={leave} disabled={busy} aria-label="Oyundan çıx"><LogOut /></button>
      </header>

      <section className="table-wrap">
        <div className="okey-table">
          <PlayerSeat player={topPlayer} position="top" isHost={topPlayer?.uid === room.meta.hostId} active={topPlayer?.uid === room.meta.currentPlayerId} />
          <PlayerSeat player={leftPlayer} position="left" isHost={leftPlayer?.uid === room.meta.hostId} active={leftPlayer?.uid === room.meta.currentPlayerId} />
          <PlayerSeat player={rightPlayer} position="right" isHost={rightPlayer?.uid === room.meta.hostId} active={rightPlayer?.uid === room.meta.currentPlayerId} />
          <GameCenter game={game} canDraw={canDraw} busy={busy} onDraw={() => run(() => roomService.draw(roomCode))} onTakeDiscard={() => run(() => roomService.takeDiscard(roomCode))} />
          <div className={`my-seat ${isMyTurn ? "my-seat-active" : ""}`}>
            <span className={`status-dot ${me?.connected ? "bg-emerald-400" : "bg-red-400"}`} />
            <strong>{me?.nickname}</strong>
            <span>· {hand.length} daş</span>
            {me?.uid === room.meta.hostId && <span className="text-gold">Host</span>}
          </div>
        </div>
      </section>

      <div className="game-controls">
        <PlayerRack tiles={hand} selectedId={selectedId} onSelect={(tileId) => setSelectedId((current) => current === tileId ? null : tileId)} />
        <div className="action-row">
          <button type="button" className="finish-button" disabled={!canDiscard || busy} onClick={() => selectedId && run(() => roomService.finish(roomCode, selectedId))}>
            <Flag /> Oyunu bitir
          </button>
          <button type="button" className="discard-button" disabled={!canDiscard || busy} onClick={() => selectedId && run(() => roomService.discard(roomCode, selectedId))}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Send />} Daşı at
          </button>
        </div>
        <div className="sr-only" aria-live="polite">{isMyTurn ? "Növbə sizdədir" : `${currentPlayer?.nickname ?? "Oyunçu"} oynayır`}</div>
      </div>

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
      {busy && <span className="fixed bottom-3 left-3 hidden items-center gap-2 rounded-full bg-black/40 px-3 py-2 text-xs text-white/60 sm:flex"><CheckCircle2 className="size-3.5" /> Əməliyyat yoxlanılır</span>}
    </main>
  );
}

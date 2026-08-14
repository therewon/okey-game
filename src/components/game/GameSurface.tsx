import type { OkeyTile, Player, PublicGameState } from "@okey/shared";
import { CheckCircle2, CircleDotDashed, Flag, LoaderCircle, LogOut, Send, Sparkles } from "lucide-react";
import { Brand } from "../common/Brand";
import { GameCenter } from "./GameCenter";
import { PlayerRack } from "./PlayerRack";
import { PlayerSeat } from "./PlayerSeat";

interface GameSurfaceProps {
  roomCode: string;
  game: PublicGameState;
  hand: OkeyTile[];
  me: Player | undefined;
  topPlayer: Player | undefined;
  leftPlayer: Player | undefined;
  rightPlayer: Player | undefined;
  currentPlayer: Player | undefined;
  hostId: string;
  currentPlayerId: string | null;
  isMyTurn: boolean;
  canDraw: boolean;
  canDiscard: boolean;
  busy: boolean;
  selectedId: string | null;
  onSelect: (tileId: string) => void;
  onExit: () => void;
  onDraw: () => void;
  onTakeDiscard: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}

export function GameSurface({
  roomCode,
  game,
  hand,
  me,
  topPlayer,
  leftPlayer,
  rightPlayer,
  currentPlayer,
  hostId,
  currentPlayerId,
  isMyTurn,
  canDraw,
  canDiscard,
  busy,
  selectedId,
  onSelect,
  onExit,
  onDraw,
  onTakeDiscard,
  onFinish,
  onDiscard,
}: GameSurfaceProps) {
  return (
    <main className="game-page">
      <header className="game-header">
        <Brand compact />
        <div className={`turn-banner ${isMyTurn ? "turn-mine" : ""}`}>
          {isMyTurn ? <Sparkles /> : <CircleDotDashed />}
          <div>
            <strong>{isMyTurn ? "Növbə sizdədir" : `${currentPlayer?.nickname ?? "Oyunçu"} oynayır...`}</strong>
            <small>{isMyTurn ? (game.turnPhase === "draw" ? "Daş götürün" : "Bir daş atın") : `Masa · ${roomCode}`}</small>
          </div>
        </div>
        <button type="button" className="header-exit" onClick={onExit} disabled={busy} aria-label="Oyundan çıx"><LogOut /></button>
      </header>

      <section className="table-wrap">
        <div className="okey-table">
          <PlayerSeat player={topPlayer} position="top" isHost={topPlayer?.uid === hostId} active={topPlayer?.uid === currentPlayerId} />
          <PlayerSeat player={leftPlayer} position="left" isHost={leftPlayer?.uid === hostId} active={leftPlayer?.uid === currentPlayerId} />
          <PlayerSeat player={rightPlayer} position="right" isHost={rightPlayer?.uid === hostId} active={rightPlayer?.uid === currentPlayerId} />
          <GameCenter game={game} canDraw={canDraw} busy={busy} onDraw={onDraw} onTakeDiscard={onTakeDiscard} />
          <div className={`my-seat ${isMyTurn ? "my-seat-active" : ""}`}>
            <span className={`status-dot ${me?.connected ? "bg-emerald-400" : "bg-red-400"}`} />
            <strong>{me?.nickname}</strong>
            <span>· {hand.length} daş</span>
            {me?.uid === hostId && <span className="text-gold">Host</span>}
          </div>
        </div>
      </section>

      <div className="game-controls">
        <PlayerRack tiles={hand} selectedId={selectedId} onSelect={onSelect} />
        <div className="action-row">
          <button type="button" className="finish-button" disabled={!canDiscard || busy} onClick={onFinish}>
            <Flag /> Oyunu bitir
          </button>
          <button type="button" className="discard-button" disabled={!canDiscard || busy} onClick={onDiscard}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Send />} Daşı at
          </button>
        </div>
        <div className="sr-only" aria-live="polite">{isMyTurn ? "Növbə sizdədir" : `${currentPlayer?.nickname ?? "Oyunçu"} oynayır`}</div>
      </div>

      {busy && <span className="fixed bottom-3 left-3 hidden items-center gap-2 rounded-full bg-black/40 px-3 py-2 text-xs text-white/60 sm:flex"><CheckCircle2 className="size-3.5" /> Əməliyyat yoxlanılır</span>}
    </main>
  );
}

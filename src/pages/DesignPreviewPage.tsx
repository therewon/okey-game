import type { OkeyTile, Player, PublicGameState } from "@okey/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameSurface } from "../components/game/GameSurface";
import { WinnerModal } from "../components/game/WinnerModal";

const previewPlayers: Record<"me" | "right" | "top" | "left", Player> = {
  me: { uid: "preview-me", nickname: "Siz", connected: true, ready: true, tileCount: 15, joinedAt: 1 },
  right: { uid: "preview-right", nickname: "Leyla", connected: true, ready: true, tileCount: 14, joinedAt: 2 },
  top: { uid: "preview-top", nickname: "Murad", connected: true, ready: true, tileCount: 14, joinedAt: 3 },
  left: { uid: "preview-left", nickname: "Nigar", connected: true, ready: true, tileCount: 14, joinedAt: 4 },
};

const initialHand: OkeyTile[] = [
  { id: "preview-red-1", color: "red", number: 1 },
  { id: "preview-red-2", color: "red", number: 2 },
  { id: "preview-red-3", color: "red", number: 3 },
  { id: "preview-blue-5", color: "blue", number: 5 },
  { id: "preview-black-5", color: "black", number: 5 },
  { id: "preview-yellow-5", color: "yellow", number: 5 },
  { id: "preview-blue-8", color: "blue", number: 8 },
  { id: "preview-blue-9", color: "blue", number: 9 },
  { id: "preview-blue-10", color: "blue", number: 10 },
  { id: "preview-black-11", color: "black", number: 11 },
  { id: "preview-black-12", color: "black", number: 12 },
  { id: "preview-black-13", color: "black", number: 13 },
  { id: "preview-okey", color: "red", number: 8, isOkey: true },
  { id: "preview-yellow-12", color: "yellow", number: 12 },
  { id: "preview-fake-joker", color: "red", number: 7, isFakeJoker: true },
];

const initialGame: PublicGameState = {
  indicatorTile: { id: "preview-indicator", color: "red", number: 7 },
  okeyTile: { id: "preview-okey-display", color: "red", number: 8, isOkey: true },
  remainingTileCount: 53,
  turnPhase: "discard",
  discardPiles: {},
  lastDiscard: {
    tile: { id: "preview-last-discard", color: "yellow", number: 13 },
    playerId: previewPlayers.left.uid,
    discardedAt: 1,
  },
  winnerId: null,
  startedAt: 1,
};

export function DesignPreviewPage() {
  const navigate = useNavigate();
  const [hand, setHand] = useState<OkeyTile[]>(initialHand);
  const [game, setGame] = useState<PublicGameState>(initialGame);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  const me = { ...previewPlayers.me, tileCount: hand.length };
  const canDraw = game.turnPhase === "draw" && hand.length === 14;
  const canDiscard = game.turnPhase === "discard" && hand.length === 15 && Boolean(selectedId);

  const draw = () => {
    if (!canDraw) return;
    const drawNumber = (game.remainingTileCount % 13) + 1;
    setHand((current) => [...current, {
      id: `preview-drawn-${game.remainingTileCount}`,
      color: "yellow",
      number: drawNumber,
    }]);
    setGame((current) => ({
      ...current,
      remainingTileCount: Math.max(0, current.remainingTileCount - 1),
      turnPhase: "discard",
    }));
  };

  const takeDiscard = () => {
    if (!canDraw || !game.lastDiscard) return;
    setHand((current) => [...current, game.lastDiscard!.tile]);
    setGame((current) => ({ ...current, turnPhase: "discard", lastDiscard: null }));
  };

  const discard = () => {
    if (!canDiscard || !selectedId) return;
    const tile = hand.find((item) => item.id === selectedId);
    if (!tile) return;
    setHand((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setGame((current) => ({
      ...current,
      turnPhase: "draw",
      lastDiscard: { tile, playerId: previewPlayers.me.uid, discardedAt: Date.now() },
    }));
  };

  return (
    <>
      <GameSurface
        roomCode="PREVIEW"
        game={game}
        hand={hand}
        me={me}
        topPlayer={previewPlayers.top}
        leftPlayer={previewPlayers.left}
        rightPlayer={previewPlayers.right}
        currentPlayer={me}
        hostId={previewPlayers.top.uid}
        currentPlayerId={previewPlayers.me.uid}
        isMyTurn
        canDraw={canDraw}
        canDiscard={canDiscard}
        busy={false}
        selectedId={selectedId}
        onSelect={(tileId) => setSelectedId((current) => current === tileId ? null : tileId)}
        onExit={() => navigate("/")}
        onDraw={draw}
        onTakeDiscard={takeDiscard}
        onFinish={() => canDiscard && setShowWinner(true)}
        onDiscard={discard}
      />

      {showWinner && (
        <WinnerModal
          winner={me}
          votes={1}
          total={4}
          hasVoted={false}
          busy={false}
          onRematch={() => setShowWinner(false)}
          onLeave={() => setShowWinner(false)}
        />
      )}
    </>
  );
}
